<template>
  <div class="card">
    <!-- Header -->
    <div class="c-hdr" style="margin-bottom:8px">
      <span class="c-title">
        {{ $t('transactions.title') }}
        <span class="trend-ico" :class="monthTrend" :style="monthTrend === 'up' ? { color: amountColor(monthIncome, 'income') } : monthTrend === 'down' ? { color: amountColor(monthExpense, 'expense') } : {}">
          <Icon v-if="monthTrend === 'up'" name="trending-up" :size="12" />
          <Icon v-else-if="monthTrend === 'down'" name="trending-down" :size="12" />
          <Icon v-else name="minus" :size="12" />
        </span>
      </span>
      <div class="tx-hdr-right">
        <span class="badge">{{ transactions.length }}</span>
        <button
          class="tx-filter-toggle"
          :class="{ 'tx-filter-toggle--active': showFilter }"
          @click="showFilter = !showFilter"
          :title="$t('transactions.toggleFilter')"
        ><Icon name="sliders-horizontal" :size="12" /></button>
      </div>
    </div>
    <div v-if="monthTrend !== 'neutral'" class="tx-list__trend">
      <template v-if="hide">{{ $t('transactions.incShort') }} +••••• · {{ $t('transactions.expShort') }} -•••••</template>
      <template v-else-if="monthTrend === 'up'">{{ $t('transactions.incShort') }} +{{ fCurr(monthIncome) }} · {{ $t('transactions.expShort') }} -{{ fCurr(monthExpense) }}</template>
      <template v-else>{{ $t('transactions.expShort') }} -{{ fCurr(monthExpense) }} · {{ $t('transactions.incShort') }} +{{ fCurr(monthIncome) }}</template>
    </div>

    <!-- Filter bar (collapsible) -->
    <div class="tx-filter-wrap" :class="{ 'tx-filter-wrap--open': showFilter }">
      <div class="tx-filter">
        <div class="tx-filter__type-row">
          <div class="tx-filter__toggle">
            <button
              :class="['tx-filter__toggle-btn', filterType === 'exp' ? 'tx-filter__toggle-btn--active' : '']"
              @click="setType('exp')"
            >{{ $t('transactions.filterExp') }}</button>
            <button
              :class="['tx-filter__toggle-btn', filterType === 'inc' ? 'tx-filter__toggle-btn--active' : '']"
              @click="setType('inc')"
            >{{ $t('transactions.filterInc') }}</button>
          </div>
          <select class="tx-filter__cat-select" v-model="filterCat">
            <option value="">{{ $t('transactions.allCats') }}</option>
            <option v-for="c in activeCats" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </div>
        <div class="tx-filter__search-wrap">
          <Icon name="search" :size="11" class="tx-filter__search-ico" />
          <input
            class="tx-filter__search"
            v-model="searchRaw"
            :placeholder="$t('transactions.search')"
            type="search"
            autocomplete="off"
          />
          <button v-if="searchRaw" class="tx-filter__search-clear" @click="clearSearch">
            <Icon name="x" :size="10" />
          </button>
        </div>
      </div>
    </div>

    <!-- Quick stats -->
    <div v-if="thisMonthExp > 0" class="tx-stats">
      <span class="tx-stats__label">{{ $t('transactions.statsThisMonth') }}:</span>
      <span class="tx-stats__num">{{ hide ? '•••••' : fCurr(thisMonthExp) }}</span>
      <template v-if="changePercent !== null">
        <span :class="['tx-stats__chg', changePercent >= 0 ? 'tx-stats__chg--up' : 'tx-stats__chg--dn']">
          {{ changePercent >= 0 ? '↑' : '↓' }}{{ Math.abs(changePercent) }}%
        </span>
      </template>
      <span class="tx-stats__sep">·</span>
      <span class="tx-stats__label">{{ $t('transactions.statsAvg') }}:</span>
      <span class="tx-stats__num">{{ hide ? '•••••' : fCurr(avgPerDay) }}</span>
      <template v-if="topCatThisMonth">
        <span class="tx-stats__sep">·</span>
        <Icon :name="topCatThisMonth.cat.icon" :size="9" class="tx-stats__top-ico" />
        <span class="tx-stats__label">{{ topCatThisMonth.cat.label }}</span>
        <span class="tx-stats__num">{{ hide ? '•••••' : fCurr(topCatThisMonth.amount) }}</span>
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="!filteredItems.length" class="tx-list__empty">{{ $t('transactions.empty') }}</div>

    <!-- Sticky day header + fixed-height scrollable list -->
    <div v-else class="tx-list__wrap">
      <!-- Sticky header: stays in place, updates as user scrolls -->
      <div class="tx-list__sticky-hdr">
        <span class="tx-list__day-label">
          {{ activeHeader.label }}
          <span
            v-if="activeHeader.totalInc > activeHeader.totalExp"
            class="tx-list__day-trend tx-list__day-trend--up"
          ><Icon name="trending-up" :size="10" /></span>
          <span
            v-else-if="activeHeader.totalExp > activeHeader.totalInc"
            class="tx-list__day-trend tx-list__day-trend--down"
          ><Icon name="trending-down" :size="10" /></span>
        </span>
        <span class="tx-list__day-meta">
          <span v-if="activeHeader.totalInc > 0" class="tx-list__day-inc">{{ hide ? '+•••••' : '+' + fCurr(activeHeader.totalInc) }}</span>
          <span v-if="activeHeader.totalExp > 0" class="tx-list__day-exp">{{ hide ? '-•••••' : '-' + fCurr(activeHeader.totalExp) }}</span>
        </span>
      </div>
      <!-- Scrollable area: fixed height ≈ 4 items -->
      <div class="tx-list__scroll" ref="scrollEl" @scroll="onListScroll">
        <div
          v-for="tx in filteredItems"
          :key="tx.id"
          class="tx-list__item"
          :class="tx.type === 'inc' ? 'tx-list__item--inc' : 'tx-list__item--exp'"
          :data-date="tx.date"
          @click="emit('open-detail', tx)"
        >
          <div class="tx-list__item-date" :class="tx.type === 'inc' ? 'tx-list__item-date--inc' : 'tx-list__item-date--exp'">
            <span class="tx-list__item-date-day">{{ tx.date.split('-')[2] }}</span>
            <span class="tx-list__item-date-mon">/{{ parseInt(tx.date.split('-')[1], 10) }}</span>
          </div>
          <div class="tx-list__item-info">
            <div class="tx-list__item-name">{{ getLocalized(tx, 'desc', locale) }}</div>
            <div class="tx-list__item-meta">
              <Icon :name="resolveCat(tx.cat).icon" :size="11" class="tx-list__item-cat-ico" />
              <span class="tx-list__item-meta-sep">·</span>
              <span>{{ resolveCat(tx.cat).label }}</span>
              <template v-if="tx.payMethod && tx.payMethod !== 'cash'"><span class="tx-list__item-meta-sep">·</span>💳</template>
              <template v-if="tx.time"><span class="tx-list__item-meta-sep">·</span><span class="tx-list__item-time">{{ tx.time }}</span></template>
            </div>
          </div>
          <div class="tx-list__item-amt" :style="{ color: amountColor(txVndAmt(tx), tx.type === 'inc' ? 'income' : 'expense') }">
            <template v-if="hide"><span class="masked">•••••</span></template>
            <template v-else>
              <template v-if="tx.currency && tx.currency !== displayCurrency">
                <span>{{ tx.type === 'inc' ? '+' : '-' }}{{ fCurrFor(tx.amount, tx.currency as Currency) }}</span>
                <span class="tx-list__item-equiv">{{ fCurrNative(tx.amount, tx.currency as Currency) }}</span>
              </template>
              <template v-else>{{ tx.type === 'inc' ? '+' : '-' }}{{ fCurr(tx.amount) }}</template>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCategories } from '../../composables/data/useCategories'
import { useCurrency, type Currency } from '../../composables/api/useCurrency'
import { useAmountColor } from '../../composables/ui/useAmountColor'
import { getLocalized } from '../../composables/data/useI18nData'
import type { TransactionItem } from '../../types/data'

const { locale, t } = useI18n()
const { fDate, tStr } = useFormatters()
const { resolveCat, expenseCategories, incomeCategories } = useCategories()
const { fCurr, fCurrNative, fCurrFor, displayCurrency, toVnd } = useCurrency()
const { amountColor } = useAmountColor()

function txVndAmt(tx: TransactionItem): number {
  if (tx.currency && tx.currency !== 'VND') return toVnd(tx.amount, tx.currency as Currency)
  return tx.amount
}

const props = defineProps<{
  transactions: TransactionItem[]
  hide: boolean
}>()

const emit = defineEmits<{
  'open-detail': [tx: TransactionItem]
  'delete-tx': [tx: TransactionItem]
  'quick-add': [tx: TransactionItem]
}>()

// ─── Filter toggle ─────────────────────────────────────────────────────────────
const showFilter = ref(false)

// ─── Filter state ─────────────────────────────────────────────────────────────

const filterType = ref<'exp' | 'inc'>('exp')
const filterCat = ref('')

const activeCats = computed(() =>
  filterType.value === 'exp' ? expenseCategories.value : incomeCategories.value
)

function setType(val: 'exp' | 'inc') {
  filterType.value = val
  filterCat.value = ''
}

// ─── Search ───────────────────────────────────────────────────────────────────

const searchRaw = ref('')
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchRaw, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { searchQuery.value = v }, 200)
})

function clearSearch() {
  clearTimeout(searchTimer)
  searchRaw.value = ''
  searchQuery.value = ''
}

// ─── Computed filtering ───────────────────────────────────────────────────────

const typeFiltered = computed(() =>
  props.transactions.filter(tx => tx.type === filterType.value)
)

const filteredItems = computed(() => {
  let items = filterCat.value
    ? typeFiltered.value.filter(tx => tx.cat === filterCat.value)
    : typeFiltered.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(tx => {
      const locName = getLocalized(tx, 'desc', locale.value).toLowerCase()
      const rawName = tx.desc.toLowerCase()
      const note = tx.note?.toLowerCase() ?? ''
      return locName.includes(q) || rawName.includes(q) || note.includes(q)
    })
  }
  return items
})

// ─── Monthly trend (header) ───────────────────────────────────────────────────

const currentMonthPrefix = computed(() => tStr().slice(0, 7))

const monthIncome = computed(() =>
  props.transactions
    .filter(tx => tx.type === 'inc' && tx.date.startsWith(currentMonthPrefix.value))
    .reduce((s, tx) => s + tx.amount, 0)
)

const monthExpense = computed(() =>
  props.transactions
    .filter(tx => tx.type === 'exp' && tx.date.startsWith(currentMonthPrefix.value))
    .reduce((s, tx) => s + tx.amount, 0)
)

const monthTrend = computed(() => {
  if (monthIncome.value > monthExpense.value) return 'up'
  if (monthExpense.value > monthIncome.value) return 'down'
  return 'neutral'
})

// ─── Quick stats (based on ALL transactions, not filtered) ────────────────────

const lastMonthPrefix = computed(() => {
  const [y, m] = currentMonthPrefix.value.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
})

const thisMonthExp = computed(() =>
  props.transactions
    .filter(tx => tx.type === 'exp' && tx.date.startsWith(currentMonthPrefix.value))
    .reduce((s, tx) => s + tx.amount, 0)
)

const lastMonthExp = computed(() =>
  props.transactions
    .filter(tx => tx.type === 'exp' && tx.date.startsWith(lastMonthPrefix.value))
    .reduce((s, tx) => s + tx.amount, 0)
)

const changePercent = computed<number | null>(() => {
  if (lastMonthExp.value === 0) return null
  return Math.round((thisMonthExp.value - lastMonthExp.value) / lastMonthExp.value * 100)
})

const daysElapsed = computed(() => parseInt(tStr().split('-')[2], 10))

const avgPerDay = computed(() =>
  daysElapsed.value > 0 ? Math.round(thisMonthExp.value / daysElapsed.value) : 0
)

const topCatThisMonth = computed(() => {
  const catTotals = new Map<string, number>()
  for (const tx of props.transactions) {
    if (tx.type === 'exp' && tx.date.startsWith(currentMonthPrefix.value)) {
      catTotals.set(tx.cat, (catTotals.get(tx.cat) || 0) + tx.amount)
    }
  }
  if (!catTotals.size) return null
  let topKey = '', topAmt = 0
  for (const [k, v] of catTotals) {
    if (v > topAmt) { topAmt = v; topKey = k }
  }
  return { cat: resolveCat(topKey), amount: topAmt }
})

// ─── Sticky day header ────────────────────────────────────────────────────────

const scrollEl = ref<HTMLElement | null>(null)
const activeHeaderDate = ref('')

const yesterdayStr = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
})

// Per-day totals derived from the currently filtered list
const dayTotals = computed(() => {
  const map = new Map<string, { totalExp: number; totalInc: number }>()
  for (const tx of filteredItems.value) {
    if (!map.has(tx.date)) map.set(tx.date, { totalExp: 0, totalInc: 0 })
    const day = map.get(tx.date)!
    if (tx.type === 'exp') day.totalExp += tx.amount
    else day.totalInc += tx.amount
  }
  return map
})

const activeHeader = computed(() => {
  const date = activeHeaderDate.value
  const today = tStr()
  const label = !date
    ? ''
    : date === today
      ? t('transactions.today')
      : date === yesterdayStr.value
        ? t('transactions.yesterday')
        : fDate(date, locale.value)
  const totals = dayTotals.value.get(date) ?? { totalExp: 0, totalInc: 0 }
  return { label, ...totals }
})

// When filter/search changes: reset header to first item and scroll to top
watch(filteredItems, async (items) => {
  activeHeaderDate.value = items[0]?.date || ''
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = 0
}, { immediate: true })

function onListScroll() {
  const el = scrollEl.value
  if (!el) return
  const scrollTop = el.scrollTop
  const items = el.querySelectorAll<HTMLElement>('.tx-list__item[data-date]')
  for (const item of items) {
    if (item.offsetTop + item.offsetHeight > scrollTop) {
      const d = item.dataset.date
      if (d) activeHeaderDate.value = d
      return
    }
  }
}
</script>

<style scoped>
/* Trend */
.tx-list__trend { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-bottom: 8px; padding: 0 2px; }

/* ─── Header right: badge + filter toggle ─────────────────────────────────── */
.tx-hdr-right { display: flex; align-items: center; gap: 6px; }

.tx-filter-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  background: transparent; border: 1px solid var(--border); border-radius: 7px;
  color: var(--muted); cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background .12s, border-color .12s, color .12s;
  flex-shrink: 0;
}
.tx-filter-toggle:active { background: var(--border); }
.tx-filter-toggle--active { background: var(--surface2); border-color: var(--accent); color: var(--accent); }
:deep(.tx-filter-toggle svg) { display: block; }

/* ─── Collapsible filter wrapper ──────────────────────────────────────────── */
.tx-filter-wrap {
  max-height: 0;
  overflow: hidden;
  transition: max-height .3s cubic-bezier(.4,0,.2,1);
}
.tx-filter-wrap--open { max-height: 220px; }

/* ─── Filter bar ──────────────────────────────────────────────────────────── */
.tx-filter { margin: 8px 0 6px; display: flex; flex-direction: column; gap: 6px; }

/* Toggle buttons (Chi tiêu / Thu nhập) + Category select — cùng 1 dòng */
.tx-filter__type-row { display: flex; align-items: center; gap: 6px; }
.tx-filter__toggle { display: flex; background: var(--surface2); border-radius: 7px; padding: 2px; flex-shrink: 0; }
.tx-filter__toggle-btn {
  padding: 4px 10px;
  font-family: var(--mono); font-size: 10px;
  border: none; border-radius: 6px;
  background: transparent; color: var(--muted);
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background .12s, color .12s;
}
.tx-filter__toggle-btn--active { background: var(--bg); color: var(--text); }
.tx-filter__toggle-btn:active { opacity: .7; }
.tx-filter__cat-select {
  flex: 1; min-width: 0;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 7px;
  padding: 4px 8px; font-family: var(--mono); font-size: 10px; color: var(--text);
  outline: none; cursor: pointer; height: 30px; box-sizing: border-box;
}

/* Search */
.tx-filter__search-wrap { position: relative; display: flex; align-items: center; }
.tx-filter__search-ico { position: absolute; left: 8px; color: var(--muted); flex-shrink: 0; pointer-events: none; }
:deep(.tx-filter__search-ico svg) { display: block; }
.tx-filter__search {
  width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 7px;
  padding: 5px 28px 5px 26px; font-family: var(--mono); font-size: 10px; color: var(--text);
  outline: none; box-sizing: border-box; -webkit-appearance: none; appearance: none;
}
.tx-filter__search:focus { border-color: var(--accent); }
.tx-filter__search::placeholder { color: var(--muted); }
.tx-filter__search-clear {
  position: absolute; right: 6px; display: flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; background: none; border: none; color: var(--muted);
  cursor: pointer; padding: 0; -webkit-tap-highlight-color: transparent;
}
.tx-filter__search-clear:active { color: var(--text); }

/* ─── Quick stats ─────────────────────────────────────────────────────────── */
.tx-stats {
  display: flex; flex-wrap: wrap; align-items: center; gap: 3px 5px;
  padding: 4px 2px 8px; font-family: var(--mono); font-size: 10px; color: var(--muted);
  border-bottom: 1px solid var(--border); margin-bottom: 6px;
}
.tx-stats__num { color: var(--text); font-weight: 700; }
.tx-stats__sep { color: var(--border); }
.tx-stats__chg { font-weight: 700; font-size: 10px; }
.tx-stats__chg--up { color: var(--accent2); }
.tx-stats__chg--dn { color: var(--accent3); }
.tx-stats__top-ico { opacity: .7; flex-shrink: 0; }
:deep(.tx-stats__top-ico svg) { display: block; }

/* ─── List wrapper ────────────────────────────────────────────────────────── */
.tx-list__empty { text-align: center; padding: 18px; color: var(--muted); font-size: 11px; font-family: var(--mono); }
.tx-list__wrap { display: flex; flex-direction: column; }

/* Sticky day header — sits above the scroll area, does not scroll */
.tx-list__sticky-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 2px 4px;
}
.tx-list__day-label {
  font-family: var(--mono); font-size: 10px; font-weight: 700;
  color: var(--muted); text-transform: uppercase; letter-spacing: .5px;
  display: inline-flex; align-items: center; gap: 4px;
}
.tx-list__day-trend { display: inline-flex; align-items: center; }
.tx-list__day-trend--up { color: var(--accent3); }
.tx-list__day-trend--down { color: var(--accent2); }
:deep(.tx-list__day-trend svg) { display: block; }
.tx-list__day-meta { display: flex; gap: 6px; align-items: center; }
.tx-list__day-inc { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--accent3); }
.tx-list__day-exp { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--accent2); }

/* Fixed-height scrollable list — shows ≈4 items, scrolls internally */
.tx-list__scroll {
  /* 4 × 48px items + 3 × 6px gaps = 210px */
  height: calc(4 * 48px + 3 * 6px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tx-list__scroll::-webkit-scrollbar { display: none; }

/* Items */
.tx-list__item {
  display: flex; align-items: center; gap: 10px; padding: 6px 11px;
  background: var(--surface2); border-radius: 9px; border-left: 3px solid transparent;
  animation: si .2s ease; transition: background .15s, border-color .2s;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  height: 48px; box-sizing: border-box; overflow: hidden;
  flex-shrink: 0;
  scroll-snap-align: start;
}
.tx-list__item--exp { border-left-color: var(--accent2); }
.tx-list__item--inc { border-left-color: var(--accent3); }
.tx-list__item:active { background: var(--border); }
@keyframes si { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

/* Date badge (replaces icon circle) */
.tx-list__item-date {
  width: 28px; min-height: 28px; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  flex-shrink: 0; border-radius: 7px;
  padding: 2px 0;
}
.tx-list__item-date--exp { background: rgba(var(--accent2-rgb),.1); }
.tx-list__item-date--inc { background: rgba(var(--accent3-rgb),.1); }
.tx-list__item-date-day {
  font-family: var(--mono); font-size: 12px; font-weight: 700; line-height: 1;
}
.tx-list__item-date--exp .tx-list__item-date-day { color: var(--accent2); }
.tx-list__item-date--inc .tx-list__item-date-day { color: var(--accent3); }
.tx-list__item-date-mon {
  font-family: var(--mono); font-size: 8px; line-height: 1; margin-top: 1px;
  color: var(--muted);
}

.tx-list__item-info { flex: 1; min-width: 0; }
.tx-list__item-name { font-size: 12px; line-height: 16px; font-weight: 600; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-list__item-meta {
  display: flex; align-items: center; gap: 3px;
  font-family: var(--mono); font-size: 9px; line-height: 12px; color: var(--muted); margin-top: 2px;
}
.tx-list__item-cat-ico { flex-shrink: 0; }
:deep(.tx-list__item-cat-ico svg) { display: block; }
.tx-list__item-meta-sep { opacity: .35; }
.tx-list__item-time { font-family: var(--mono); font-size: 9px; color: var(--muted); }
.tx-list__item-amt { font-family: var(--mono); font-size: 12px; font-weight: 700; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; align-self: center; }
.tx-list__item-equiv { font-size: 9px; font-weight: 400; color: var(--muted); }
</style>
