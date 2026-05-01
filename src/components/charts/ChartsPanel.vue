<template>
  <div class="tu-vi">
    <!-- Chart tabs · scroll anchors (decorative · click sẽ scroll xuống card) -->
    <div class="cht-tabs">
      <button
        v-for="ct in chartTabs"
        :key="ct.id"
        :class="['cht-tab', { active: activeTab === ct.id }]"
        @click="scrollToCard(ct.id)"
      >
        <component :is="ct.icon" :size="13" />
        {{ ct.label }}
      </button>
    </div>

    <!-- ─── Card 1 · Lưu Lượng (bar chart) ─────────────────────────── -->
    <div ref="flowCardRef" class="cht-card">
      <div class="cht-h">
        <div class="ti">
          <IconChart :size="14" />
          {{ $t('tuVi.flowTitle', { n: rangeDayCount }) }}
        </div>
        <div class="cht-range">
          <button
            v-for="r in ranges"
            :key="r"
            :class="{ active: rangeKey === r }"
            @click="rangeKey = r"
          >{{ r }}</button>
        </div>
      </div>
      <div class="bars">
        <div
          v-for="(b, i) in barBuckets"
          :key="i"
          class="bar-col"
        >
          <div class="bar-stack">
            <div
              v-if="b.inc > 0"
              class="bar-bg inc"
              :style="{ height: barHeight(b.inc, barMax) + '%' }"
            ></div>
            <div
              v-if="b.exp > 0"
              class="bar-bg exp"
              :style="{ height: barHeight(b.exp, barMax) + '%' }"
            ></div>
          </div>
          <div class="bar-day">{{ b.label }}</div>
        </div>
        <div v-if="!barBuckets.length" class="cht-empty">
          {{ $t('tuVi.empty') }}
        </div>
      </div>
      <div class="cht-meta">
        <span>
          {{ $t('tuVi.avgPerDay', { amt: hide.spend ? '●●●' : fCurr(avgExp) }) }}
        </span>
        <span class="cht-meta__peak" v-if="peakLabel">
          {{ $t('tuVi.peak', { label: peakLabel }) }}
        </span>
      </div>
    </div>

    <!-- ─── Card 2 · Ma Chướng (debt projection line chart) ──────── -->
    <div ref="debtCardRef" class="cht-card cht-card--stacked">
      <div class="cht-h">
        <div class="ti">
          <IconSword :size="14" />
          {{ $t('tuVi.debtTitle') }}
        </div>
      </div>
      <svg
        v-if="debtPath"
        :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
        class="debt-svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hpg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#c54a5a" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#c54a5a" stop-opacity="0" />
          </linearGradient>
        </defs>
        <!-- Filled area -->
        <path :d="debtArea" fill="url(#hpg)" />
        <!-- Stroke line -->
        <path
          :d="debtPath"
          stroke="#c54a5a"
          stroke-width="2.5"
          fill="none"
        />
        <!-- Dots -->
        <circle
          v-for="(p, i) in debtPoints"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="3"
          fill="#c4a46c"
          stroke="#06050d"
          stroke-width="1.2"
        />
        <!-- Axis labels (every other point) -->
        <text
          v-for="(p, i) in debtPoints"
          :key="'l' + i"
          v-show="i % Math.max(1, Math.ceil(debtPoints.length / 5)) === 0"
          :x="p.x"
          y="98"
          fill="#897f6a"
          font-family="JetBrains Mono"
          font-size="7"
        >{{ p.label }}</text>
      </svg>
      <div v-else class="cht-empty">{{ $t('tuVi.empty') }}</div>
      <div class="cht-meta">
        <span>
          {{ $t('tuVi.currentHp', { amt: hide.debtLine ? '●●●' : fmtShort(currentDebt) }) }}
        </span>
        <span class="cht-meta__goal">{{ $t('tuVi.targetGoal', { date: goalLabel }) }}</span>
      </div>
    </div>

    <!-- ─── Card 3 · Loại (category allocation bar list) ─────────── -->
    <div ref="catCardRef" class="cht-card cht-card--stacked">
      <div class="cht-h">
        <div class="ti">
          <IconTarget :size="14" />
          {{ $t('tuVi.catTitle') }}
        </div>
      </div>
      <div v-if="catBars.length === 0" class="cht-empty">
        {{ $t('tuVi.empty') }}
      </div>
      <div
        v-for="(c, i) in catBars"
        :key="i"
        class="cat-bar"
      >
        <div class="cat-bar__lb">{{ c.label }}</div>
        <div class="cat-bar__track">
          <div
            class="cat-bar__fill"
            :style="{ width: c.pct + '%', background: c.color }"
          ></div>
        </div>
        <div class="cat-bar__pct">{{ c.pct }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type FunctionalComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IconChart,
  IconSword,
  IconTarget,
  type IconProps,
} from '@/components/ui/quest-icons'
import { useCurrency } from '@/composables/api/useCurrency'
import { useDisplayMode } from '@/composables/ui/useDisplayMode'
import { categoryFor } from '@/composables/data/useTutienNames'
import { useCategories } from '@/composables/data/useCategories'
import type { TransactionItem } from '@/types/data'

const { t } = useI18n()
const { fCurr } = useCurrency()
const { mode: displayMode } = useDisplayMode()
const { resolveCat } = useCategories()

interface ProjectedPoint {
  month: string
  total_debt: number
}

interface DebtBreakdown {
  name: string
  val: number
  color: string
}

const props = defineProps<{
  /** Expense transactions (UI shape · `date` field). */
  expenses: TransactionItem[]
  /** Income transactions (UI shape · `date` field). */
  incomes: TransactionItem[]
  debtBreakdown: DebtBreakdown[]
  projectedDebt: ProjectedPoint[]
  hide: { spend: boolean; debtLine: boolean; pie: boolean }
}>()

// ─── Tabs · scroll anchors (decorative — all 3 cards render simultaneously) ─
type ChartTab = 'flow' | 'cat' | 'debt'
const activeTab = ref<ChartTab>('flow')

const flowCardRef = ref<HTMLElement | null>(null)
const debtCardRef = ref<HTMLElement | null>(null)
const catCardRef = ref<HTMLElement | null>(null)

function scrollToCard(id: ChartTab): void {
  activeTab.value = id
  const target = id === 'flow' ? flowCardRef.value
    : id === 'debt' ? debtCardRef.value
    : catCardRef.value
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

interface ChartTabDef {
  id: ChartTab
  icon: FunctionalComponent<IconProps>
  label: string
}

const chartTabs = computed<ChartTabDef[]>(() => [
  { id: 'flow', icon: IconChart, label: t('tuVi.tabFlow') },
  { id: 'cat', icon: IconTarget, label: t('tuVi.tabCat') },
  { id: 'debt', icon: IconSword, label: t('tuVi.tabDebt') },
])

// ─── Range selector ──────────────────────────────────────────────────────
const ranges = ['7d', '30d', '90d'] as const
type RangeKey = (typeof ranges)[number]
const rangeKey = ref<RangeKey>('7d')

const rangeDayCount = computed(() => {
  if (rangeKey.value === '7d') return 7
  if (rangeKey.value === '30d') return 30
  return 90
})

// ─── Bar buckets (exp + inc by period) ───────────────────────────────────
interface Bucket {
  label: string
  exp: number
  inc: number
}

function dateStr(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
}

function dayOfWeekLabel(d: Date): string {
  // Monday=2, Sunday=CN
  const dow = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  if (dow === 0) return 'CN'
  return 'T' + (dow + 1)
}

const barBuckets = computed<Bucket[]>(() => {
  const buckets: Bucket[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (rangeKey.value === '7d') {
    // 7 daily buckets
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const k = dateStr(d)
      const exp = props.expenses
        .filter((e) => e.date === k)
        .reduce((s, e) => s + e.amount, 0)
      const inc = props.incomes
        .filter((e) => e.date === k)
        .reduce((s, e) => s + e.amount, 0)
      buckets.push({ label: dayOfWeekLabel(d), exp, inc })
    }
  } else if (rangeKey.value === '30d') {
    // 4 weekly buckets
    for (let w = 3; w >= 0; w--) {
      const end = new Date(today)
      end.setDate(end.getDate() - w * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      const ks = dateStr(start)
      const ke = dateStr(end)
      const exp = props.expenses
        .filter((e) => e.date >= ks && e.date <= ke)
        .reduce((s, e) => s + e.amount, 0)
      const inc = props.incomes
        .filter((e) => e.date >= ks && e.date <= ke)
        .reduce((s, e) => s + e.amount, 0)
      const startDD = String(start.getDate()).padStart(2, '0')
      const startMM = String(start.getMonth() + 1).padStart(2, '0')
      buckets.push({ label: `${startDD}.${startMM}`, exp, inc })
    }
  } else {
    // 3 monthly buckets
    for (let m = 2; m >= 0; m--) {
      const dt = new Date(today.getFullYear(), today.getMonth() - m, 1)
      const ym = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0')
      const exp = props.expenses
        .filter((e) => e.date && e.date.startsWith(ym))
        .reduce((s, e) => s + e.amount, 0)
      const inc = props.incomes
        .filter((e) => e.date && e.date.startsWith(ym))
        .reduce((s, e) => s + e.amount, 0)
      buckets.push({ label: 'T' + (dt.getMonth() + 1), exp, inc })
    }
  }
  return buckets
})

const barMax = computed(() =>
  Math.max(1, ...barBuckets.value.flatMap((b) => [b.exp, b.inc])),
)

function barHeight(value: number, max: number): number {
  return Math.round((value / max) * 100)
}

const avgExp = computed(() => {
  const totalExp = barBuckets.value.reduce((s, b) => s + b.exp, 0)
  const days = rangeDayCount.value
  return days > 0 ? Math.round(totalExp / days) : 0
})

const peakLabel = computed(() => {
  if (!barBuckets.value.length) return ''
  let peak = barBuckets.value[0]
  for (const b of barBuckets.value) {
    if (b.exp > peak.exp) peak = b
  }
  return peak.exp > 0 ? peak.label : ''
})

// ─── SVG line chart for projected debt ───────────────────────────────────
const SVG_W = 280
const SVG_H = 100

interface DebtPoint {
  x: number
  y: number
  label: string
  val: number
}

/**
 * Map projected debt sang điểm SVG.
 * y cao (gần đáy) = nợ ÍT. Map maxVal → y=10 (đỉnh), minVal → y=90 (đáy).
 */
const debtPoints = computed<DebtPoint[]>(() => {
  const pts = props.projectedDebt || []
  if (pts.length === 0) return []
  const vals = pts.map((p) => p.total_debt)
  const maxVal = Math.max(...vals, 1)
  const minVal = Math.min(...vals, 0)
  const range = maxVal - minVal || 1
  const stride = pts.length === 1 ? 0 : SVG_W / (pts.length - 1)
  return pts.map((p, i) => ({
    x: i * stride,
    y: 10 + ((maxVal - p.total_debt) / range) * 80,
    label: p.month.slice(5) + '.' + p.month.slice(2, 4),
    val: p.total_debt,
  }))
})

const debtPath = computed(() => {
  const pts = debtPoints.value
  if (pts.length === 0) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y.toFixed(1)}`).join(' ')
})

const debtArea = computed(() => {
  const pts = debtPoints.value
  if (pts.length === 0) return ''
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y.toFixed(1)}`).join(' ')
  return `${line} L${pts[pts.length - 1].x},100 L${pts[0].x},100 Z`
})

const currentDebt = computed(() => {
  const pts = props.projectedDebt || []
  return pts.length > 0 ? pts[0].total_debt : 0
})

const goalLabel = computed(() => {
  const pts = props.projectedDebt || []
  if (pts.length === 0) return '—'
  const target = pts.find((p) => p.total_debt < pts[0].total_debt * 0.05)
  if (target) return target.month.slice(5) + '/' + target.month.slice(2, 4)
  const last = pts[pts.length - 1]
  return last.month.slice(5) + '/' + last.month.slice(2, 4)
})

// ─── Category allocation (last 7 days expenses) ──────────────────────────
interface CatBar {
  key: string
  label: string
  amount: number
  pct: number
  color: string
}

/** Color cycle for cat bars · 5 distinct semantic colors. */
const CAT_COLORS: Record<string, string> = {
  food: 'var(--crimson)',
  shop: 'var(--gold)',
  fuel: 'var(--violet)',
  bill: 'var(--azure)',
  ent: 'var(--vermillion)',
  med: 'var(--jade)',
  pay: 'var(--gold-2)',
  cash: 'var(--muted)',
}

const catBars = computed<CatBar[]>(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 6)
  const startStr = dateStr(start)

  // Aggregate by tu-tien sprite key (food/shop/fuel/...)
  const totals = new Map<string, number>()
  for (const e of props.expenses) {
    if (e.date < startStr) continue
    const cat = categoryFor(e.cat)
    totals.set(cat.id, (totals.get(cat.id) ?? 0) + e.amount)
  }
  const grand = [...totals.values()].reduce((s, v) => s + v, 0)
  if (grand === 0) return []

  const bars: CatBar[] = []
  for (const [key, amount] of totals) {
    const cat = categoryFor(key)
    const label = displayMode.value === 'tutien' ? cat.display : (resolveCat(key)?.label ?? cat.real)
    bars.push({
      key,
      label,
      amount,
      pct: Math.round((amount / grand) * 100),
      color: CAT_COLORS[key] ?? 'var(--muted)',
    })
  }
  bars.sort((a, b) => b.amount - a.amount)
  return bars.slice(0, 6) // max 6 rows
})

// ─── Format helpers ──────────────────────────────────────────────────────
function fmtShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return (a / 1e3).toFixed(0) + 'K'
  return String(Math.round(a))
}
</script>

<style scoped>
.tu-vi { display: flex; flex-direction: column; }

/* Stacked cards · 3 cht-card hiện cùng lúc, gap 12px như design */
.cht-card--stacked { margin-top: 12px; }

/* ─── CHT TABS · port từ design ─────────────────────────────────────────── */
.cht-tabs {
  display: flex; gap: 4px; padding: 4px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 5px;
  margin-top: 14px;
}
.cht-tab {
  flex: 1; padding: 9px;
  border: none; background: transparent;
  border-radius: 3px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 11px; color: var(--muted);
  cursor: pointer;
  letter-spacing: 0.04em;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.cht-tab.active {
  background: rgba(var(--gold-rgb), 0.15);
  color: var(--gold);
}

/* ─── CHT CARD · 3 generic chart cards ──────────────────────────────────── */
.cht-card {
  margin-top: 12px; padding: 14px;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px solid var(--line-2);
  border-radius: 6px;
  position: relative;
}
.cht-card::before {
  content: ''; position: absolute;
  top: 0; left: 14px; right: 14px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.cht-h {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.cht-h .ti {
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 13px; color: var(--gold);
  letter-spacing: 0.04em;
  display: flex; align-items: center; gap: 6px;
}

.cht-range { display: flex; gap: 3px; }
.cht-range button {
  padding: 4px 9px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 12px;
  font-family: var(--mono); font-size: 9.5px;
  color: var(--muted);
  cursor: pointer;
  letter-spacing: 0.02em;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.15s;
}
.cht-range button.active {
  background: var(--violet);
  color: var(--ink);
  border-color: var(--violet);
}

.cht-meta {
  display: flex; justify-content: space-between;
  margin-top: 12px;
  font-family: var(--mono); font-size: 10px;
  color: var(--muted);
}
.cht-meta__peak { color: var(--crimson); }
.cht-meta__goal { color: var(--jade); }

.cht-empty {
  text-align: center;
  padding: 40px 12px;
  font-family: var(--serif); font-style: italic;
  font-size: 12px; color: var(--muted);
}

/* ─── BARS · stacked exp/inc per bucket ─────────────────────────────────── */
.bars {
  display: flex; align-items: flex-end; gap: 6px;
  height: 130px; margin-top: 6px;
  position: relative;
}
.bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  gap: 6px; height: 100%;
}
.bar-stack {
  width: 100%; flex: 1;
  display: flex; flex-direction: column; justify-content: flex-end;
  gap: 2px;
}
.bar-bg {
  width: 100%;
  border-radius: 2px 2px 0 0;
  transition: height 0.6s cubic-bezier(0.5, 0.8, 0.3, 1);
}
.bar-bg.exp {
  background: linear-gradient(180deg, #d96a7a, var(--crimson) 60%, var(--crimson-deep));
  box-shadow: 0 0 6px rgba(var(--crimson-rgb), 0.4);
}
.bar-bg.inc {
  background: linear-gradient(180deg, #88dcb8, var(--jade) 60%, var(--jade-deep));
  box-shadow: 0 0 6px rgba(var(--jade-rgb), 0.4);
}
.bar-day {
  font-family: var(--mono); font-size: 9px;
  color: var(--muted);
  letter-spacing: 0.02em;
}

/* ─── DEBT SVG · projection line chart ──────────────────────────────────── */
.debt-svg {
  width: 100%; height: 120px;
}

/* ─── CAT BAR · bar list category allocation ────────────────────────────── */
.cat-bar {
  display: flex; align-items: center; gap: 10px;
  margin-top: 8px;
  font-family: var(--mono); font-size: 10px;
}
.cat-bar__lb {
  width: 80px;
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 11px; color: var(--text-2);
}
.cat-bar__track {
  flex: 1; height: 8px;
  background: var(--ink);
  border-radius: 4px;
  overflow: hidden;
}
.cat-bar__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.5, 0.8, 0.3, 1);
}
.cat-bar__pct {
  width: 32px;
  color: var(--text);
  text-align: right;
}

@media (prefers-reduced-motion: reduce) {
  .bar-bg, .cat-bar__fill { transition: none; }
}
</style>
