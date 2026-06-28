declare namespace LX {
  namespace Statistics {
    /** 单台设备的统计桶 */
    interface DeviceStatistics {
      /** = dailyStats 求和，派生字段 */
      totalDuration: number
      /** 'Y-M-D'(零填充) -> 秒，仅本设备 */
      dailyStats: Record<string, number>
      /** 音源码(kg/tx/wy/...) -> 秒，仅本设备 */
      sourceStats: Record<string, number>
      /** 本设备首次使用日期 'Y-M-D'，用于计算乐龄 */
      firstUseDate: string
      /** 平台标识，展示用，如 lx_music_mobile / lx_music */
      platform?: string
      /** 设备名，展示用 */
      deviceName?: string
    }

    /** 分桶结构（持久化 + 同步） */
    interface StatisticsData {
      version: 2
      devices: Record<string, DeviceStatistics>
    }

    /** UI 消费的扁平聚合结构（跨设备求和后的结果） */
    interface AggregatedData {
      totalDuration: number
      dailyStats: Record<string, number>
      sourceStats: Record<string, number>
      firstUseDate: string
    }
  }
}
