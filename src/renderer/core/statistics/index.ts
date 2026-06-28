// 听歌统计 渲染进程采集器。
//
// 与移动端 playStatistics.ts 的计时逻辑同构：渲染进程掌握播放事件与进度（maxPlayTime / 音源），
// 在这里完成「会话计时 + 防刷限幅」，再把限幅后的累计秒数通过 IPC 投递到主进程累加。
// 主进程持有 store、负责持久化与同步。
import { isPlay, playMusicInfo } from '@renderer/store/player/state'
import { playProgress } from '@renderer/store/player/playProgress'
import { collectStatisticsTime } from '@renderer/utils/ipc'

let sessionStartTime: number | null = null
// 当前计时会话对应的音源，结算时按它归属，避免切歌后把上一首时长记到新歌的音源
let sessionSource: string | undefined
let periodicTimer: ReturnType<typeof setInterval> | null = null

// 在线歌曲 source 在顶层，下载列表项在 metadata.musicInfo 下
const getCurrentSource = (): string | undefined => {
  const music = playMusicInfo.musicInfo
  return music
    ? 'source' in music ? music.source : music.metadata.musicInfo.source
    : undefined
}

const accumulate = (isStillPlaying: boolean) => {
  if (sessionStartTime == null) return
  const now = Date.now()
  let elapsed = Math.floor((now - sessionStartTime) / 1000)

  if (elapsed <= 0) {
    // 处理用户往回调整系统时钟的情况
    sessionStartTime = isStillPlaying ? now : null
    return
  }

  // 边际限制与防刷策略：
  // 1. 定期累加心跳限幅（上限限制为 30 秒）
  if (isStillPlaying && elapsed > 30) {
    elapsed = 10 // 重置为心跳周期
  }

  // 2. 切歌/暂停等累计限幅（上限不能超过单首歌曲时长 + 30 秒，未获取到时长则默认限幅 3600 秒）
  const maxPlayTime = playProgress.maxPlayTime || 3600
  if (elapsed > maxPlayTime + 30) {
    elapsed = Math.floor(maxPlayTime)
  }

  if (elapsed > 0) {
    // 播放中心跳节流推送；暂停/停止（!isStillPlaying）时立即推送以尽快落到服务端
    collectStatisticsTime({ source: sessionSource, seconds: elapsed, immediate: !isStillPlaying })
  }

  sessionStartTime = isStillPlaying ? now : null
}

const startPeriodicTimer = () => {
  stopPeriodicTimer()
  periodicTimer = setInterval(() => {
    accumulate(true)
  }, 10000)
}

const stopPeriodicTimer = () => {
  if (periodicTimer) {
    clearInterval(periodicTimer)
    periodicTimer = null
  }
}

const handlePlay = () => {
  sessionStartTime = Date.now()
  sessionSource = getCurrentSource()
  startPeriodicTimer()
}

const handlePause = () => {
  accumulate(false)
  stopPeriodicTimer()
}

const handleMusicToggled = () => {
  // 先用上一首的 sessionSource 结算，再切换到新歌的音源
  if (sessionStartTime != null) {
    accumulate(isPlay.value)
  }
  if (isPlay.value) {
    sessionStartTime = Date.now()
    sessionSource = getCurrentSource()
    startPeriodicTimer()
  } else {
    stopPeriodicTimer()
  }
}

export default () => {
  window.app_event.on('play', handlePlay)
  window.app_event.on('pause', handlePause)
  window.app_event.on('stop', handlePause)
  window.app_event.on('error', handlePause)
  window.app_event.on('musicToggled', handleMusicToggled)
}
