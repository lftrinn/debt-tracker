<template>
  <div>
    <div class="card">
      <div class="c-title">Thu / Chi 7 ngày qua</div>
      <div class="chart-wrap"><canvas ref="chartRef"></canvas></div>
    </div>
    <div class="card">
      <div class="c-title">Lộ trình giảm nợ</div>
      <div class="chart-wrap"><canvas ref="debtChartRef"></canvas></div>
    </div>
    <div class="card">
      <div class="c-title">Cơ cấu nợ hiện tại</div>
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
import { Chart, registerables } from 'chart.js'
import { useFormatters } from '../composables/useFormatters'

Chart.register(...registerables)

const { fS } = useFormatters()

const props = defineProps({
  expenses: Array,
  incomes: Array,
  debtBreakdown: Array,
  projectedDebt: Array,
  hide: Object,
})

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

function buildSpendChart() {
  if (!chartRef.value) return
  const h = props.hide?.spend
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date()
    x.setDate(x.getDate() - (6 - i))
    return x.toISOString().slice(0, 10)
  })
  const labels = days.map((x) =>
    new Date(x).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  )
  const expRaw = days.map((x) =>
    (props.expenses || []).filter((e) => e.date === x).reduce((s, e) => s + e.amount, 0)
  )
  const incRaw = days.map((x) =>
    (props.incomes || []).filter((e) => e.date === x).reduce((s, e) => s + e.amount, 0)
  )

  const maxVal = Math.max(...expRaw, ...incRaw, 1)
  const expData = h ? expRaw.map((v) => Math.round(v / maxVal * 100)) : expRaw
  const incData = h ? incRaw.map((v) => Math.round(v / maxVal * 100)) : incRaw

  if (chartInst) chartInst.destroy()
  chartInst = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Chi',
          data: expData,
          backgroundColor: 'rgba(255,107,74,.65)',
          borderColor: 'rgba(255,107,74,.9)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Thu',
          data: incData,
          backgroundColor: 'rgba(74,239,184,.55)',
          borderColor: 'rgba(74,239,184,.9)',
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
            color: '#6b6b85',
            font: { family: 'IBM Plex Mono', size: 9 },
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
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#6b6b85', font: { family: 'IBM Plex Mono', size: 9 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: {
            color: '#6b6b85',
            font: { family: 'IBM Plex Mono', size: 9 },
            callback: h
              ? (v) => v + '%'
              : (v) => (v >= 1000 ? v / 1000 + 'K' : v),
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
          borderColor: '#ff6b4a',
          backgroundColor: 'rgba(255,107,74,.1)',
          borderWidth: 2,
          pointBackgroundColor: '#ff6b4a',
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
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#6b6b85', font: { family: 'IBM Plex Mono', size: 9 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: {
            color: '#6b6b85',
            font: { family: 'IBM Plex Mono', size: 9 },
            callback: h
              ? (v) => v + '%'
              : (v) => v >= 1000000 ? (v / 1000000).toFixed(0) + 'M' : v >= 1000 ? (v / 1000) + 'K' : v,
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

onMounted(buildAll)

watch(
  () => [props.expenses, props.incomes, props.debtBreakdown, props.projectedDebt, props.hide],
  buildAll,
  { deep: true }
)

defineExpose({ buildAll })
</script>
