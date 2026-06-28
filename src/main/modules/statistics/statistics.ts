// 听歌统计 主进程存储与采集中心。
//
// 与移动端 playStatistics.ts 同构：本进程持有分桶 store（持久化 + 同步的唯一真相源）。
// 桌面端的播放计时发生在渲染进程，渲染进程把「限幅后的累计秒数」通过 IPC 投递到这里累加；
// 同步层（client/modules/statistics）也在主进程，直接读写本 store，无需跨进程。
import { STORE_NAMES, DATA_KEYS } from '@common/constants'
import getStore from '@main/utils/store'
import { dateFormat } from '@common/utils/common'
import {
  type StatisticsStore,
  type DeviceStatistics,
  type StatisticsData,
  LOCAL_DEVICE_KEY,
  createEmptyDevice,
  migrate,
  mergeStore,
  rekeyDevice,
  aggregate,
  stableStringify,
} from './merge'

export type { StatisticsData, StatisticsStore } from './merge'

const PLATFORM = 'lx_music'

// 分桶存储（持久化/同步用）。本地累加只写 devices[currentDeviceKey]。
let store: StatisticsStore | null = null
// 配置同步前为 LOCAL_DEVICE_KEY；首次同步拿到 clientId 后 rekey 成 clientId。
let currentDeviceKey = LOCAL_DEVICE_KEY

// 同步推送：本地累加变更后通知同步层（节流，避免每次心跳都推服务器）
const SYNC_PUSH_THROTTLE = 60000
let syncPushListeners: Array<() => void> = []
let lastSyncPush = 0
let syncPushTimer: NodeJS.Timeout | null = null
// UI 更新监听（推送给渲染进程展示）
let updatedListeners: Array<(data: StatisticsData) => void> = []

const persist = () => {
  if (!store) return
  getStore(STORE_NAMES.DATA).set(DATA_KEYS.listeningStatistics, store)
}

const getCurrentBucket = (): DeviceStatistics => {
  const s = store!
  let bucket = s.devices[currentDeviceKey]
  if (!bucket) bucket = s.devices[currentDeviceKey] = createEmptyDevice(dateFormat(Date.now(), 'Y-M-D'), PLATFORM)
  return bucket
}

// getStore 读文件是同步的，因此可以同步惰性初始化，免去与同步层的时序依赖。
const ensureInited = (): StatisticsStore => {
  if (store) return store
  const raw = getStore(STORE_NAMES.DATA).get(DATA_KEYS.listeningStatistics)
  store = migrate(raw, currentDeviceKey, { platform: PLATFORM })

  const today = dateFormat(Date.now(), 'Y-M-D')
  const hadBucket = !!store.devices[currentDeviceKey]
  const bucket = getCurrentBucket()
  const needInitFirstUse = !bucket.firstUseDate
  if (needInitFirstUse) bucket.firstUseDate = today

  // 迁移过、首次初始化、或本设备桶新建 -> 立即落盘
  const isV2 = !!raw && (raw as { version?: number }).version == 2
  if (!isV2 || needInitFirstUse || !hadBucket) persist()
  return store
}

const emitUpdated = () => {
  const data = aggregate(ensureInited())
  for (const listener of updatedListeners) listener(data)
}

const notifySyncPush = () => {
  lastSyncPush = Date.now()
  for (const listener of syncPushListeners) listener()
}
const scheduleSyncPush = (immediate = false) => {
  if (!syncPushListeners.length) return
  if (immediate) {
    if (syncPushTimer) { clearTimeout(syncPushTimer); syncPushTimer = null }
    notifySyncPush()
    return
  }
  if (syncPushTimer) return
  const waitTime = Math.max(0, SYNC_PUSH_THROTTLE - (Date.now() - lastSyncPush))
  syncPushTimer = setTimeout(() => {
    syncPushTimer = null
    notifySyncPush()
  }, waitTime)
}

/** 初始化（加载持久化数据并通知 UI），主进程启动时调用一次 */
export const initStatistics = () => {
  ensureInited()
  emitUpdated()
}

/**
 * 渲染进程投递「限幅后的累计秒数」。
 * @param source 音源码（kg/tx/wy/...），可空
 * @param seconds 已限幅的本次累计秒数
 * @param immediate 是否立即推送同步（暂停/停止/切歌时为 true）
 */
export const addDuration = (source: string | undefined, seconds: number, immediate = false) => {
  if (!(seconds > 0)) return
  ensureInited()
  const todayStr = dateFormat(Date.now(), 'Y-M-D')
  const bucket = getCurrentBucket()
  bucket.totalDuration += seconds
  bucket.dailyStats[todayStr] = (bucket.dailyStats[todayStr] || 0) + seconds
  if (source) bucket.sourceStats[source] = (bucket.sourceStats[source] || 0) + seconds
  persist()
  emitUpdated()
  scheduleSyncPush(immediate)
}

/** UI 用：跨设备聚合后的扁平统计 */
export const getStatistics = (): StatisticsData => aggregate(ensureInited())

/** 同步用：完整分桶数据 */
export const getStatisticsStore = (): StatisticsStore => ensureInited()

/** 同步用：规范化序列化（跨端一致，供 MD5） */
export const getStatisticsSnapshot = (): string => stableStringify(ensureInited())

/** 同步用：合并远程分桶数据（幂等），落盘并通知 UI */
export const mergeRemoteStatistics = (remote: StatisticsStore | null) => {
  if (!remote) return
  store = mergeStore(ensureInited(), remote)
  persist()
  emitUpdated()
}

/**
 * 首次成功同步、拿到服务端 clientId 时调用：
 * 把本地累加的 local 桶并入 clientId 桶，之后只写 clientId 桶。
 */
export const setStatisticsDeviceKey = (clientId: string, deviceName?: string) => {
  ensureInited()
  if (!clientId || currentDeviceKey == clientId) {
    if (deviceName) {
      const bucket = getCurrentBucket()
      bucket.deviceName = deviceName
      bucket.platform = PLATFORM
      persist()
    }
    return
  }
  store = rekeyDevice(store!, currentDeviceKey, clientId)
  currentDeviceKey = clientId
  const bucket = getCurrentBucket()
  bucket.platform = PLATFORM
  if (deviceName) bucket.deviceName = deviceName
  persist()
  emitUpdated()
}

/** 同步层订阅本地统计变更，返回取消订阅函数 */
export const subscribeStatisticsSync = (listener: () => void) => {
  syncPushListeners.push(listener)
  return () => {
    syncPushListeners = syncPushListeners.filter(l => l != listener)
  }
}

/** UI 层订阅聚合结果变更（推送到渲染进程），返回取消订阅函数 */
export const onStatisticsUpdated = (listener: (data: StatisticsData) => void) => {
  updatedListeners.push(listener)
  return () => {
    updatedListeners = updatedListeners.filter(l => l != listener)
  }
}
