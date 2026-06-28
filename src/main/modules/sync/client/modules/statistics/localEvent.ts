import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { registerStatisticsActionEvent } from '@main/modules/sync/statisticsEvent'

let unregisterLocalStatisticsAction: (() => void) | null

export const registerEvent = (socket: LX.Sync.Client.Socket) => {
  unregisterEvent()
  unregisterLocalStatisticsAction = registerStatisticsActionEvent((action) => {
    if (!socket.moduleReadys?.statistics) return
    void socket.remoteQueueStatistics.onStatisticsSyncAction(action).catch(err => {
      socket.moduleReadys.statistics = false
      socket.close(SYNC_CLOSE_CODE.failed)
      console.log(err.message)
    })
  })
}

export const unregisterEvent = () => {
  unregisterLocalStatisticsAction?.()
  unregisterLocalStatisticsAction = null
}
