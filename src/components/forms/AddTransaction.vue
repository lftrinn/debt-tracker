<template>
  <div class="card">
    <!-- Chi / Thu toggle -->
    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:9px;padding:3px;margin-bottom:14px;">
      <button :class="['tab-btn', txType === 'exp' ? 'active' : '']" style="flex:1;font-size:11px" @click="txType = 'exp'">
        <Icon name="minus" :size="12" /> {{ $t('addTx.tabs.expense') }}
      </button>
      <button :class="['tab-btn', txType === 'inc' ? 'active' : '']" style="flex:1;font-size:11px" @click="txType = 'inc'">
        <Icon name="plus" :size="12" /> {{ $t('addTx.tabs.income') }}
      </button>
    </div>

    <!-- CHI -->
    <div v-if="txType === 'exp'">
      <div class="c-title" style="margin-bottom:10px">{{ $t('addTx.expense.title') }}</div>
      <div class="add-form">
        <input class="add-form__input" v-model="nDesc" :placeholder="$t('addTx.expense.descPlaceholder')" />
        <div class="add-form__row" style="gap:6px">
          <select class="add-form__select" style="flex:1" v-model="nCat">
            <option v-for="c in expenseCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
          <select class="add-form__select" style="flex:1" v-model="nPayMethod">
            <option v-for="m in payMethods" :key="m.key" :value="m.key">{{ m.label }}</option>
          </select>
        </div>
        <!-- Số tiền + chọn currency; khi dual mode: 2 input cùng 1 hàng -->
        <div class="add-form__row" style="gap:6px">
          <!-- Dual mode: 2 inputs ngang nhau -->
          <div v-if="showExpEquiv" class="add-form__dual-inputs">
            <input class="add-form__input" v-model.number="nAmt" type="number" inputmode="numeric" :placeholder="nCurrency" @input="onExpAmtInput" />
            <span class="add-form__dual-sep">≈</span>
            <input class="add-form__input" v-model.number="nAmtDisplay" type="number" inputmode="numeric" :placeholder="'≈ ' + displayCurrency" @input="onExpDisplayInput" />
          </div>
          <!-- Normal mode: amount + quick amounts -->
          <div v-else class="add-form__amount-wrap">
            <input class="add-form__input add-form__amount" v-model.number="nAmt" type="number" inputmode="numeric" :placeholder="$t('addTx.expense.amountPlaceholder', { currency: nCurrency })" @input="onExpAmtInput" />
            <div v-if="topExpAmounts.length" class="add-form__quick-amounts">
              <button
                v-for="a in topExpAmounts"
                :key="a.value"
                class="add-form__quick-btn"
                @click="nAmt = a.value; onExpAmtInput()"
              >{{ a.label }}</button>
            </div>
          </div>
          <!-- Dropdown chọn đơn vị tiền -->
          <select class="add-form__select add-form__cur-select" v-model="nCurrency" @change="onExpCurChange">
            <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <!-- Note + Date/Time (optional) -->
        <textarea class="add-form__input add-form__note" v-model="nNote" :placeholder="$t('addTx.expense.notePlaceholder')" rows="2" />
        <div class="add-form__row" style="gap:6px">
          <input class="add-form__input" type="date" v-model="nDate" :max="todayStr" style="flex:1" />
          <input class="add-form__input add-form__time" type="time" v-model="nTime" style="flex:1" />
        </div>
        <button class="add-form__submit" @click="addExp" :disabled="syncing || !nDesc.trim() || !nAmt">
          {{ syncing ? $t('addTx.saving') : $t('addTx.add') }} <Icon name="arrow-right" :size="14" />
        </button>
      </div>
    </div>

    <!-- THU -->
    <div v-if="txType === 'inc'">
      <div class="c-title" style="margin-bottom:10px">{{ $t('addTx.income.title') }}</div>
      <div class="add-form">
        <input class="add-form__input" v-model="iDesc" :placeholder="$t('addTx.income.descPlaceholder')" />
        <!-- Số tiền + chọn currency; khi dual mode: 2 input cùng 1 hàng -->
        <div class="add-form__row" style="gap:6px">
          <!-- Dual mode: 2 inputs ngang nhau -->
          <div v-if="showIncEquiv" class="add-form__dual-inputs">
            <input class="add-form__input" v-model.number="iAmt" type="number" inputmode="numeric" :placeholder="iCurrency" @input="onIncAmtInput" />
            <span class="add-form__dual-sep">≈</span>
            <input class="add-form__input" v-model.number="iAmtDisplay" type="number" inputmode="numeric" :placeholder="'≈ ' + displayCurrency" @input="onIncDisplayInput" />
          </div>
          <!-- Normal mode: amount + quick amounts -->
          <div v-else class="add-form__amount-wrap">
            <input class="add-form__input add-form__amount" v-model.number="iAmt" type="number" inputmode="numeric" :placeholder="$t('addTx.income.amountPlaceholder', { currency: iCurrency })" @input="onIncAmtInput" />
            <div v-if="topIncAmounts.length" class="add-form__quick-amounts">
              <button
                v-for="a in topIncAmounts"
                :key="a.value"
                class="add-form__quick-btn"
                @click="iAmt = a.value; onIncAmtInput()"
              >{{ a.label }}</button>
            </div>
          </div>
          <!-- Dropdown chọn đơn vị tiền -->
          <select class="add-form__select add-form__cur-select" v-model="iCurrency" @change="onIncCurChange">
            <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="add-form__row" style="margin-top:0">
          <select class="add-form__select" style="flex:1" v-model="iCat">
            <option v-for="c in incomeCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </div>
        <!-- Note + Date/Time (optional) -->
        <textarea class="add-form__input add-form__note" v-model="iNote" :placeholder="$t('addTx.income.notePlaceholder')" rows="2" />
        <div class="add-form__row" style="gap:6px">
          <input class="add-form__input" type="date" v-model="iDate" :max="todayStr" style="flex:1" />
          <input class="add-form__input add-form__time" type="time" v-model="iTime" style="flex:1" />
        </div>
        <button class="add-form__submit" style="background:var(--accent3);color:var(--bg)" @click="addInc" :disabled="syncing || !iDesc.trim() || !iAmt">
          {{ syncing ? $t('addTx.saving') : $t('addTx.add') }} <Icon name="arrow-right" :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useCategories } from '../../composables/data/useCategories'
import { useCurrency, CURRENCIES } from '../../composables/api/useCurrency'

const { t } = useI18n()
const { expenseCategories, incomeCategories } = useCategories()
const { displayCurrency, baseCurrency, convertBetween, ratesLoading, fCurrNative } = useCurrency()

const props = defineProps({
  syncing: Boolean,
  expenses: { type: Array, default: () => [] },
  incomes: { type: Array, default: () => [] },
  creditCards: { type: Array, default: () => [] },
  prefill: { type: Object, default: null },
})

const emit = defineEmits(['add-expense', 'add-income', 'prefill-consumed'])

// ─── State chi tiêu ───────────────────────────────────────────────────────
const txType = ref('exp')
const nDesc = ref('')
const nAmt = ref(null)
const nCat = ref('an')
const nPayMethod = ref('cash')
const nCurrency = ref(displayCurrency.value)
const nAmtDisplay = ref(null) // tương đương theo displayCurrency
const nNote = ref('')
const nTime = ref(getCurrentTime())
const nDate = ref(getCurrentDate())

// ─── State thu nhập ───────────────────────────────────────────────────────
const iDesc = ref('')
const iAmt = ref(null)
const iCat = ref('luong')
const iCurrency = ref(displayCurrency.value)
const iAmtDisplay = ref(null)
const iNote = ref('')
const iTime = ref(getCurrentTime())
const iDate = ref(getCurrentDate())

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function getCurrentDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const todayStr = getCurrentDate()

// ─── Sync currency dropdown khi display currency thay đổi ─────────────────
watch(displayCurrency, (newCur) => {
  nCurrency.value = newCur
  iCurrency.value = newCur
  nAmtDisplay.value = null
  iAmtDisplay.value = null
})

// ─── Hiện dual input khi txCurrency khác displayCurrency và đã có rates ──
const hasRates = computed(() => !ratesLoading.value)
const showExpEquiv = computed(() => nCurrency.value !== displayCurrency.value && hasRates.value)
const showIncEquiv = computed(() => iCurrency.value !== displayCurrency.value && hasRates.value)

// ─── Flag tránh vòng lặp watch khi sync hai chiều ─────────────────────────
let expUpdatingFromDisplay = false
let incUpdatingFromDisplay = false

/** Tính lại nAmtDisplay từ nAmt khi user nhập vào input gốc */
function onExpAmtInput() {
  if (expUpdatingFromDisplay) return
  if (nAmt.value != null && nCurrency.value !== displayCurrency.value) {
    nAmtDisplay.value = roundDisplay(convertBetween(nAmt.value, nCurrency.value, displayCurrency.value))
  } else {
    nAmtDisplay.value = null
  }
}

/** User nhập vào input display → tính ngược lại nAmt */
function onExpDisplayInput() {
  expUpdatingFromDisplay = true
  if (nAmtDisplay.value != null) {
    nAmt.value = roundNative(convertBetween(nAmtDisplay.value, displayCurrency.value, nCurrency.value))
  }
  nextTick(() => { expUpdatingFromDisplay = false })
}

/** Khi đổi currency dropdown → cập nhật lại display equiv */
function onExpCurChange() {
  onExpAmtInput()
}

function onIncAmtInput() {
  if (incUpdatingFromDisplay) return
  if (iAmt.value != null && iCurrency.value !== displayCurrency.value) {
    iAmtDisplay.value = roundDisplay(convertBetween(iAmt.value, iCurrency.value, displayCurrency.value))
  } else {
    iAmtDisplay.value = null
  }
}

function onIncDisplayInput() {
  incUpdatingFromDisplay = true
  if (iAmtDisplay.value != null) {
    iAmt.value = roundNative(convertBetween(iAmtDisplay.value, displayCurrency.value, iCurrency.value))
  }
  nextTick(() => { incUpdatingFromDisplay = false })
}

function onIncCurChange() {
  onIncAmtInput()
}

/** Làm tròn cho display currency (2 chữ số nếu USD, 0 nếu VND/JPY) */
function roundDisplay(v) {
  if (displayCurrency.value === 'USD') return Math.round(v * 100) / 100
  return Math.round(v)
}

/** Làm tròn cho native currency */
function roundNative(v) {
  const cur = nCurrency.value || iCurrency.value
  if (cur === 'USD') return Math.round(v * 100) / 100
  return Math.round(v)
}

// ─── Prefill ──────────────────────────────────────────────────────────────
watch(() => props.prefill, (data) => {
  if (!data) return
  if (data.type === 'inc') {
    txType.value = 'inc'
    iDesc.value = data.desc || ''
    iAmt.value = data.amount || null
    if (data.cat) iCat.value = data.cat
    iCurrency.value = data.currency || displayCurrency.value
    iNote.value = data.note || ''
    iTime.value = data.time || getCurrentTime()
    iDate.value = data.date || getCurrentDate()
  } else {
    txType.value = 'exp'
    nDesc.value = data.desc || ''
    nAmt.value = data.amount || null
    if (data.cat) nCat.value = data.cat
    nCurrency.value = data.currency || displayCurrency.value
    nNote.value = data.note || ''
    nTime.value = data.time || getCurrentTime()
    nDate.value = data.date || getCurrentDate()
  }
  emit('prefill-consumed')
}, { immediate: true })

/**
 * Lấy top 3 amount phổ biến nhất, chuyển đổi sang inputCurrency.
 * Giả sử amount trong data được lưu theo baseCurrency.
 * Nếu rates chưa load hoặc inputCurrency === baseCurrency thì dùng giá trị gốc.
 * @param items - Danh sách expense/income
 * @param inputCurrency - Currency đang dùng cho input hiện tại
 */
function getTopAmounts(items, inputCurrency) {
  if (!items.length) return []
  const freq = {}
  items.forEach((e) => {
    const a = e.amount
    if (a > 0) freq[a] = (freq[a] || 0) + 1
  })
  const entries = Object.entries(freq).map(([amt, count]) => ({
    value: Number(amt),
    count,
  }))
  entries.sort((a, b) => b.count - a.count || b.value - a.value)
  return entries.slice(0, 3).map((e) => {
    let displayVal = e.value
    // Chuyển đổi sang inputCurrency nếu khác baseCurrency và rates đã load
    if (inputCurrency !== baseCurrency.value && !ratesLoading.value) {
      const converted = convertBetween(e.value, baseCurrency.value, inputCurrency)
      displayVal = inputCurrency === 'USD'
        ? Math.round(converted * 100) / 100
        : Math.round(converted)
    }
    return {
      value: displayVal,
      label: fCurrNative(displayVal, inputCurrency),
    }
  })
}

const payMethods = computed(() => {
  const methods = [{ key: 'cash', label: t('addTx.payMethod.cash') }]
  ;(props.creditCards || []).forEach((c) => {
    const shortName = c.name.replace(' — Techcombank', '').replace(' — ', '')
    methods.push({ key: c.id, label: shortName })
  })
  return methods
})

const topExpAmounts = computed(() => getTopAmounts(props.expenses, nCurrency.value))
const topIncAmounts = computed(() => getTopAmounts(props.incomes, iCurrency.value))

function addExp() {
  if (!nAmt.value || nAmt.value <= 0 || !nDesc.value.trim()) return
  emit('add-expense', {
    desc: nDesc.value.trim(),
    amount: nAmt.value,
    cat: nCat.value,
    payMethod: nPayMethod.value,
    currency: nCurrency.value,
    date: nDate.value,
    ...(nNote.value.trim() ? { note: nNote.value.trim() } : {}),
    ...(nTime.value ? { time: nTime.value } : {}),
  })
  nDesc.value = ''
  nAmt.value = null
  nAmtDisplay.value = null
  nCurrency.value = displayCurrency.value
  nNote.value = ''
  nTime.value = getCurrentTime()
  nDate.value = getCurrentDate()
}

function addInc() {
  if (!iAmt.value || iAmt.value <= 0 || !iDesc.value.trim()) return
  emit('add-income', {
    desc: iDesc.value.trim(),
    amount: iAmt.value,
    cat: iCat.value,
    currency: iCurrency.value,
    date: iDate.value,
    ...(iNote.value.trim() ? { note: iNote.value.trim() } : {}),
    ...(iTime.value ? { time: iTime.value } : {}),
  })
  iDesc.value = ''
  iAmt.value = null
  iAmtDisplay.value = null
  iCurrency.value = displayCurrency.value
  iNote.value = ''
  iTime.value = getCurrentTime()
  iDate.value = getCurrentDate()
}
</script>

<style scoped>
.add-form { display: flex; flex-direction: column; gap: 8px; margin-top: 11px; }
.add-form__row { display: flex; gap: 7px; }
.add-form__input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; padding: 10px 11px; color: var(--text); font-family: var(--sans); font-size: 12px; outline: none; transition: border-color .2s; height: 38px; box-sizing: border-box; }
.add-form__input::placeholder { color: var(--muted); }
.add-form__input:focus { border-color: var(--accent); }
.add-form__select { background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; padding: 10px 8px; color: var(--text); font-family: var(--sans); font-size: 12px; outline: none; cursor: pointer; height: 38px; box-sizing: border-box; }
.add-form__cur-select { flex: 0 0 auto; font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--accent); padding: 10px 10px; min-width: 60px; }
.add-form__amount-wrap { flex: 1; position: relative; }
.add-form__amount { width: 100%; padding-right: 120px; box-sizing: border-box; }
.add-form__amount::placeholder { font-size: 10px; }
.add-form__quick-amounts { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: flex; gap: 4px; }
.add-form__quick-btn { background: rgba(var(--accent-rgb),.1); border: 1px solid rgba(var(--accent-rgb),.2); border-radius: 5px; padding: 3px 7px; font-family: var(--mono); font-size: 9px; font-weight: 700; color: var(--accent); cursor: pointer; transition: all .15s; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
.add-form__quick-btn:active { background: rgba(var(--accent-rgb),.25); transform: scale(.95); }
/* Dual input: 2 ô cùng 1 hàng khi currency khác nhau */
.add-form__dual-inputs { display: flex; gap: 6px; flex: 1; min-width: 0; align-items: center; }
.add-form__dual-inputs .add-form__input { flex: 1; min-width: 0; padding-right: 8px; }
.add-form__dual-sep { font-family: var(--mono); font-size: 10px; color: var(--muted); flex-shrink: 0; }
.add-form__submit { background: var(--accent); color: var(--bg); border: none; border-radius: 9px; padding: 11px; font-family: var(--sans); font-size: 13px; font-weight: 800; cursor: pointer; letter-spacing: .05em; transition: all .2s; }
.add-form__submit:active { opacity: .8; transform: scale(.98); }
.add-form__submit:disabled { opacity: .3; cursor: not-allowed; transform: none; }
.add-form__note { height: auto; min-height: 52px; resize: none; line-height: 1.4; }
.add-form__time { flex: 0 0 90px; font-family: var(--mono); font-size: 12px; color: var(--text); padding: 10px 8px; height: 38px; box-sizing: border-box; }
</style>
