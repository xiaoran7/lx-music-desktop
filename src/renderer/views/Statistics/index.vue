<template>
  <div :class="$style.container">
    <div :class="$style.content">
      <div :class="$style.grid">
        <div v-for="m in metrics" :key="m.label" :class="$style.metricCard">
          <div :class="$style.metricLabel">{{ m.label }}</div>
          <div :class="$style.metricValue">{{ m.value }}</div>
        </div>
      </div>

      <div :class="$style.row">
        <div :class="$style.metricCard">
          <div :class="$style.metricLabel">{{ t('statistics__streak') }}</div>
          <div :class="$style.metricValue">{{ t('statistics__days', { days: streak }) }}</div>
        </div>
        <div :class="$style.metricCard">
          <div :class="$style.metricLabel">{{ t('statistics__age') }}</div>
          <div :class="$style.metricValue">{{ age }}</div>
        </div>
      </div>

      <div v-if="sources.length" :class="$style.section">
        <div :class="$style.sectionTitle">{{ t('statistics__source_title') }}</div>
        <div v-for="s in sources" :key="s.source" :class="$style.sourceRow">
          <div :class="$style.sourceName">{{ sourceName(s.source) }}</div>
          <div :class="$style.sourceTrack">
            <div :class="$style.sourceFill" :style="{ width: s.percent + '%' }" />
          </div>
          <div :class="$style.sourcePercent">{{ s.percent }}%</div>
        </div>
      </div>

      <div :class="$style.section">
        <div :class="$style.sectionTitle">{{ t('statistics__heatmap_title') }}</div>
        <div :class="$style.heatRow">
          <div v-for="(level, i) in heat" :key="i" :class="[$style.heatCell, $style['heat' + level]]" />
        </div>
      </div>

      <div :class="$style.tipContainer">
        <div :class="$style.tipText">{{ t('statistics__tip') }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import { dateFormat } from '@common/utils/common'
import { getStatistics, onStatisticsUpdated } from '@renderer/utils/ipc'

const DAY = 86400000

const emptyStats = (): LX.Statistics.AggregatedData => ({ totalDuration: 0, dailyStats: {}, sourceStats: {}, firstUseDate: '' })

// 本周（周一为起点）听歌时长
const sumWeek = (daily: Record<string, number>) => {
  const now = new Date()
  const offset = (now.getDay() + 6) % 7 // 0 = 周一
  let sum = 0
  for (let i = offset; i >= 0; i--) sum += daily[dateFormat(now.getTime() - i * DAY, 'Y-M-D')] || 0
  return sum
}

// 本月（自然月）听歌时长
const sumMonth = (daily: Record<string, number>) => {
  const prefix = dateFormat(Date.now(), 'Y-M')
  let sum = 0
  for (const key in daily) if (key.startsWith(prefix)) sum += daily[key]
  return sum
}

// 连续听歌天数（今天还没听则从昨天起算）
const computeStreak = (daily: Record<string, number>) => {
  let streak = 0
  let cursor = Date.now()
  if (!daily[dateFormat(cursor, 'Y-M-D')]) cursor -= DAY
  while (daily[dateFormat(cursor, 'Y-M-D')] > 0) {
    streak++
    cursor -= DAY
  }
  return streak
}

// 近 14 天听歌强度（0=无，1~3 由浅至深）
const recentHeat = (daily: Record<string, number>) => {
  const vals: number[] = []
  const now = Date.now()
  for (let i = 13; i >= 0; i--) vals.push(daily[dateFormat(now - i * DAY, 'Y-M-D')] || 0)
  const max = Math.max(...vals, 1)
  return vals.map(v => {
    if (v <= 0) return 0
    const r = v / max
    if (r <= 1 / 3) return 1
    if (r <= 2 / 3) return 2
    return 3
  })
}

// 各音源占比（降序）
const computeSources = (sourceStats: Record<string, number>) => {
  const entries = Object.entries(sourceStats).filter(([, v]) => v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (!total) return []
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([source, v]) => ({ source, percent: Math.round((v / total) * 100) }))
}

export default {
  name: 'Statistics',
  setup() {
    const t = useI18n()
    const stats = ref<LX.Statistics.AggregatedData>(emptyStats())

    const formatDuration = (seconds: number) => {
      if (seconds < 60) return t('statistics__duration_seconds', { seconds })
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      if (mins < 60) return t('statistics__duration_minutes', { minutes: mins, seconds: secs })
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return t('statistics__duration_hours', { hours, minutes: remainingMins })
    }

    // 乐龄文案
    const formatAge = (firstUseDate: string) => {
      if (!firstUseDate) return t('statistics__days', { days: 0 })
      const [y, m, d] = firstUseDate.split('-').map(Number)
      const now = new Date()
      let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
      if (now.getDate() < d) months -= 1
      if (months < 1) {
        const days = Math.max(0, Math.floor((Date.now() - new Date(y, m - 1, d).getTime()) / DAY))
        return t('statistics__days', { days })
      }
      const years = Math.floor(months / 12)
      const remMonths = months % 12
      return years > 0
        ? t('statistics__age_ym', { years, months: remMonths })
        : t('statistics__age_months', { months: remMonths })
    }

    const sourceName = (source: string) => {
      const name = t('source_alias_' + source)
      return name && name != 'source_alias_' + source ? name : source
    }

    const daily = computed(() => stats.value.dailyStats || {})
    const metrics = computed(() => [
      { label: t('statistics__today'), value: formatDuration(daily.value[dateFormat(Date.now(), 'Y-M-D')] || 0) },
      { label: t('statistics__week'), value: formatDuration(sumWeek(daily.value)) },
      { label: t('statistics__month'), value: formatDuration(sumMonth(daily.value)) },
      { label: t('statistics__total'), value: formatDuration(stats.value.totalDuration || 0) },
    ])
    const streak = computed(() => computeStreak(daily.value))
    const age = computed(() => formatAge(stats.value.firstUseDate))
    const heat = computed(() => recentHeat(daily.value))
    const sources = computed(() => computeSources(stats.value.sourceStats || {}))

    let removeListener: (() => void) | null = null
    onMounted(() => {
      void getStatistics().then(data => {
        if (data) stats.value = data
      })
      removeListener = onStatisticsUpdated(({ params: data }) => {
        if (data) stats.value = data
      })
    })
    onBeforeUnmount(() => {
      removeListener?.()
      removeListener = null
    })

    return {
      t,
      metrics,
      streak,
      age,
      heat,
      sources,
      sourceName,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  height: 100%;
  overflow-y: auto;
  background-color: var(--color-content-background);
}
.content {
  padding: 15px;
}
.grid {
  display: flex;
  flex-flow: row wrap;
  gap: 10px;
  margin-bottom: 10px;
}
.row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.metricCard {
  flex: 1 1 46%;
  min-width: 0;
  border-radius: 8px;
  padding: 16px;
  background-color: var(--color-primary-light-900-alpha-200);
}
.metricLabel {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--color-font-label);
}
.metricValue {
  font-size: 20px;
  font-weight: bold;
  color: var(--color-primary-font);
}
.section {
  margin-top: 8px;
  margin-bottom: 10px;
}
.sectionTitle {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--color-font-label);
}
.sourceRow {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.sourceName {
  width: 70px;
  font-size: 13px;
  color: var(--color-font);
  .mixin-ellipsis-1();
}
.sourceTrack {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin: 0 10px;
  background-color: var(--color-primary-light-900-alpha-200);
}
.sourceFill {
  height: 100%;
  border-radius: 4px;
  background-color: var(--color-primary);
  transition: width @transition-normal;
}
.sourcePercent {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--color-font-label);
}
.heatRow {
  display: flex;
  gap: 4px;
}
.heatCell {
  flex: 1;
  aspect-ratio: 1;
  border-radius: 3px;
}
.heat0 {
  background-color: var(--color-primary-light-900-alpha-200);
}
.heat1 {
  background-color: var(--color-primary-alpha-700);
}
.heat2 {
  background-color: var(--color-primary-alpha-500);
}
.heat3 {
  background-color: var(--color-primary);
}
.tipContainer {
  margin-top: 10px;
  padding: 0 5px;
}
.tipText {
  font-size: 12px;
  line-height: 18px;
  color: var(--color-font-label);
}
</style>
