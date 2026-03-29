<template>
  <div class="card">
    <!-- Chart type tabs -->
    <div class="chart-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['chart-tab-btn', { active: activeTab === t.key }]"
        @click="activeTab = t.key"
      >
        <Icon :name="t.icon" :size="12" />
        {{ t.label }}
      </button>
    </div>

    <!-- Thu/Chi -->
    <div v-show="activeTab === 'spend'">
      <div class="range-tabs">
        <button
          v-for="r in ranges"
          :key="r.key"
          :class="['range-tab-btn', { active: spendRange === r.key }]"
          @click="spendRange = r.key"
        >{{ r.label }}</button>
      </div>
      <div class="chart-wrap"><canvas ref="chartRef"></canvas></div>
    </div>

    <!-- Lộ trình giảm nợ -->
    <div v-show="activeTab === 'debt'">
      <div class="chart-wrap"><canvas ref="debtChartRef"></canvas></div>
    </div>

    <!-- Cơ cấu nợ -->
    <div v-show="activeTab === 'pie'">
      <div class="pie-wrap"><canvas ref="pieChartRef"></canvas></div>
      <div class="legend">
        <div class="legend-item" v-for="s in debtBreakdown" :key="s.name">
          <div class="legend-dot" :style="{ background: s.color }"></div>
          <span class="legend-name">{{ s.name }}</span>
          <span class="legend-val">
            <template v-if="hide.pie">{{ pct(s.val) }}%</template>
            <template v-else>₫{{ fS(s.val) }}</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Chart, registerables } from 'chart.js'
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'
import { useColors } from '../composables/useColors'

Chart.register(...registerables)

const { fS } = useFormatters()
const { colors, rgba, chartGrid, chartTick, chartFont } = useColors()
const { t, locale } = useI18n()

const props = defineProps({
  expenses: Array,
  incomes: Array,
  debtBreakdown: Array,
  projectedDebt: Array,
  hide: Object,
})

const tabs = computed(() => [
  { key: 'spend', label: t('charts.tabs.spend'), icon: 'bar-chart-2' },
  { key: 'debt', label: t('charts.tabs.debt'), icon: 'trending-down' },
  { key: 'pie', label: t('charts.tabs.pie'), icon: 'pie-chart' },
])

const activeTab = ref('spend')
const spendRange = ref('week')

const ranges = computed(() => [
  { key: 'week', label: t('charts.ranges.week') },
  { key: 'month', label: t('charts.ranges.month') },
  { key: 'year', label: t('charts.ranges.year') },
])

const chartRef = ref(null)
const debtChartRef = ref(null)
const pieChartRef = ref(null)
let chartInst = null
let debtChartInst = null
let pieChartInst = null

const totalDebtVal = computed(() => (props.debtBreakdown || []).reduce((s, b) => s + b.val, 0))

function pct(val) {
  const t = totalDebtVal.value
  return t > 0 ? Math.round(val / t * 100) : 0
}

function fmtTick(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(v % 1e9 === 0 ? 0 : 1) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1) + 'M'
  if (v >= 1e3) return Math.round(v / 1e3) + 'K'
  return String(v)
}

function getSpendBuckets() {
  const range = spendRange.value
  if (range === 'week') {
    // 7 ngày gần đây
    const keys = Array.from({ length: 7 }, (_, i) => {
      const x = new Date(); x.setDate(x.getDate() - (6 - i))
      return x.toISOString().slice(0, 10)
    })
    const labels = keys.map((x) =>
      new Date(x).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    )
    return { keys, labels, matchExp: (e, k) => e.date === k, matchInc: (e, k) => e.date === k }
  }
  if (range === 'month') {
    // 30 ngày gần đây, nhóm theo tuần (mỗi tuần = 1 cột)
    const now = new Date()
    const keys = [] // array of { start, end, label }
    for (let w = 3; w >= 0; w--) {
      const end = new Date(now)
      end.setDate(end.getDate() - w * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      keys.push({
        s: start.toISOString().slice(0, 10),
        e: end.toISOString().slice(0, 10),
      })
    }
    const labels = keys.map((k) => {
      const s = new Date(k.s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      const e = new Date(k.e).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      return s + '–' + e
    })
    return {
      keys,
      labels,
      matchExp: (e, k) => e.date >= k.s && e.date <= k.e,
      matchInc: (e, k) => e.date >= k.s && e.date <= k.e,
    }
  }
  // year: 12 tháng gần đây, nhóm theo tháng
  const now = new Date()
  const keys = []
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'))
  }
  const labels = keys.map((k) => {
    const [y, m] = k.split('-')
    return 'T' + parseInt(m) + '/' + y.slice(2)
  })
  return {
    keys,
    labels,
    matchExp: (e, k) => e.date && e.date.slice(0, 7) === k,
    matchInc: (e, k) => e.date && e.date.slice(0, 7) === k,
  }
}

function buildSpendChart() {
  if (!chartRef.value) return
  const h = props.hide?.spend
  const { keys, labels, matchExp, matchInc } = getSpendBuckets()

  const expRaw = keys.map((k) =>
    (props.expenses || []).filter((e) => matchExp(e, k)).reduce((s, e) => s + e.amount, 0)
  )
  const incRaw = keys.map((k) =>
    (props.incomes || []).filter((e) => matchInc(e, k)).reduce((s, e) => s + e.amount, 0)
  )

  const maxVal = Math.max(...expRaw, ...incRaw, 1)
  const expData = h ? expRaw.map((v) => Math.round(v / maxVal * 100)) : expRaw
  const incData = h ? incRaw.map((v) => Math.round(v / maxVal * 100)) : incRaw

  const yTickCb = h
    ? (v) => v + '%'
    : (v) => fmtTick(v)

  if (chartInst) chartInst.destroy()
  chartInst = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: t('charts.datasets.expense'),
          data: expData,
          backgroundColor: rgba('accent2', .65),
          borderColor: rgba('accent2', .9),
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: t('charts.datasets.income'),
          data: incData,
          backgroundColor: rgba('accent3', .55),
          borderColor: rgba('accent3', .9),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: chartTick,
            font: chartFont,
            boxWidth: 10,
            padding: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => h
              ? ctx.dataset.label + ': ' + ctx.parsed.y + '%'
              : ctx.dataset.label + ': ' + ctx.parsed.y.toLocaleString('vi-VN') + 'đ',
          },
        },
      },
      scales: {
        x: {
          grid: { color: chartGrid },
          ticks: {
            color: chartTick,
            font: { ...chartFont, size: spendRange.value === 'month' ? 8 : chartFont.size },
            maxRotation: spendRange.value === 'year' ? 45 : 0,
          },
        },
        y: {
          grid: { color: chartGrid },
          ticks: {
            color: chartTick,
            font: chartFont,
            callback: yTickCb,
          },
          ...(h ? { max: 100, min: 0 } : {}),
        },
      },
    },
  })
}

function buildDebtChart() {
  if (!debtChartRef.value) return
  const h = props.hide?.debtLine
  const pts = props.projectedDebt || []
  if (!pts.length) return
  const labels = pts.map((p) => p.month.slice(5) + '/' + p.month.slice(2, 4))
  const rawData = pts.map((p) => p.total_debt)

  const baseVal = Math.max(...rawData, 1)
  const data = h ? rawData.map((v) => Math.round(v / baseVal * 100)) : rawData

  if (debtChartInst) debtChartInst.destroy()
  debtChartInst = new Chart(debtChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: colors.accent2,
          backgroundColor: rgba('accent2', .1),
          borderWidth: 2,
          pointBackgroundColor: colors.accent2,
          pointRadius: 3,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => h
              ? ctx.parsed.y + '%'
              : ctx.parsed.y.toLocaleString('vi-VN') + 'đ',
          },
        },
      },
      scales: {
        x: {
          grid: { color: chartGrid },
          ticks: { color: chartTick, font: chartFont },
        },
        y: {
          grid: { color: chartGrid },
          ticks: {
            color: chartTick,
            font: chartFont,
            callback: h ? (v) => v + '%' : (v) => fmtTick(v),
          },
          ...(h ? { max: 100, min: 0 } : {}),
        },
      },
    },
  })
}

function buildPieChart() {
  if (!pieChartRef.value) return
  const h = props.hide?.pie
  const bd = props.debtBreakdown || []
  if (!bd.length) return
  if (pieChartInst) pieChartInst.destroy()
  pieChartInst = new Chart(pieChartRef.value, {
    type: 'doughnut',
    data: {
      labels: bd.map((b) => b.name),
      datasets: [
        {
          data: bd.map((b) => b.val),
          backgroundColor: bd.map((b) => b.color),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = (props.debtBreakdown || []).reduce((s, b) => s + b.val, 0)
              const p = total > 0 ? Math.round(ctx.parsed / total * 100) : 0
              return h
                ? ctx.label + ': ' + p + '%'
                : ctx.label + ': ₫' + ctx.parsed.toLocaleString('vi-VN') + ' (' + p + '%)'
            },
          },
        },
      },
      cutout: '62%',
    },
  })
}

function buildAll() {
  buildSpendChart()
  buildDebtChart()
  buildPieChart()
}

// Build current tab chart when tab changes
watch(activeTab, (tab) => {
  setTimeout(() => {
    if (tab === 'spend') buildSpendChart()
    else if (tab === 'debt') buildDebtChart()
    else if (tab === 'pie') buildPieChart()
  }, 50)
})

// Rebuild spend chart when range changes
watch(spendRange, () => {
  if (activeTab.value === 'spend') {
    setTimeout(buildSpendChart, 50)
  }
})

onMounted(buildAll)

watch(
  () => [props.expenses, props.incomes, props.debtBreakdown, props.projectedDebt, props.hide],
  buildAll,
  { deep: true }
)

watch(locale, () => setTimeout(buildAll, 50))

defineExpose({ buildAll })
</script>
