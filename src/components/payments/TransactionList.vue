<template>
  <div class="chien-ky">
    <!-- Section header · Chiến Ký · X ngày -->
    <SectionHeader
      :icon="IconScroll"
      :title="$t('chienKy.title')"
      :vn="$t('chienKy.daysCount', { n: distinctDayCount })"
    />

    <!-- 3-stat row · Tổn / Hồi / Cân bằng -->
    <div class="inv-stats">
      <div class="inv-stat exp">
        <div class="l">{{ $t('chienKy.statTon') }}</div>
        <div class="v exp">−{{ hide ? '●●●' : fmtShort(totalExp) }}đ</div>
      </div>
      <div class="inv-stat inc">
        <div class="l">{{ $t('chienKy.statHoi') }}</div>
        <div class="v inc">+{{ hide ? '●●●' : fmtShort(totalInc) }}đ</div>
      </div>
      <div class="inv-stat net">
        <div class="l">{{ $t('chienKy.statBalance') }}</div>
        <div class="v net">
          {{ totalNet >= 0 ? '+' : '−' }}{{ hide ? '●●●' : fmtShort(Math.abs(totalNet)) }}đ
        </div>
      </div>
    </div>

    <!-- Search box -->
    <div class="inv-search">
      <div class="inv-search-box">
        <IconSearch :size="14" />
        <input
          v-model="searchRaw"
          :placeholder="$t('chienKy.searchPlaceholder')"
          type="search"
          autocomplete="off"
        />
      </div>
    </div>

    <!-- Chip row · type filter -->
    <div class="chip-row">
      <div
        v-for="c in chips"
        :key="c.id"
        :class="['chip', { active: filterType === c.id }]"
        @click="filterType = c.id"
      >
        {{ c.label }}
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="dayGroups.length === 0" class="chien-ky__empty">
      {{ $t('chienKy.empty') }}
    </div>

    <!-- Day-grouped transactions -->
    <template v-for="day in dayGroups" :key="day.date">
      <div class="day-h">
        <span class="d">{{ dayLabel(day.date) }}</span>
        <span :class="['net', day.net >= 0 ? 'pos' : 'neg']">
          {{ day.net >= 0 ? '+' : '−' }}{{ hide ? '●●●' : fN(Math.abs(day.net)) }}đ
        </span>
      </div>
      <div
        v-for="tx in day.items"
        :key="tx.id"
        class="tx"
      >
        <div class="tx-ic">
          <component :is="spriteForTx(tx)" :size="16" />
        </div>
        <div class="tx-body">
          <div class="tx-name">{{ getLocalized(tx, 'desc', locale) }}</div>
          <div class="tx-meta">
            <span v-if="tx.time">{{ tx.time }}</span>
            <span v-if="tx.time"> · </span>
            <span>{{ catLabel(tx.cat) }}</span>
          </div>
        </div>
        <div :class="['tx-amt', tx.type]">
          <template v-if="hide">●●●</template>
          <template v-else>
            {{ tx.type === 'inc' ? '+' : '−' }}{{ fCurr(txVndAmt(tx)) }}
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type FunctionalComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IconScroll,
  IconSearch,
  SPRITE,
  IconLotus,
  type IconProps,
} from '@/components/ui/quest-icons'
import SectionHeader from '@/components/cards/SectionHeader.vue'
import { useFormatters } from '@/composables/ui/useFormatters'
import { useCurrency, type Currency } from '@/composables/api/useCurrency'
import { useDisplayMode } from '@/composables/ui/useDisplayMode'
import { categoryFor } from '@/composables/data/useTutienNames'
import { useCategories } from '@/composables/data/useCategories'
import { getLocalized } from '@/composables/data/useI18nData'
import type { TransactionItem } from '@/types/data'

const { locale, t } = useI18n()
const { fN, tStr } = useFormatters()
const { fCurr, toVnd } = useCurrency()
const { mode: displayMode } = useDisplayMode()
const { resolveCat } = useCategories()

const props = defineProps<{
  transactions: TransactionItem[]
  hide: boolean
}>()

defineEmits<{
  'delete-tx': [tx: TransactionItem]
  'quick-add': [tx: TransactionItem]
}>()

// ─── Filter state · 5 chips theo design (all/exp/inc + 2 top cats) ────────
type ChipId = 'all' | 'exp' | 'inc' | string  // string = cat key
const filterType = ref<ChipId>('all')
const searchRaw = ref('')
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchRaw, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { searchQuery.value = v }, 200)
})

/** Top 2 categories by spending — dùng cho 2 chip extra theo design. */
const topCats = computed<Array<{ id: string; label: string }>>(() => {
  const totals = new Map<string, number>()
  for (const tx of props.transactions) {
    if (tx.type !== 'exp') continue
    const cat = (tx.cat || 'khac').toLowerCase()
    totals.set(cat, (totals.get(cat) ?? 0) + tx.amount)
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
  return sorted.map(([id]) => ({
    id,
    label: catLabel(id),
  }))
})

const chips = computed<Array<{ id: ChipId; label: string }>>(() => {
  const base: Array<{ id: ChipId; label: string }> = [
    { id: 'all', label: t('chienKy.chipAll') },
    { id: 'exp', label: t('chienKy.chipExp') },
    { id: 'inc', label: t('chienKy.chipInc') },
  ]
  return [...base, ...topCats.value]
})

// ─── Tx → VND amount cho display ──────────────────────────────────────────
function txVndAmt(tx: TransactionItem): number {
  if (tx.currency && tx.currency !== 'VND') return toVnd(tx.amount, tx.currency as Currency)
  return tx.amount
}

// ─── Filter pipeline ──────────────────────────────────────────────────────
const filteredItems = computed(() => {
  let items: TransactionItem[]
  if (filterType.value === 'all') items = props.transactions
  else if (filterType.value === 'exp' || filterType.value === 'inc') {
    items = props.transactions.filter((tx) => tx.type === filterType.value)
  } else {
    // cat filter (e.g. 'an', 'mua', 'food', 'shop')
    items = props.transactions.filter((tx) => tx.cat === filterType.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    items = items.filter((tx) => {
      const locName = getLocalized(tx, 'desc', locale.value).toLowerCase()
      const rawName = (tx.desc || '').toLowerCase()
      const note = (tx.note || '').toLowerCase()
      return locName.includes(q) || rawName.includes(q) || note.includes(q)
    })
  }
  return items
})

// ─── Day groups (sorted desc by date) ─────────────────────────────────────
interface DayGroup {
  date: string
  items: TransactionItem[]
  net: number
}
const dayGroups = computed<DayGroup[]>(() => {
  const map = new Map<string, TransactionItem[]>()
  for (const tx of filteredItems.value) {
    if (!map.has(tx.date)) map.set(tx.date, [])
    map.get(tx.date)!.push(tx)
  }
  const groups: DayGroup[] = []
  for (const [date, items] of map) {
    items.sort((a, b) => (b.time || '').localeCompare(a.time || ''))
    const net = items.reduce((s, tx) => {
      const amt = txVndAmt(tx)
      return s + (tx.type === 'inc' ? amt : -amt)
    }, 0)
    groups.push({ date, items, net })
  }
  groups.sort((a, b) => b.date.localeCompare(a.date))
  return groups
})

const distinctDayCount = computed(() => dayGroups.value.length)

// ─── Stats (across filtered items) ────────────────────────────────────────
const totalExp = computed(() =>
  filteredItems.value
    .filter((tx) => tx.type === 'exp')
    .reduce((s, tx) => s + txVndAmt(tx), 0),
)
const totalInc = computed(() =>
  filteredItems.value
    .filter((tx) => tx.type === 'inc')
    .reduce((s, tx) => s + txVndAmt(tx), 0),
)
const totalNet = computed(() => totalInc.value - totalExp.value)

// ─── Day label · "HÔM NAY · DD.MM" / "HÔM QUA · DD.MM" / "DD.MM" ──────────
const yesterdayStr = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  )
})

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function dayLabel(dateStr: string): string {
  const today = tStr()
  const short = fmtDay(dateStr)
  if (dateStr === today) return `${t('chienKy.dayToday')} · ${short}`
  if (dateStr === yesterdayStr.value) return `${t('chienKy.dayYesterday')} · ${short}`
  return short
}

// ─── Sprite + label per cat ───────────────────────────────────────────────
function spriteForTx(tx: TransactionItem): FunctionalComponent<IconProps> {
  const cat = categoryFor(tx.cat)
  return SPRITE[cat.sp] ?? IconLotus
}

function catLabel(catKey: string): string {
  if (displayMode.value === 'tutien') {
    return categoryFor(catKey).display
  }
  // Real mode: dùng i18n labels từ useCategories
  return resolveCat(catKey).label
}

// ─── Format gọn cho stats ─────────────────────────────────────────────────
function fmtShort(n: number): string {
  // Ưu tiên fCurr (chuyển sang display currency) cho stats
  return fCurr(Math.abs(n))
}
</script>

<style scoped>
.chien-ky { display: flex; flex-direction: column; }

/* ─── INV STATS · 3-box row · port từ design ─────────────────────────────── */
.inv-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
  margin-top: 14px;
}
.inv-stat {
  padding: 11px 12px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 4px;
  position: relative;
}
.inv-stat::before {
  content: ''; position: absolute;
  left: 0; top: 8px; bottom: 8px;
  width: 2px;
}
.inv-stat.exp::before { background: var(--crimson); }
.inv-stat.inc::before { background: var(--jade); }
.inv-stat.net::before { background: var(--gold); }
.inv-stat .l {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 10px; color: var(--muted);
  letter-spacing: 0.06em;
}
.inv-stat .v {
  font-family: var(--mono); font-weight: 700; font-size: 14px;
  margin-top: 5px;
  letter-spacing: -0.02em;
}
.inv-stat .v.exp { color: var(--crimson); }
.inv-stat .v.inc { color: var(--jade); }
.inv-stat .v.net { color: var(--gold-2); }

/* ─── INV SEARCH · single search input ───────────────────────────────────── */
.inv-search {
  display: flex; gap: 6px;
  margin-top: 12px;
}
.inv-search-box {
  flex: 1; position: relative;
  display: flex; align-items: center;
}
.inv-search-box :deep(svg) {
  position: absolute; left: 11px;
  color: var(--muted);
  pointer-events: none;
}
.inv-search-box input {
  width: 100%;
  padding: 10px 12px 10px 34px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--text);
  outline: none;
  font-family: var(--serif-vn); font-size: 12px;
  -webkit-appearance: none; appearance: none;
}
.inv-search-box input:focus { border-color: var(--gold); }
.inv-search-box input::placeholder { color: var(--muted); }

/* ─── CHIP ROW · pill filter chips ───────────────────────────────────────── */
.chip-row {
  display: flex; gap: 5px;
  margin-top: 10px; flex-wrap: wrap;
}
.chip {
  padding: 7px 11px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 14px;
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 10px; color: var(--text-2);
  cursor: pointer;
  letter-spacing: 0.02em;
  display: flex; align-items: center; gap: 5px;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.chip.active {
  background: rgba(var(--gold-rgb), 0.15);
  border-color: var(--gold);
  color: var(--gold);
}

/* ─── DAY HEADER · per-day grouping ──────────────────────────────────────── */
.day-h {
  margin: 14px 2px 8px;
  display: flex; align-items: center; justify-content: space-between;
}
.day-h .d {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 12px; color: var(--gold);
  letter-spacing: 0.04em;
}
.day-h .d::before {
  content: '✦'; color: var(--jade);
  font-style: normal;
}
.day-h .net {
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  letter-spacing: -0.02em;
}
.day-h .net.pos { color: var(--jade); }
.day-h .net.neg { color: var(--crimson); }

/* ─── TX ITEM · ic + body + amt ──────────────────────────────────────────── */
.tx {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px;
  margin-bottom: 5px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.tx:active {
  transform: translateX(2px);
  border-color: var(--gold);
}

.tx-ic {
  width: 34px; height: 34px; flex-shrink: 0;
  background: var(--paper-3);
  border: 1px solid var(--line);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-2);
}

.tx-body { flex: 1; min-width: 0; }
.tx-name {
  font-family: var(--serif-vn); font-size: 13px; font-weight: 600;
  color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tx-meta {
  font-family: var(--mono); font-size: 9px;
  color: var(--muted);
  margin-top: 3px;
  letter-spacing: 0.02em;
}

.tx-amt {
  font-family: var(--mono); font-weight: 700; font-size: 13px;
  flex-shrink: 0;
  text-align: right;
  letter-spacing: -0.02em;
}
.tx-amt.exp { color: var(--crimson); }
.tx-amt.inc { color: var(--jade); }

/* Empty state */
.chien-ky__empty {
  text-align: center;
  padding: 24px 12px;
  font-family: var(--serif); font-style: italic;
  font-size: 12px; color: var(--muted);
  border: 1px dashed var(--line);
  border-radius: 5px;
  margin-top: 10px;
}
</style>
