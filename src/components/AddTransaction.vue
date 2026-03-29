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
        <input class="inp" v-model="nDesc" :placeholder="$t('addTx.expense.descPlaceholder')" />
        <div class="form-row" style="gap:6px">
          <select class="cat-sel" style="flex:1" v-model="nCat">
            <option v-for="c in expenseCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
          <select class="cat-sel" style="flex:1" v-model="nPayMethod">
            <option v-for="m in payMethods" :key="m.key" :value="m.key">{{ m.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <div class="inp-amount-wrap">
            <input class="inp inp-amount" v-model.number="nAmt" type="number" inputmode="numeric" :placeholder="$t('addTx.expense.amountPlaceholder')" />
            <div v-if="topExpAmounts.length" class="quick-amounts">
              <button
                v-for="a in topExpAmounts"
                :key="a.value"
                class="quick-amt-btn"
                @click="nAmt = a.value"
              >{{ a.label }}</button>
            </div>
          </div>
        </div>
        <button class="btn-add" @click="addExp" :disabled="syncing || !nDesc.trim() || !nAmt">
          {{ syncing ? $t('addTx.saving') : $t('addTx.add') }} <Icon name="arrow-right" :size="14" />
        </button>
      </div>
    </div>

    <!-- THU -->
    <div v-if="txType === 'inc'">
      <div class="c-title" style="margin-bottom:10px">{{ $t('addTx.income.title') }}</div>
      <div class="add-form">
        <input class="inp" v-model="iDesc" :placeholder="$t('addTx.income.descPlaceholder')" />
        <div class="form-row">
          <div class="inp-amount-wrap">
            <input class="inp inp-amount" v-model.number="iAmt" type="number" inputmode="numeric" placeholder="Số tiền (VNĐ)" />
            <div v-if="topIncAmounts.length" class="quick-amounts">
              <button
                v-for="a in topIncAmounts"
                :key="a.value"
                class="quick-amt-btn"
                @click="iAmt = a.value"
              >{{ a.label }}</button>
            </div>
          </div>
          <select class="cat-sel" v-model="iCat">
            <option v-for="c in incomeCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </div>
        <button class="btn-add" style="background:var(--accent3);color:var(--bg)" @click="addInc" :disabled="syncing || !iDesc.trim() || !iAmt">
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
