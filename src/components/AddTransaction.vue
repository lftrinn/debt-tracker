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
        <div class="add-form__row">
          <div class="add-form__amount-wrap">
            <input class="add-form__input add-form__amount" v-model.number="nAmt" type="number" inputmode="numeric" :placeholder="$t('addTx.expense.amountPlaceholder')" />
            <div v-if="topExpAmounts.length" class="add-form__quick-amounts">
              <button
                v-for="a in topExpAmounts"
                :key="a.value"
                class="add-form__quick-btn"
                @click="nAmt = a.value"
              >{{ a.label }}</button>
            </div>
          </div>
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
        <div class="add-form__row">
          <div class="add-form__amount-wrap">
            <input class="add-form__input add-form__amount" v-model.number="iAmt" type="number" inputmode="numeric" placeholder="Số tiền (VNĐ)" />
            <div v-if="topIncAmounts.length" class="add-form__quick-amounts">
              <button
                v-for="a in topIncAmounts"
                :key="a.value"
                class="add-form__quick-btn"
                @click="iAmt = a.value"
              >{{ a.label }}</button>
            </div>
          </div>
          <select class="add-form__select" v-model="iCat">
            <option v-for="c in incomeCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </div>
        <button class="add-form__submit" style="background:var(--accent3);color:var(--bg)" @click="addInc" :disabled="syncing || !iDesc.trim() || !iAmt">
          {{ syncing ? $t('addTx.saving') : $t('addTx.add') }} <Icon name="arrow-right" :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './Icon.vue'
import { useCategories } from '../composables/useCategories'

const { t } = useI18n()
const { expenseCategories, incomeCategories } = useCategories()

const props = defineProps({
  syncing: Boolean,
  expenses: { type: Array, default: () => [] },
  incomes: { type: Array, default: () => [] },
  creditCards: { type: Array, default: () => [] },
  prefill: { type: Object, default: null },
})

const emit = defineEmits(['add-expense', 'add-income', 'prefill-consumed'])

const txType = ref('exp')
const nDesc = ref('')
const nAmt = ref(null)
const nCat = ref('an')
const nPayMethod = ref('cash')
const iDesc = ref('')
const iAmt = ref(null)
const iCat = ref('luong')

watch(() => props.prefill, (data) => {
  if (!data) return
  if (data.type === 'inc') {
    txType.value = 'inc'
    iDesc.value = data.desc || ''
    iAmt.value = data.amount || null
    if (data.cat) iCat.value = data.cat
  } else {
    txType.value = 'exp'
    nDesc.value = data.desc || ''
    nAmt.value = data.amount || null
    if (data.cat) nCat.value = data.cat
  }
  emit('prefill-consumed')
}, { immediate: true })

function fmtShort(v) {
  if (v >= 1000000000) {
    const n = v / 1000000000
    return n % 1 === 0 ? n + 'B' : n.toFixed(1).replace(/\.0$/, '') + 'B'
  }
  if (v >= 1000000) {
    const n = v / 1000000
    return n % 1 === 0 ? n + 'M' : n.toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (v >= 1000) {
    const n = v / 1000
    return n % 1 === 0 ? n + 'K' : n.toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return String(v)
}

function getTopAmounts(items) {
  if (!items.length) return []
  // Count frequency of each amount
  const freq = {}
  items.forEach((e) => {
    const a = e.amount
    if (a > 0) freq[a] = (freq[a] || 0) + 1
  })
  // Sort by frequency desc, then by most recent
  const entries = Object.entries(freq).map(([amt, count]) => ({
    value: Number(amt),
    count,
  }))
  entries.sort((a, b) => b.count - a.count || b.value - a.value)
  // Take top 3
  return entries.slice(0, 3).map((e) => ({
    value: e.value,
    label: fmtShort(e.value),
  }))
}

const payMethods = computed(() => {
  const methods = [{ key: 'cash', label: t('addTx.payMethod.cash') }]
  ;(props.creditCards || []).forEach((c) => {
    const shortName = c.name.replace(' — Techcombank', '').replace(' — ', '')
    methods.push({ key: c.id, label: shortName })
  })
  return methods
})

const topExpAmounts = computed(() => getTopAmounts(props.expenses))
const topIncAmounts = computed(() => getTopAmounts(props.incomes))

function addExp() {
  if (!nAmt.value || nAmt.value <= 0 || !nDesc.value.trim()) return
  emit('add-expense', { desc: nDesc.value.trim(), amount: nAmt.value, cat: nCat.value, payMethod: nPayMethod.value })
  nDesc.value = ''
  nAmt.value = null
}

function addInc() {
  if (!iAmt.value || iAmt.value <= 0 || !iDesc.value.trim()) return
  emit('add-income', { desc: iDesc.value.trim(), amount: iAmt.value, cat: iCat.value })
  iDesc.value = ''
  iAmt.value = null
}
</script>

<style scoped>
.add-form { display: flex; flex-direction: column; gap: 8px; margin-top: 11px; }
.add-form__row { display: flex; gap: 7px; }
.add-form__input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; padding: 10px 11px; color: var(--text); font-family: var(--sans); font-size: 12px; outline: none; transition: border-color .2s; }
.add-form__input::placeholder { color: var(--muted); }
.add-form__input:focus { border-color: var(--accent); }
.add-form__select { background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; padding: 10px 8px; color: var(--text); font-family: var(--sans); font-size: 12px; outline: none; cursor: pointer; }
.add-form__amount-wrap { flex: 1; position: relative; }
.add-form__amount { width: 100%; padding-right: 120px; box-sizing: border-box; }
.add-form__amount::placeholder { font-size: 10px; }
.add-form__quick-amounts { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: flex; gap: 4px; }
.add-form__quick-btn { background: rgba(var(--accent-rgb),.1); border: 1px solid rgba(var(--accent-rgb),.2); border-radius: 5px; padding: 3px 7px; font-family: var(--mono); font-size: 9px; font-weight: 700; color: var(--accent); cursor: pointer; transition: all .15s; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
.add-form__quick-btn:active { background: rgba(var(--accent-rgb),.25); transform: scale(.95); }
.add-form__submit { background: var(--accent); color: var(--bg); border: none; border-radius: 9px; padding: 11px; font-family: var(--sans); font-size: 13px; font-weight: 800; cursor: pointer; letter-spacing: .05em; transition: all .2s; }
.add-form__submit:hover { opacity: .9; transform: translateY(-1px); }
.add-form__submit:disabled { opacity: .3; cursor: not-allowed; transform: none; }
</style>
