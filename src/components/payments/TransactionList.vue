<template>
  <div class="card">
    <!-- Header -->
    <div class="c-hdr" style="margin-bottom:8px">
      <span class="c-title">
        {{ $t('transactions.title') }}
        <span class="trend-ico" :class="txTrend">
          <Icon v-if="txTrend === 'up'" name="trending-up" :size="12" />
          <Icon v-else-if="txTrend === 'down'" name="trending-down" :size="12" />
          <Icon v-else name="minus" :size="12" />
        </span>
      </span>
      <span class="badge">{{ transactions.length }}</span>
    </div>
    <div v-if="txTrend !== 'neutral'" class="tx-list__trend">
      <template v-if="hide">{{ $t('transactions.incShort') }} +••••• · {{ $t('transactions.expShort') }} -•••••</template>
      <template v-else-if="txTrend === 'up'">{{ $t('transactions.incShort') }} +{{ fCurr(todayIncome) }} · {{ $t('transactions.expShort') }} -{{ fCurr(todaySpent) }}</template>
      <template v-else>{{ $t('transactions.expShort') }} -{{ fCurr(todaySpent) }} · {{ $t('transactions.incShort') }} +{{ fCurr(todayIncome) }}</template>
    </div>

    <!-- Filter bar -->
    <div class="tx-filter">
      <div class="tx-filter__type">
        <button
          v-for="ft in typeFilters"
          :key="ft.value"
          class="tx-filter__btn"
          :class="{ 'tx-filter__btn--active': filterType === ft.value }"
          @click="setType(ft.value)"
        >{{ ft.label }}</button>
      </div>
      <div v-if="availableCats.length > 1" class="tx-filter__cats">
        <button
          v-for="cat in availableCats"
          :key="cat.key"
          class="tx-filter__cat"
          :class="{ 'tx-filter__cat--active': filterCat === cat.key }"
          @click="filterCat = filterCat === cat.key ? '' : cat.key"
        ><Icon :name="cat.icon" :size="9" class="tx-filter__cat-ico" />{{ cat.label }}</button>
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

    <!-- Quick stats (card only) -->
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

    <!-- Preview grouped list -->
    <div v-else class="tx-list__list">
      <template v-for="group in previewGroups" :key="group.date">
        <div class="tx-list__day-hdr">
          <span class="tx-list__day-label">{{ group.label }}</span>
          <span class="tx-list__day-meta">
            <span v-if="group.totalInc > 0" class="tx-list__day-inc">{{ hide ? '+•••••' : '+' + fCurr(group.totalInc) }}</span>
            <span v-if="group.totalExp > 0" class="tx-list__day-exp">{{ hide ? '-•••••' : '-' + fCurr(group.totalExp) }}</span>
          </span>
        </div>
        <div
          v-for="tx in group.items"
          :key="tx.id"
          class="tx-swipe"
          @touchstart="onSwipeTouchStart($event, tx)"
          @touchmove="onSwipeTouchMove($event, tx)"
          @touchend="onSwipeTouchEnd($event, tx)"
        >
          <div class="tx-swipe__action tx-swipe__action--clone">
            <Icon name="copy" :size="15" />
            <span>{{ $t('transactions.swipeClone') }}</span>
          </div>
          <div class="tx-swipe__action tx-swipe__action--delete">
            <Icon name="trash-2" :size="15" />
            <span>{{ $t('transactions.swipeDelete') }}</span>
          </div>
          <div
            class="tx-list__item"
            :class="tx.type === 'inc' ? 'tx-list__item--inc' : 'tx-list__item--exp'"
            :style="swipeItemStyle(tx.id)"
            @click="onItemClick(tx)"
          >
            <div class="tx-list__item-icon"><Icon :name="resolveCat(tx.cat).icon" :size="16" /></div>
            <div class="tx-list__item-info">
              <div class="tx-list__item-name">{{ getLocalized(tx, 'desc', locale) }}</div>
              <div class="tx-list__item-meta">{{ resolveCat(tx.cat).label }}{{ tx.payMethod && tx.payMethod !== 'cash' ? ' · 💳' : '' }}{{ tx.time ? ' · ' + tx.time : '' }}</div>
              <div v-if="tx.note" class="tx-list__item-note">{{ tx.note }}</div>
              <div v-if="tx.tags && tx.tags.length" class="tx-list__item-tags">
                <span v-for="tag in tx.tags" :key="tag" class="tx-list__item-tag">#{{ tag }}</span>
              </div>
            </div>
            <div class="tx-list__item-amt" :style="{ color: tx.type === 'inc' ? 'var(--accent3)' : 'var(--accent2)' }">
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
      </template>
    </div>

    <!-- View all button -->
    <button v-if="filteredItems.length > 4" class="tx-list__view-all" @click="openFullscreen">
      {{ $t('transactions.viewAll', { n: filteredItems.length }) }}
      <Icon name="chevron-right" :size="12" />
    </button>

    <!-- Fullscreen overlay -->
    <Teleport to="body">
      <Transition name="tx-slide">
        <div v-if="showAll" class="tx-fullscreen">
          <div class="tx-fullscreen__inner">
          <!-- Fullscreen header -->
          <div class="tx-fullscreen__hdr">
            <span class="tx-fullscreen__title">{{ $t('transactions.title') }}</span>
            <button class="tx-fullscreen__close" @click="closeFullscreen">
              <Icon name="x" :size="20" />
            </button>
          </div>

          <!-- Filter bar (fullscreen) -->
          <div class="tx-filter tx-filter--full">
            <div class="tx-filter__type">
              <button
                v-for="ft in typeFilters"
                :key="ft.value"
                class="tx-filter__btn"
                :class="{ 'tx-filter__btn--active': filterType === ft.value }"
                @click="setType(ft.value)"
              >{{ ft.label }}</button>
            </div>
            <div v-if="availableCats.length > 1" class="tx-filter__cats">
              <button
                v-for="cat in availableCats"
                :key="cat.key"
                class="tx-filter__cat"
                :class="{ 'tx-filter__cat--active': filterCat === cat.key }"
                @click="filterCat = filterCat === cat.key ? '' : cat.key"
              ><Icon :name="cat.icon" :size="9" class="tx-filter__cat-ico" />{{ cat.label }}</button>
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

          <!-- Full grouped list -->
          <div class="tx-fullscreen__list">
            <div v-if="!filteredItems.length" class="tx-list__empty">{{ $t('transactions.empty') }}</div>
            <template v-else v-for="group in allGroups" :key="group.date">
              <div class="tx-list__day-hdr tx-list__day-hdr--sticky">
                <span class="tx-list__day-label">{{ group.label }}</span>
                <span class="tx-list__day-meta">
                  <span v-if="group.totalInc > 0" class="tx-list__day-inc">{{ hide ? '+•••••' : '+' + fCurr(group.totalInc) }}</span>
                  <span v-if="group.totalExp > 0" class="tx-list__day-exp">{{ hide ? '-•••••' : '-' + fCurr(group.totalExp) }}</span>
                </span>
              </div>
              <div
                v-for="tx in group.items"
                :key="tx.id"
                class="tx-swipe"
                @touchstart="onSwipeTouchStart($event, tx)"
                @touchmove="onSwipeTouchMove($event, tx)"
                @touchend="onSwipeTouchEnd($event, tx)"
              >
                <div class="tx-swipe__action tx-swipe__action--clone">
                  <Icon name="copy" :size="15" />
                  <span>{{ $t('transactions.swipeClone') }}</span>
                </div>
                <div class="tx-swipe__action tx-swipe__action--delete">
                  <Icon name="trash-2" :size="15" />
                  <span>{{ $t('transactions.swipeDelete') }}</span>
                </div>
                <div
                  class="tx-list__item"
                  :class="tx.type === 'inc' ? 'tx-list__item--inc' : 'tx-list__item--exp'"
                  :style="swipeItemStyle(tx.id)"
                  @click="onItemClick(tx)"
                >
                  <div class="tx-list__item-icon"><Icon :name="resolveCat(tx.cat).icon" :size="16" /></div>
                  <div class="tx-list__item-info">
                    <div class="tx-list__item-name">{{ getLocalized(tx, 'desc', locale) }}</div>
                    <div class="tx-list__item-meta">{{ resolveCat(tx.cat).label }}{{ tx.payMethod && tx.payMethod !== 'cash' ? ' · 💳' : '' }}{{ tx.time ? ' · ' + tx.time : '' }}</div>
                    <div v-if="tx.note" class="tx-list__item-note">{{ tx.note }}</div>
                    <div v-if="tx.tags && tx.tags.length" class="tx-list__item-tags">
                      <span v-for="tag in tx.tags" :key="tag" class="tx-list__item-tag">#{{ tag }}</span>
                    </div>
                  </div>
                  <div class="tx-list__item-amt" :style="{ color: tx.type === 'inc' ? 'var(--accent3)' : 'var(--accent2)' }">
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
            </template>
          </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Undo delete toast -->
    <Teleport to="body">
      <Transition name="undo-toast">
        <div v-if="pendingDelete" class="tx-undo-toast">
          <span class="tx-undo-toast__text">{{ $t('transactions.undoDelete', { name: pendingDelete.name }) }}</span>
          <button class="tx-undo-toast__btn" @click="undoDelete">{{ $t('transactions.undoAction') }}</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCategories } from '../../composables/data/useCategories'
import { useCurrency, type Currency } from '../../composables/api/useCurrency'
import { getLocalized } from '../../composables/data/useI18nData'
import type { TransactionItem } from '../../types/data'

const { locale, t } = useI18n()
const { fDate, tStr } = useFormatters()
const { resolveCat } = useCategories()
const { fCurr, fCurrNative, fCurrFor, displayCurrency } = useCurrency()

const props = defineProps<{
  transactions: TransactionItem[]
  hide: boolean
  txTrend: string
  todaySpent: number
  todayIncome: number
}>()

const emit = defineEmits<{
  'open-detail': [tx: TransactionItem]
  'delete-tx': [tx: TransactionItem]
  'quick-add': [tx: TransactionItem]
}>()

// ─── Filter state ─────────────────────────────────────────────────────────────

const filterType = ref<'all' | 'exp' | 'inc'>('all')
const filterCat = ref('')
const showAll = ref(false)

const typeFilters = computed(() => [
  { value: 'all' as const, label: t('transactions.filterAll') },
  { value: 'exp' as const, label: t('transactions.filterExp') },
  { value: 'inc' as const, label: t('transactions.filterInc') },
])

function setType(val: 'all' | 'exp' | 'inc') {
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

// ─── Undo delete state ────────────────────────────────────────────────────────

interface PendingDelete {
  tx: TransactionItem
  name: string
  timer: ReturnType<typeof setTimeout>
}
const pendingDelete = ref<PendingDelete | null>(null)
const hiddenTxId = ref<number | null>(null)

// ─── Computed filtering ───────────────────────────────────────────────────────

const typeFiltered = computed(() => {
  if (filterType.value === 'exp') return props.transactions.filter(tx => tx.type === 'exp')
  if (filterType.value === 'inc') return props.transactions.filter(tx => tx.type === 'inc')
  return props.transactions
})

const availableCats = computed(() => {
  const seen = new Set<string>()
  const result = []
  for (const tx of typeFiltered.value) {
    if (!seen.has(tx.cat)) {
      seen.add(tx.cat)
      result.push(resolveCat(tx.cat))
    }
  }
  return result
})

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
  if (hiddenTxId.value !== null) {
    items = items.filter(tx => tx.id !== hiddenTxId.value)
  }
  return items
})

// ─── Quick stats (based on ALL transactions, not filtered) ────────────────────

const currentMonthPrefix = computed(() => tStr().slice(0, 7))

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

// ─── Grouping by date ─────────────────────────────────────────────────────────

interface TxGroup {
  date: string
  label: string
  totalExp: number
  totalInc: number
  items: TransactionItem[]
}

const yesterdayStr = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
})

function buildGroups(items: TransactionItem[]): TxGroup[] {
  const map = new Map<string, TransactionItem[]>()
  for (const tx of items) {
    if (!map.has(tx.date)) map.set(tx.date, [])
    map.get(tx.date)!.push(tx)
  }
  const today = tStr()
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txs]) => ({
      date,
      label:
        date === today
          ? t('transactions.today')
          : date === yesterdayStr.value
            ? t('transactions.yesterday')
            : fDate(date, locale.value),
      totalExp: txs.filter(tx => tx.type === 'exp').reduce((s, tx) => s + tx.amount, 0),
      totalInc: txs.filter(tx => tx.type === 'inc').reduce((s, tx) => s + tx.amount, 0),
      items: txs,
    }))
}

const allGroups = computed(() => buildGroups(filteredItems.value))

// Preview: first 4 items across groups (full group totals preserved)
const previewGroups = computed<TxGroup[]>(() => {
  let remaining = 4
  const result: TxGroup[] = []
  for (const group of allGroups.value) {
    if (remaining <= 0) break
    const items = group.items.slice(0, remaining)
    remaining -= items.length
    result.push({ ...group, items })
  }
  return result
})

// ─── Swipe actions ─────────────────────────────────────────────────────────────

const swipeActiveId = ref<number | null>(null)
const swipeX = ref(0)
const swipeSpring = ref(false)
let swipeTouchStartX = 0
let swipeTouchStartY = 0
let swipeDirLocked: 'none' | 'horiz' | 'vert' = 'none'
let swipeDidMove = false

function swipeItemStyle(id: number): Record<string, string> {
  if (swipeActiveId.value !== id) return {}
  return {
    transform: `translateX(${swipeX.value}px)`,
    transition: swipeSpring.value ? 'transform 0.3s cubic-bezier(0.22,1,0.36,1)' : 'none',
  }
}

function onSwipeTouchStart(e: TouchEvent, tx: TransactionItem) {
  if (swipeActiveId.value !== null && swipeActiveId.value !== tx.id) {
    springBackSwipe()
  }
  swipeActiveId.value = tx.id
  swipeX.value = 0
  swipeTouchStartX = e.touches[0].clientX
  swipeTouchStartY = e.touches[0].clientY
  swipeDirLocked = 'none'
  swipeDidMove = false
  swipeSpring.value = false
}

function onSwipeTouchMove(e: TouchEvent, tx: TransactionItem) {
  if (swipeActiveId.value !== tx.id) return
  const dx = e.touches[0].clientX - swipeTouchStartX
  const dy = e.touches[0].clientY - swipeTouchStartY

  if (swipeDirLocked === 'none') {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      swipeDirLocked = Math.abs(dx) >= Math.abs(dy) ? 'horiz' : 'vert'
    }
  }
  if (swipeDirLocked === 'vert') {
    swipeX.value = 0
    return
  }
  if (swipeDirLocked === 'horiz') {
    const MAX = 110
    swipeX.value = Math.max(-MAX, Math.min(MAX, dx))
    if (Math.abs(dx) > 5) swipeDidMove = true
  }
}

function onSwipeTouchEnd(_e: TouchEvent, tx: TransactionItem) {
  if (swipeActiveId.value !== tx.id) return
  const x = swipeX.value
  const THRESHOLD = 60

  if (x < -THRESHOLD) {
    triggerDelete(tx)
  } else if (x > THRESHOLD) {
    triggerClone(tx)
  } else {
    springBackSwipe()
  }
}

function springBackSwipe() {
  swipeSpring.value = true
  swipeX.value = 0
  setTimeout(() => {
    swipeSpring.value = false
    swipeActiveId.value = null
  }, 300)
}

function onItemClick(tx: TransactionItem) {
  if (swipeDidMove) {
    swipeDidMove = false
    return
  }
  emit('open-detail', tx)
}

// ─── Delete with undo ──────────────────────────────────────────────────────────

function triggerDelete(tx: TransactionItem) {
  // Commit any existing pending delete immediately before starting a new one
  if (pendingDelete.value) {
    clearTimeout(pendingDelete.value.timer)
    emit('delete-tx', pendingDelete.value.tx)
    pendingDelete.value = null
  }

  hiddenTxId.value = tx.id
  springBackSwipe()

  const name = getLocalized(tx, 'desc', locale.value) || tx.desc
  const timer = setTimeout(() => {
    emit('delete-tx', tx)
    pendingDelete.value = null
    hiddenTxId.value = null
  }, 5000)

  pendingDelete.value = { tx, name, timer }
}

function undoDelete() {
  if (!pendingDelete.value) return
  clearTimeout(pendingDelete.value.timer)
  pendingDelete.value = null
  hiddenTxId.value = null
}

// ─── Quick add (clone) ────────────────────────────────────────────────────────

function triggerClone(tx: TransactionItem) {
  springBackSwipe()
  emit('quick-add', tx)
}

// ─── Fullscreen ───────────────────────────────────────────────────────────────

function openFullscreen() {
  showAll.value = true
  document.body.style.overflow = 'hidden'
}

function closeFullscreen() {
  showAll.value = false
  document.body.style.overflow = ''
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

onBeforeUnmount(() => {
  if (pendingDelete.value) {
    clearTimeout(pendingDelete.value.timer)
    emit('delete-tx', pendingDelete.value.tx)
    pendingDelete.value = null
    hiddenTxId.value = null
  }
})
</script>

<style scoped>
/* Trend */
.tx-list__trend { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-bottom: 8px; padding: 0 2px; }

/* ─── Filter bar ──────────────────────────────────────────────────────────── */
.tx-filter { margin: 8px 0 6px; display: flex; flex-direction: column; gap: 6px; }
.tx-filter--full { padding: 8px 14px 0; flex-shrink: 0; margin: 0; }

.tx-filter__type { display: flex; gap: 4px; }
.tx-filter__btn {
  flex: 1; padding: 5px 8px;
  font-family: var(--mono); font-size: 10px;
  border: 1px solid var(--border); border-radius: 7px;
  background: transparent; color: var(--muted);
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background .12s, border-color .12s, color .12s;
}
.tx-filter__btn--active { background: var(--surface2); color: var(--text); border-color: var(--accent); }
.tx-filter__btn:active { background: var(--border); }

.tx-filter__cats { display: flex; gap: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
.tx-filter__cat {
  display: inline-flex; align-items: center; white-space: nowrap;
  padding: 3px 8px; font-family: var(--mono); font-size: 10px;
  border: 1px solid var(--border); border-radius: 12px;
  background: transparent; color: var(--muted);
  cursor: pointer; -webkit-tap-highlight-color: transparent; flex-shrink: 0;
  transition: background .12s, border-color .12s, color .12s;
}
.tx-filter__cat--active { background: var(--surface2); color: var(--text); border-color: var(--accent); }
.tx-filter__cat:active { background: var(--border); }
.tx-filter__cat-ico { margin-right: 3px; }
:deep(.tx-filter__cat-ico svg) { display: block; }

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

/* ─── List ────────────────────────────────────────────────────────────────── */
.tx-list__list { display: flex; flex-direction: column; gap: 3px; }
.tx-list__empty { text-align: center; padding: 18px; color: var(--muted); font-size: 11px; font-family: var(--mono); }

/* Day header */
.tx-list__day-hdr { display: flex; align-items: center; justify-content: space-between; padding: 6px 2px 3px; }
.tx-list__day-hdr--sticky { position: sticky; top: 0; background: var(--bg); z-index: 2; padding: 8px 14px 4px; margin: 0 -14px; }
.tx-list__day-label { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
.tx-list__day-meta { display: flex; gap: 6px; align-items: center; }
.tx-list__day-inc { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--accent3); }
.tx-list__day-exp { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--accent2); }

/* ─── Swipe container ─────────────────────────────────────────────────────── */
.tx-swipe {
  position: relative;
  overflow: hidden;
  border-radius: 9px;
  touch-action: pan-y;
  -webkit-user-select: none;
  user-select: none;
}

.tx-swipe__action {
  position: absolute;
  top: 0; bottom: 0;
  display: flex; align-items: center; gap: 5px;
  padding: 0 18px;
  font-family: var(--mono); font-size: 10px; font-weight: 700;
  letter-spacing: .03em;
  pointer-events: none;
  white-space: nowrap;
}
:deep(.tx-swipe__action svg) { display: block; flex-shrink: 0; }

.tx-swipe__action--delete { right: 0; background: var(--accent2); color: #fff; }
.tx-swipe__action--clone  { left: 0;  background: var(--accent3); color: #fff; }

/* Items */
.tx-list__item {
  position: relative; z-index: 1;
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 11px;
  background: var(--surface2); border-radius: 9px; border-left: 3px solid transparent;
  animation: si .2s ease; transition: background .15s, border-color .2s;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  will-change: transform;
}
.tx-list__item--exp { border-left-color: var(--accent2); }
.tx-list__item--exp .tx-list__item-icon { background: rgba(var(--accent2-rgb),.12); color: var(--accent2); }
.tx-list__item--inc { border-left-color: var(--accent3); }
.tx-list__item--inc .tx-list__item-icon { background: rgba(var(--accent3-rgb),.12); color: var(--accent3); }
.tx-list__item:active { background: var(--border); }
@keyframes si { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
.tx-list__item-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; margin-top: 1px; }
.tx-list__item-info { flex: 1; min-width: 0; }
.tx-list__item-name { font-size: 12px; line-height: 16px; font-weight: 600; color: rgba(var(--text-rgb),.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-list__item-meta { font-family: var(--mono); font-size: 9px; line-height: 12px; color: var(--muted); margin-top: 2px; }
.tx-list__item-note { font-size: 10px; line-height: 14px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .8; }
.tx-list__item-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.tx-list__item-tag { font-family: var(--mono); font-size: 9px; padding: 1px 5px; background: rgba(var(--accent-rgb),.1); border-radius: 4px; color: var(--accent); }
.tx-list__item-amt { font-family: var(--mono); font-size: 12px; font-weight: 700; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; padding-top: 1px; }
.tx-list__item-equiv { font-size: 9px; font-weight: 400; color: var(--muted); }

/* View all button */
.tx-list__view-all {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  width: 100%; margin-top: 8px; padding: 8px;
  font-family: var(--mono); font-size: 11px; color: var(--muted);
  background: transparent; border: 1px dashed var(--border); border-radius: 8px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.tx-list__view-all:active { background: var(--surface2); color: var(--text); }

/* ─── Fullscreen ──────────────────────────────────────────────────────────── */
.tx-fullscreen { position: fixed; inset: 0; z-index: 1000; background: var(--bg); display: flex; justify-content: center; }
.tx-fullscreen__inner { width: 100%; max-width: 480px; display: flex; flex-direction: column; }

.tx-fullscreen__hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.tx-fullscreen__title { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: .5px; }
.tx-fullscreen__close {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
  color: var(--muted); cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.tx-fullscreen__close:active { background: var(--border); color: var(--text); }

.tx-fullscreen__list { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 14px 32px; -webkit-overflow-scrolling: touch; background: var(--bg); }

/* ─── Undo delete toast ───────────────────────────────────────────────────── */
.tx-undo-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px 10px 18px;
  background: rgba(30, 30, 40, 0.94); border: 1px solid rgba(255,255,255,.12); border-radius: 10px;
  font-family: var(--sans); font-size: 12px; font-weight: 600;
  z-index: 9999; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0,0,0,.45);
  max-width: calc(100vw - 32px); min-width: 220px;
  color: rgba(255,255,255,.85);
}
.tx-undo-toast__text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-undo-toast__btn {
  flex-shrink: 0; padding: 4px 10px;
  font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .03em;
  background: rgba(var(--accent-rgb),.22); border: 1px solid rgba(var(--accent-rgb),.5); border-radius: 6px;
  color: var(--accent); cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.tx-undo-toast__btn:active { background: rgba(var(--accent-rgb),.4); }

.undo-toast-enter-active { transition: all .3s ease; }
.undo-toast-leave-active { transition: all .25s ease; }
.undo-toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(16px); }
.undo-toast-leave-to   { opacity: 0; transform: translateX(-50%) translateY(16px); }

/* ─── Slide transition ───────────────────────────────────────────────────── */
.tx-slide-enter-active,
.tx-slide-leave-active { transition: transform .3s cubic-bezier(.4, 0, .2, 1); }
.tx-slide-enter-from,
.tx-slide-leave-to { transform: translateY(100%); }
</style>
