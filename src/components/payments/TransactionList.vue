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
          class="tx-filter__cat"
          :class="{ 'tx-filter__cat--active': filterCat === '' }"
          @click="filterCat = ''"
        >{{ $t('transactions.allCats') }}</button>
        <button
          v-for="cat in availableCats"
          :key="cat.key"
          class="tx-filter__cat"
          :class="{ 'tx-filter__cat--active': filterCat === cat.key }"
          @click="filterCat = cat.key"
        ><Icon :name="cat.icon" :size="9" class="tx-filter__cat-ico" />{{ cat.label }}</button>
      </div>
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
          class="tx-list__item"
          :class="tx.type === 'inc' ? 'tx-list__item--inc' : 'tx-list__item--exp'"
          @click="$emit('open-detail', tx)"
        >
          <div class="tx-list__item-icon"><Icon :name="resolveCat(tx.cat).icon" :size="16" /></div>
          <div class="tx-list__item-info">
            <div class="tx-list__item-name">{{ getLocalized(tx, 'desc', locale) }}</div>
            <div class="tx-list__item-meta">{{ resolveCat(tx.cat).label }}{{ tx.payMethod && tx.payMethod !== 'cash' ? ' · 💳' : '' }}</div>
          </div>
          <div class="tx-list__item-amt" :style="{ color: tx.type === 'inc' ? 'var(--accent3)' : 'var(--accent2)' }">
            <template v-if="hide"><span class="masked">•••••</span></template>
            <template v-else>
              <template v-if="tx.currency && tx.currency !== displayCurrency">
                <span>{{ tx.type === 'inc' ? '+' : '-' }}{{ fCurrFor(tx.amount, tx.currency) }}</span>
                <span class="tx-list__item-equiv">{{ fCurrNative(tx.amount, tx.currency) }}</span>
              </template>
              <template v-else>{{ tx.type === 'inc' ? '+' : '-' }}{{ fCurr(tx.amount) }}</template>
            </template>
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
                class="tx-filter__cat"
                :class="{ 'tx-filter__cat--active': filterCat === '' }"
                @click="filterCat = ''"
              >{{ $t('transactions.allCats') }}</button>
              <button
                v-for="cat in availableCats"
                :key="cat.key"
                class="tx-filter__cat"
                :class="{ 'tx-filter__cat--active': filterCat === cat.key }"
                @click="filterCat = cat.key"
              ><Icon :name="cat.icon" :size="9" class="tx-filter__cat-ico" />{{ cat.label }}</button>
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
                class="tx-list__item"
                :class="tx.type === 'inc' ? 'tx-list__item--inc' : 'tx-list__item--exp'"
                @click="$emit('open-detail', tx)"
              >
                <div class="tx-list__item-icon"><Icon :name="resolveCat(tx.cat).icon" :size="16" /></div>
                <div class="tx-list__item-info">
                  <div class="tx-list__item-name">{{ getLocalized(tx, 'desc', locale) }}</div>
                  <div class="tx-list__item-meta">{{ resolveCat(tx.cat).label }}{{ tx.payMethod && tx.payMethod !== 'cash' ? ' · 💳' : '' }}</div>
                </div>
                <div class="tx-list__item-amt" :style="{ color: tx.type === 'inc' ? 'var(--accent3)' : 'var(--accent2)' }">
                  <template v-if="hide"><span class="masked">•••••</span></template>
                  <template v-else>
                    <template v-if="tx.currency && tx.currency !== displayCurrency">
                      <span>{{ tx.type === 'inc' ? '+' : '-' }}{{ fCurrFor(tx.amount, tx.currency) }}</span>
                      <span class="tx-list__item-equiv">{{ fCurrNative(tx.amount, tx.currency) }}</span>
                    </template>
                    <template v-else>{{ tx.type === 'inc' ? '+' : '-' }}{{ fCurr(tx.amount) }}</template>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCategories } from '../../composables/data/useCategories'
import { useCurrency } from '../../composables/api/useCurrency'
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

defineEmits<{ 'open-detail': [tx: TransactionItem] }>()

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
  if (!filterCat.value) return typeFiltered.value
  return typeFiltered.value.filter(tx => tx.cat === filterCat.value)
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

// ─── Fullscreen ───────────────────────────────────────────────────────────────

function openFullscreen() {
  showAll.value = true
  document.body.style.overflow = 'hidden'
}

function closeFullscreen() {
  showAll.value = false
  document.body.style.overflow = ''
}
</script>

<style scoped>
/* Trend */
.tx-list__trend { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-bottom: 8px; padding: 0 2px; }

/* ─── Filter bar ──────────────────────────────────────────────────────────── */
.tx-filter { margin: 8px 0 10px; display: flex; flex-direction: column; gap: 6px; }
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

/* Items */
.tx-list__item { display: flex; align-items: center; gap: 10px; padding: 10px 11px; background: var(--surface2); border-radius: 9px; border: 1px solid transparent; border-left: 3px solid transparent; animation: si .2s ease; transition: background .15s, border-color .2s; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.tx-list__item--exp { border-left-color: var(--accent2); }
.tx-list__item--exp .tx-list__item-icon { background: rgba(var(--accent2-rgb),.12); color: var(--accent2); }
.tx-list__item--inc { border-left-color: var(--accent3); }
.tx-list__item--inc .tx-list__item-icon { background: rgba(var(--accent3-rgb),.12); color: var(--accent3); }
.tx-list__item:active { background: var(--border); }
@keyframes si { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
.tx-list__item-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; }
.tx-list__item-info { flex: 1; min-width: 0; }
.tx-list__item-name { font-size: 12px; line-height: 16px; font-weight: 600; color: rgba(var(--text-rgb),.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-list__item-meta { font-family: var(--mono); font-size: 9px; line-height: 12px; color: var(--muted); margin-top: 2px; }
.tx-list__item-amt { font-family: var(--mono); font-size: 12px; font-weight: 700; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
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
.tx-fullscreen { position: fixed; inset: 0; z-index: 1000; background: var(--bg); display: flex; flex-direction: column; }

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

.tx-fullscreen__list { flex: 1; overflow-y: auto; padding: 4px 14px 32px; -webkit-overflow-scrolling: touch; }

/* ─── Slide transition ───────────────────────────────────────────────────── */
.tx-slide-enter-active,
.tx-slide-leave-active { transition: transform .3s cubic-bezier(.4, 0, .2, 1); }
.tx-slide-enter-from,
.tx-slide-leave-to { transform: translateY(100%); }
</style>
