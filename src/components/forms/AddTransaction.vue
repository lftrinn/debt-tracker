<template>
  <div class="add-tx">
    <!-- Section header · Xuất Kiếm -->
    <SectionHeader :icon="IconSword" title="Xuất Kiếm" vn="new entry" />

    <!-- Toggle Tổn Linh Khí / Hồi Tu Vi -->
    <div class="add-toggle">
      <button
        :class="['add-toggle__btn', { active: txType === 'exp', exp: txType === 'exp' }]"
        @click="txType = 'exp'"
      >Tổn Linh Khí</button>
      <button
        :class="['add-toggle__btn', { active: txType === 'inc', inc: txType === 'inc' }]"
        @click="txType = 'inc'"
      >Hồi Tu Vi</button>
    </div>

    <!-- Amount display · big number with crit tag ≥500K VND -->
    <div class="amt-display">
      <div v-if="isCrit" class="crit-tag">⚡ Bạo Kích!</div>
      <div class="amt-display__lab">
        {{ txType === 'exp' ? 'KHÍ HAO TỔN' : 'KHÍ HỒI PHỤC' }}
      </div>
      <div :class="['amt-display__num', txType]">
        <span class="cu">đ</span>
        <input
          class="amt-display__input"
          type="number"
          inputmode="numeric"
          v-model.number="currentAmt"
          placeholder="0"
          min="0"
        />
      </div>
    </div>

    <!-- Quick amount row · 4 fixed VND presets -->
    <div class="qa-row">
      <button
        v-for="v in PRESETS"
        :key="v"
        class="qa-btn"
        @click="currentAmt = v"
      >+{{ fmtPreset(v) }}</button>
    </div>

    <!-- Section header · Loại Linh Khí -->
    <div class="cat-section-h">Loại Linh Khí</div>

    <!-- Category grid · 8 unified CATS regardless of kind -->
    <div class="cat-grid">
      <div
        v-for="c in CATS"
        :key="c.id"
        :class="['cat', { active: currentCat === c.id }]"
        @click="currentCat = c.id"
      >
        <component :is="SPRITE[c.sp]" :size="18" />
        <span class="cat__lb">{{ useTutien ? c.display : c.real }}</span>
      </div>
    </div>

    <!-- Note field (=desc) -->
    <input
      class="field field--note"
      v-model="currentDesc"
      placeholder="Ghi chú đạo tâm..."
    />

    <!-- Field row · date + (payMethod for exp) -->
    <div :class="['field-row', txType === 'exp' ? 'field-row--2' : 'field-row--1']">
      <input class="field" type="date" v-model="currentDate" :max="todayStr" />
      <select v-if="txType === 'exp'" class="field" v-model="nPayMethod">
        <option v-for="m in payMethodOpts" :key="m.key" :value="m.key">{{ m.label }}</option>
      </select>
    </div>

    <!-- Attack button -->
    <button
      class="attack-btn"
      @click="onSubmit"
      :disabled="syncing || !currentAmt || !currentDesc.trim()"
    >
      {{
        syncing
          ? 'Đang lưu...'
          : txType === 'exp'
            ? 'Hạ Kiếm Xác Nhận'
            : 'Thu Liễm Tu Vi'
      }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { IconSword, SPRITE } from '@/components/ui/quest-icons'
import SectionHeader from '@/components/cards/SectionHeader.vue'
import { useDisplayMode } from '@/composables/ui/useDisplayMode'
import { CATEGORIES_TUTIEN, type CategoryEntry } from '@/composables/data/useTutienNames'
import { bossForAmount } from '@/composables/data/useBossTiers'
import type { DebtItem } from '@/types/data'

const { mode: displayMode } = useDisplayMode()
const useTutien = computed(() => displayMode.value === 'tutien')

interface ExpPayload {
  desc: string
  amount: number
  cat: string
  payMethod: string
  currency: string
  date: string
  time?: string
}
interface IncPayload {
  desc: string
  amount: number
  cat: string
  currency: string
  date: string
  time?: string
}
interface PrefillData {
  type?: 'exp' | 'inc'
  desc?: string
  amount?: number
  cat?: string
  note?: string
  time?: string
  date?: string
  payMethod?: string
}

const props = defineProps<{
  syncing?: boolean
  creditCards?: DebtItem[]
  prefill?: PrefillData | null
}>()

const emit = defineEmits<{
  'add-expense': [payload: ExpPayload]
  'add-income': [payload: IncPayload]
  'prefill-consumed': []
}>()

/** 8 unified CATS — same for exp & inc theo design. */
const CATS: ReadonlyArray<CategoryEntry> = CATEGORIES_TUTIEN

/** Fixed VND presets theo design — không variable theo currency. */
const PRESETS = [20_000, 50_000, 100_000, 200_000] as const

/** Crit threshold ≥ 500K VND. */
const CRIT_THRESHOLD = 500_000

const txType = ref<'exp' | 'inc'>('exp')

// Expense state
const nAmt = ref<number | null>(null)
const nCat = ref<string>('food')
const nPayMethod = ref('cash')
const nDesc = ref('')
const nDate = ref(getCurrentDate())

// Income state
const iAmt = ref<number | null>(null)
const iCat = ref<string>('pay')
const iDesc = ref('')
const iDate = ref(getCurrentDate())

function getCurrentTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
function getCurrentDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const todayStr = getCurrentDate()

// ─── Bridges to current kind ────────────────────────────────
const currentAmt = computed<number | null>({
  get: () => (txType.value === 'exp' ? nAmt.value : iAmt.value),
  set: (v) => {
    if (txType.value === 'exp') nAmt.value = v
    else iAmt.value = v
  },
})
const currentCat = computed<string>({
  get: () => (txType.value === 'exp' ? nCat.value : iCat.value),
  set: (v) => {
    if (txType.value === 'exp') nCat.value = v
    else iCat.value = v
  },
})
const currentDesc = computed<string>({
  get: () => (txType.value === 'exp' ? nDesc.value : iDesc.value),
  set: (v) => {
    if (txType.value === 'exp') nDesc.value = v
    else iDesc.value = v
  },
})
const currentDate = computed<string>({
  get: () => (txType.value === 'exp' ? nDate.value : iDate.value),
  set: (v) => {
    if (txType.value === 'exp') nDate.value = v
    else iDate.value = v
  },
})

const isCrit = computed(() => (currentAmt.value ?? 0) >= CRIT_THRESHOLD)

function fmtPreset(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return String(v)
}

// ─── Pay method options · cash + danh sách thẻ ─────────────────
const payMethodOpts = computed(() => {
  const list: Array<{ key: string; label: string }> = [
    { key: 'cash', label: 'Linh Thạch · tiền mặt' },
  ]
  ;(props.creditCards || []).forEach((c) => {
    const boss = bossForAmount(c.amount, c.id || c.name)
    const display = useTutien.value ? `${boss.name} · ${c.name}` : c.name
    list.push({ key: c.id, label: display })
  })
  return list
})

// Reset payMethod khi credit card list thay đổi
watch(
  () => props.creditCards,
  (cards) => {
    if (nPayMethod.value !== 'cash' && !cards?.find((c) => c.id === nPayMethod.value)) {
      nPayMethod.value = 'cash'
    }
  },
  { deep: true },
)

// ─── Prefill ──────────────────────────────────────────────────
watch(
  () => props.prefill,
  (data) => {
    if (!data) return
    if (data.type === 'inc') {
      txType.value = 'inc'
      iDesc.value = data.desc || ''
      iAmt.value = data.amount || null
      if (data.cat) iCat.value = data.cat
      iDate.value = data.date || getCurrentDate()
    } else {
      txType.value = 'exp'
      nDesc.value = data.desc || ''
      nAmt.value = data.amount || null
      if (data.cat) nCat.value = data.cat
      if (data.payMethod) nPayMethod.value = data.payMethod
      nDate.value = data.date || getCurrentDate()
    }
    emit('prefill-consumed')
  },
  { immediate: true },
)

// ─── Submit ────────────────────────────────────────────────────
function onSubmit(): void {
  if (txType.value === 'exp') addExp()
  else addInc()
}

function addExp(): void {
  if (!nAmt.value || nAmt.value <= 0 || !nDesc.value.trim()) return
  emit('add-expense', {
    desc: nDesc.value.trim(),
    amount: nAmt.value,
    cat: nCat.value,
    payMethod: nPayMethod.value,
    currency: 'VND',
    date: nDate.value,
    time: getCurrentTime(),
  })
  nAmt.value = null
  nDesc.value = ''
  nDate.value = getCurrentDate()
}

function addInc(): void {
  if (!iAmt.value || iAmt.value <= 0 || !iDesc.value.trim()) return
  emit('add-income', {
    desc: iDesc.value.trim(),
    amount: iAmt.value,
    cat: iCat.value,
    currency: 'VND',
    date: iDate.value,
    time: getCurrentTime(),
  })
  iAmt.value = null
  iDesc.value = ''
  iDate.value = getCurrentDate()
}
</script>

<style scoped>
/* ─── ROOT ──────────────────────────────────────────────────────────────── */
.add-tx {
  display: flex; flex-direction: column;
}

/* ─── ADD TOGGLE ──────────────────────────────────────────────────────── */
.add-toggle {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 5px;
  margin-top: 14px;
}
.add-toggle__btn {
  padding: 10px;
  border: none; background: transparent;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 12px; color: var(--muted);
  cursor: pointer;
  letter-spacing: 0.04em;
  border-radius: 3px;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.add-toggle__btn.active.exp {
  background: rgba(var(--crimson-rgb), 0.15);
  color: var(--crimson);
}
.add-toggle__btn.active.inc {
  background: rgba(var(--jade-rgb), 0.15);
  color: var(--jade);
}

/* ─── AMT DISPLAY ─────────────────────────────────────────────────────── */
.amt-display {
  margin-top: 14px;
  padding: 26px 14px 22px;
  text-align: center;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(var(--gold-rgb), 0.1) 0%, transparent 60%),
    linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px solid var(--line-2);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.amt-display::before {
  content: ''; position: absolute;
  top: -20px; left: 50%; transform: translateX(-50%);
  width: 80px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.amt-display__lab {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 11px; color: var(--gold);
  letter-spacing: 0.18em;
}
.amt-display__num {
  font-family: var(--mono); font-weight: 700;
  font-size: 38px; line-height: 1;
  letter-spacing: -0.04em;
  margin-top: 12px;
  display: flex; align-items: baseline; justify-content: center; gap: 4px;
}
.amt-display__num.exp {
  color: var(--crimson);
  text-shadow: 0 0 18px rgba(var(--crimson-rgb), 0.4);
}
.amt-display__num.inc {
  color: var(--jade);
  text-shadow: 0 0 18px rgba(var(--jade-rgb), 0.4);
}
.amt-display__num .cu {
  font-size: 16px; color: var(--muted);
}
.amt-display__input {
  background: transparent; border: none; outline: none;
  color: inherit;
  font-family: inherit; font-size: inherit; font-weight: inherit;
  letter-spacing: inherit;
  text-align: center;
  width: 100%; max-width: 260px;
  padding: 0;
  -moz-appearance: textfield;
}
.amt-display__input::-webkit-outer-spin-button,
.amt-display__input::-webkit-inner-spin-button {
  -webkit-appearance: none; margin: 0;
}
.amt-display__input::placeholder {
  color: rgba(var(--text-rgb), 0.15);
}

.crit-tag {
  position: absolute; top: 12px; right: 14px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 10px; color: var(--ink);
  padding: 3px 9px;
  background: linear-gradient(90deg, var(--vermillion), #ff8a4c);
  border-radius: 12px;
  letter-spacing: 0.1em;
  animation: pulse-crit 1.5s ease-in-out infinite;
}
@keyframes pulse-crit {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
  .crit-tag { animation: none; }
}

/* ─── QA ROW · 4 preset buttons ─────────────────────────────────────────── */
.qa-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  margin-top: 12px;
}
.qa-btn {
  padding: 9px 4px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 4px;
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.qa-btn:active {
  transform: translateY(1px);
  border-color: var(--gold);
}

/* ─── CAT GRID ──────────────────────────────────────────────────────── */
.cat-section-h {
  margin: 18px 2px 8px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 12px; color: var(--gold);
  letter-spacing: 0.05em;
}
.cat-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  margin-top: 4px;
}
.cat {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 11px 4px 9px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.cat.active {
  background: rgba(var(--gold-rgb), 0.1);
  border-color: var(--gold);
  color: var(--gold);
  box-shadow: 0 0 12px rgba(var(--gold-rgb), 0.15);
}
.cat__lb {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 10px; line-height: 1;
  letter-spacing: 0.04em;
  text-align: center;
}

/* ─── FIELD · note + date + payMethod ────────────────────────────────── */
.field {
  width: 100%; padding: 11px 13px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--text); outline: none;
  font-family: var(--serif-vn); font-size: 12px;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.field:focus { border-color: var(--gold); }
.field--note { margin-top: 12px; }

select.field {
  appearance: none; -webkit-appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%),
                    linear-gradient(135deg, var(--muted) 50%, transparent 50%);
  background-position: calc(100% - 14px) 17px, calc(100% - 9px) 17px;
  background-size: 5px 5px;
  background-repeat: no-repeat;
  padding-right: 28px;
}

.field-row {
  display: grid; gap: 8px; margin-top: 10px;
}
.field-row--1 { grid-template-columns: 1fr; }
.field-row--2 { grid-template-columns: 1fr 1fr; }

/* ─── ATTACK BTN ──────────────────────────────────────────────────── */
.attack-btn {
  width: 100%; margin-top: 16px;
  padding: 17px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.18em;
  background: linear-gradient(180deg, var(--gold-2) 0%, var(--gold) 50%, var(--gold-3) 100%);
  color: var(--ink);
  border: none; border-radius: 5px;
  cursor: pointer; position: relative;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 4px 16px rgba(var(--gold-rgb), 0.4),
    0 0 24px rgba(var(--gold-rgb), 0.2);
  overflow: hidden;
  transition: transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.attack-btn:active {
  transform: translateY(1px);
}
.attack-btn:disabled {
  opacity: 0.4; cursor: not-allowed;
  transform: none;
}
.attack-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  background-size: 200% 100%;
  animation: shimmer-btn 3s linear infinite;
  pointer-events: none;
}
@keyframes shimmer-btn {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .attack-btn::before { animation: none; }
}
</style>
