import { mainHandle, mainOn } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { initStatistics, addDuration, getStatistics, onStatisticsUpdated } from '@main/modules/statistics'
import { sendEvent } from '../main'

export default () => {
  // 主进程加载持久化统计数据
  initStatistics()

  // 渲染进程投递「限幅后的累计秒数」
  mainOn<{ source?: string, seconds: number, immediate?: boolean }>(
    WIN_MAIN_RENDERER_EVENT_NAME.statistics_collect_time,
    ({ params: { source, seconds, immediate } }) => {
      addDuration(source, seconds, immediate)
    },
  )

  // 渲染进程拉取聚合统计（UI 展示）
  mainHandle<never, LX.Statistics.AggregatedData>(WIN_MAIN_RENDERER_EVENT_NAME.get_statistics, async() => {
    return getStatistics()
  })

  // 统计变更时推送给渲染进程
  onStatisticsUpdated((data) => {
    sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.statistics_updated, data)
  })
}
