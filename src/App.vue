<template>
  <!-- LOADING -->
  <LoadingScreen v-if="appState === 'loading'" :message="syncMsg" />

  <!-- ERROR POPUP -->
  <ErrorPopup
    v-if="appState === 'error'"
    :loading="loading"
    :error="sErr"
    @reconnect="reconnect"
    @dismiss="appState = 'ready'"
  />

  <!-- SETUP -->
  <SetupScreen
    v-if="appState === 'setup'"
    :loading="loading"
    :error="sErr"
    @setup="handleSetup"
  />

  <!-- MAIN -->
  <div v-if="appState === 'ready' || appState === 'error'">
    <AppHeader :today="today" :hideAmounts="hideAmounts" @reload="hardReload" @logout="logout" @toggle-hide="toggleHide" />

    <div class="wrap">
      <SyncBar :status="syncSt" :message="syncMsg" />

      <div v-if="isOver" class="alert over">⚠ Vượt hạn mức hôm nay +{{ hz('alert') ? '•••' : fV(todaySpent - dayLimit) }}</div>
      <div v-else-if="dayLimit > 0" class="alert ok">✓ Còn {{ hz('alert') ? '•••' : fV(dayLimit - todaySpent) }} hôm nay · hạn mức {{ hz('alert') ? '•••' : fV(dayLimit) }}</div>


      <CashHero
        :availCash="availCash"
        :dToSalary="dToSalary"
        :todaySpent="todaySpent"
        :monthSpent="monthSpent"
        :isOver="isOver"
        :cashAnimKey="cashAnimKey"
        :spentAnimKey="spentAnimKey"
        :hide="{ balance: hz('cash.balance'), todaySpent: hz('cash.todaySpent'), monthSpent: hz('cash.monthSpent') }"
      />

      <DebtOverview
        :totalDebt="totalDebt"
        :debtCards="debtCards"
        :debtAnimKey="debtAnimKey"
        :hide="{ total: hz('debt.total'), cardBal: hz('debt.cardBal'), minPay: hz('debt.minPay') }"
      />

      <ProgressSection
        :repayPct="repayPct"
        :origDebt="origDebt"
        :totalDebt="totalDebt"
        :hide="{ origDebt: hz('progress.origDebt'), remaining: hz('progress.remaining') }"
      />

      <UpcomingPayments
        :items="upcoming"
        :label="upcomingLabel"
        :availCash="availCash"
        :editingKey="editingKey"
        :editBuf="editBuf"
        :hide="{ amount: hz('upcoming.amount'), shortage: hz('upcoming.shortage') }"
        @start-edit="startEdit"
        @save-edit="saveEdit"
        @cancel-edit="editingKey = null"
        @delete="deleteUpcoming"
        @toggle-paid="togglePaid"
      />

      <!-- Tabs -->
      <div class="tab-nav">
        <button class="tab-btn" :class="{ active: tab === 'add' }" @click="tab = 'add'">+ Thêm</button>
        <button class="tab-btn" :class="{ active: tab === 'list' }" @click="tab = 'list'">Lịch sử</button>
        <button class="tab-btn" :class="{ active: tab === 'chart' }" @click="tab = 'chart'">Biểu đồ</button>
        <button class="tab-btn" :class="{ active: tab === 'tl' }" @click="tab = 'tl'">Timeline</button>
        <button class="tab-btn" :class="{ active: tab === 'cfg' }" @click="tab = 'cfg'">Cài đặt</button>
      </div>

      <!-- Tab content -->
      <AddTransaction
        v-if="tab === 'add'"
        :syncing="syncing"
        @add-expense="addExp"
        @add-income="addInc"
      />

      <TransactionList
        v-if="tab === 'list'"
        :transactions="sortedTx"
        :hide="hz('transactions')"
        @delete="deleteTx"
      />

      <ChartsPanel
        v-if="tab === 'chart'"
        :expenses="expenses"
        :incomes="incomes"
        :debtBreakdown="debtBreakdown"
        :projectedDebt="d.payoff_timeline?.projected_debt_by_month || []"
        :hide="{ spend: hz('charts.spend'), debtLine: hz('charts.debtLine'), pie: hz('charts.pie') }"
      />

      <TimelinePanel v-if="tab === 'tl'" :milestones="milestones" :hide="{ debt: hz('timeline.debt'), eventAmt: hz('timeline.eventAmt') }" />

      <SettingsPanel
        v-if="tab === 'cfg'"
        ref="settingsRef"
        :creditCards="d.debts?.credit_cards || []"
        :debtCards="debtCards"
        :smallLoans="smallLoans"
        :dayLimit="dayLimit"
        :todaySpent="todaySpent"
        :limPct="limPct"
        :limSt="limSt"
        :cashBalance="d.current_cash?.balance || 0"
        :cashReserved="d.current_cash?.reserved || 0"
        :rules="d.rules?.must_not || []"
        :syncMsg="syncMsg"
        :syncing="syncing"
        :importErr="importErr"
        :hide="{ cardInfo: hz('settings.cardInfo'), dailyLim: hz('settings.dailyLim'), dropdown: hz('settings.dropdown'), cashInfo: hz('settings.cashInfo') }"
        :hideZones="hideZones"
        @update-card="updateCard"
        @update-limit="updLimit"
        @record-payment="recPay"
        @add-cash="addCash"
        @add-one-time="addOneTime"
        @import-json="importNewJson"
        @set-hide-zone="({ key, val }) => setHideZone(key, val)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useApi } from './composables/useApi'
import { useFormatters } from './composables/useFormatters'
import { useDebtData } from './composables/useDebtData'

import LoadingScreen from './components/LoadingScreen.vue'
import ErrorPopup from './components/ErrorPopup.vue'
import SetupScreen from './components/SetupScreen.vue'
import AppHeader from './components/AppHeader.vue'
import SyncBar from './components/SyncBar.vue'
import CashHero from './components/CashHero.vue'
import DebtOverview from './components/DebtOverview.vue'
import ProgressSection from './components/ProgressSection.vue'
import UpcomingPayments from './components/UpcomingPayments.vue'
import AddTransaction from './components/AddTransaction.vue'
import TransactionList from './components/TransactionList.vue'
import ChartsPanel from './components/ChartsPanel.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'

// --- API ---
const api = useApi()
const { syncSt, syncMsg, syncing, isConfigured } = api

// --- Formatters ---
const { fN, fS, fV, tStr } = useFormatters()

// --- State ---
const appState = ref(isConfigured.value ? 'loading' : 'setup')
const loading = ref(false)
const sErr = ref('')
const tab = ref('add')
const importErr = ref('')
const settingsRef = ref(null)
const hideAmounts = ref(localStorage.getItem('dt_hide') !== '0')
function toggleHide() {
  hideAmounts.value = !hideAmounts.value
  localStorage.setItem('dt_hide', hideAmounts.value ? '1' : '0')
}

const HIDE_ZONE_DEFAULTS = {
  'alert': true,
  'cash.balance': true, 'cash.todaySpent': true, 'cash.monthSpent': true,
  'debt.total': true, 'debt.cardBal': true, 'debt.minPay': true,
  'progress.origDebt': true, 'progress.remaining': true,
  'upcoming.amount': true, 'upcoming.shortage': true,
  'transactions': true,
  'charts.spend': true, 'charts.debtLine': true, 'charts.pie': true,
  'timeline.debt': true, 'timeline.eventAmt': true,
  'settings.cardInfo': true, 'settings.dailyLim': true, 'settings.dropdown': true, 'settings.cashInfo': true,
}
const hideZones = ref({ ...HIDE_ZONE_DEFAULTS, ...JSON.parse(localStorage.getItem('dt_hz') || '{}') })
function setHideZone(key, val) {
  hideZones.value = { ...hideZones.value, [key]: val }
  localStorage.setItem('dt_hz', JSON.stringify(hideZones.value))
}
function hz(k) { return hideAmounts.value && hideZones.value[k] }

const d = ref({
  expenses: [],
  extra_paid: 0,
  custom_daily_limit: 0,
  current_cash: { balance: 865000, reserved: 500000, as_of: '2026-03-27' },
  debts: {
    credit_cards: [
      { id: 'visa1', name: 'Visa 1', credit_limit: 37000000, balance: 34946713, interest_rate_annual: 0.328, minimum_payment: 2663422 },
      { id: 'visa2', name: 'Visa 2', credit_limit: 53000000, balance: 49299000, interest_rate_annual: 0.358, minimum_payment: 4107271 },
    ],
    small_loans: [],
  },
  income: { monthly_net: 22923000, pay_date: 5 },
  rules: { daily_limit: { until_salary: 70000, after_salary: 100000 }, must_not: [] },
  payoff_timeline: { projected_debt_by_month: [] },
  fixed_expenses: {},
})

// --- Computed debt data ---
const {
  expenses, incomes, sortedTx, today, dToSalary, dayLimit,
  todaySpent, monthSpent, availCash, isOver, limPct, limSt,
  debtCards, smallLoans, totalDebt, origDebt, repayPct,
  debtBreakdown, upcomingLabel, upcoming, milestones, findDebtId,
} = useDebtData(d)

// --- Animation keys ---
const cashAnimKey = ref(0)
const spentAnimKey = ref(0)
const debtAnimKey = ref(0)
const editingKey = ref(null)
const editBuf = ref({ name: '', date: '', amt: null })

watch(availCash, () => { cashAnimKey.value++ })
watch(todaySpent, () => { spentAnimKey.value++ })
watch(totalDebt, () => { debtAnimKey.value++ })

// --- Sync helpers ---
async function pushData() {
  await api.push(d.value)
}

async function pullData() {
  try {
    d.value = await api.pull()
    appState.value = 'ready'
  } catch {
    syncSt.value = 'error'
    syncMsg.value = 'Không tải được'
    appState.value = d.value.debts ? 'error' : 'setup'
  }
}

// --- Setup ---
async function handleSetup(opts) {
  loading.value = true
  sErr.value = ''
  try {
    let data
    if (opts.mode === 'import') {
      try { data = JSON.parse(opts.json) } catch { throw new Error('JSON không hợp lệ') }
      if (!data.expenses) data.expenses = []
      if (data.extra_paid == null) data.extra_paid = 0
      if (data.custom_daily_limit == null) data.custom_daily_limit = 0
    } else if (opts.mode === 'new') {
      data = {
        expenses: [], extra_paid: 0, custom_daily_limit: opts.limit || 0,
        debts: { summary: { total: opts.debt || 0 }, credit_cards: [], small_loans: [] },
        income: { monthly_net: 22923000, pay_date: 5 },
        rules: { daily_limit: { until_salary: 70000, after_salary: 100000 }, must_not: [] },
        current_cash: { balance: 0, reserved: 0 },
        payoff_timeline: { projected_debt_by_month: [] },
      }
    } else {
      // existing
      api.saveCredentials(opts.key, opts.binId)
      await pullData()
      return
    }
    const id = await api.createBin(data, opts.key)
    api.saveCredentials(opts.key, id)
    d.value = data
    appState.value = 'ready'
  } catch (e) {
    sErr.value = e.message || 'Lỗi kết nối'
  } finally {
    loading.value = false
  }
}

async function reconnect({ key, binId }) {
  if (!key || !binId) return
  loading.value = true
  sErr.value = ''
  try {
    api.saveCredentials(key, binId)
    await pullData()
  } catch (e) {
    sErr.value = e.message || 'Lỗi kết nối'
    appState.value = 'error'
  } finally {
    loading.value = false
  }
}

function hardReload() {
  const url = new URL(window.location.href)
  url.searchParams.set('v', Date.now())
  window.location.replace(url.toString())
}

function logout() {
  if (!confirm('Đăng xuất? Dữ liệu vẫn còn trên JSONBin.')) return
  api.clearCredentials()
  appState.value = 'setup'
}

// --- Actions ---
async function addExp({ desc, amount, cat }) {
  const e = { id: Date.now(), desc, amount, cat, date: tStr() }
  d.value = { ...d.value, expenses: [e, ...(d.value.expenses || [])] }
  await pushData()
}

async function addInc({ desc, amount, cat }) {
  const e = { id: Date.now(), desc, amount, cat, date: tStr() }
  d.value = { ...d.value, incomes: [e, ...(d.value.incomes || [])] }
  d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amount } }
  await pushData()
}

async function deleteTx(e) {
  if (e.type === 'inc') {
    const inc = incomes.value.find((i) => i.id === e.id)
    d.value = { ...d.value, incomes: d.value.incomes.filter((i) => i.id !== e.id) }
    if (inc) d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: Math.max(0, (d.value.current_cash?.balance || 0) - inc.amount) } }
  } else {
    d.value = { ...d.value, expenses: d.value.expenses.filter((i) => i.id !== e.id) }
  }
  await pushData()
}

async function updLimit(val) {
  if (val > 0) {
    d.value.custom_daily_limit = val
    await pushData()
  }
}

async function recPay({ target, amount }) {
  if (!amount || amount <= 0 || !target) return
  const [type, id] = target.split(':')
  const nd = { ...d.value }
  if (type === 'cc') {
    nd.debts = { ...nd.debts, credit_cards: nd.debts.credit_cards.map((c) => c.id === id ? { ...c, balance: Math.max(0, c.balance - amount) } : c) }
  } else {
    nd.debts = { ...nd.debts, small_loans: nd.debts.small_loans.map((l) => l.id === id ? { ...l, remaining_balance: Math.max(0, (l.remaining_balance || 0) - amount) } : l) }
  }
  d.value = nd
  await pushData()
}

async function addCash({ amount }) {
  if (!amount || amount <= 0) return
  d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amount, as_of: tStr() } }
  await pushData()
}

async function addOneTime({ name, date, amount }) {
  if (!name || !date || !amount) return
  const ev = { id: Date.now(), name, date, amount }
  d.value = { ...d.value, one_time_expenses: [...(d.value.one_time_expenses || []), ev] }
  await pushData()
}

async function updateCard(cardId) {
  const ccUpdate = settingsRef.value?.ccUpdate || {}
  const newBal = ccUpdate[cardId + ':balance']
  const newMin = ccUpdate[cardId + ':min']
  d.value = {
    ...d.value,
    debts: {
      ...d.value.debts,
      credit_cards: d.value.debts.credit_cards.map((c) => {
        if (c.id !== cardId) return c
        return {
          ...c,
          ...(newBal != null ? { balance: newBal } : {}),
          ...(newMin != null ? { minimum_payment: newMin } : {}),
        }
      }),
    },
  }
  delete ccUpdate[cardId + ':balance']
  delete ccUpdate[cardId + ':min']
  await pushData()
}

// --- Upcoming edit/pay ---
function startEdit(p) {
  editingKey.value = p._key
  editBuf.value = { name: p.name, date: p._date, amt: p.amt, _p: p }
}

async function saveEdit(p) {
  const buf = editBuf.value
  if (!buf.name || !buf.date || !buf.amt) return
  const nd = { ...d.value }
  if (p.source === 'one_time') {
    nd.one_time_expenses = (nd.one_time_expenses || []).map((e) =>
      e.id === p._id ? { ...e, name: buf.name, date: buf.date, amount: buf.amt } : e
    )
  } else {
    const mo = p._mo
    if (nd.monthly_plans?.[mo]?.obligations) {
      nd.monthly_plans = {
        ...nd.monthly_plans,
        [mo]: {
          ...nd.monthly_plans[mo],
          obligations: nd.monthly_plans[mo].obligations.map((ob) => {
            const k = (ob.date || '') + ':' + (ob.name || '')
            if (k !== p._key) return ob
            return { ...ob, name: buf.name, date: buf.date, amount: buf.amt }
          }),
        },
      }
    }
  }
  const oldKey = p._key
  const newKey = buf.date + ':' + buf.name
  if (oldKey !== newKey) {
    const paid = new Set(nd.paid_obligations || [])
    if (paid.has(oldKey)) { paid.delete(oldKey); paid.add(newKey) }
    nd.paid_obligations = [...paid]
  }
  d.value = nd
  editingKey.value = null
  await pushData()
}

async function deleteUpcoming(p) {
  if (p.source !== 'one_time') return
  d.value = { ...d.value, one_time_expenses: (d.value.one_time_expenses || []).filter((e) => e.id !== p._id) }
  editingKey.value = null
  await pushData()
}

async function togglePaid(key, amt, obName) {
  const paid = new Set(d.value.paid_obligations || [])
  const nd = {
    ...d.value,
    debts: {
      ...d.value.debts,
      credit_cards: [...(d.value.debts?.credit_cards || [])],
      small_loans: [...(d.value.debts?.small_loans || [])],
    },
  }
  const debtRef = obName ? findDebtId(obName) : null

  if (paid.has(key)) {
    paid.delete(key)
    nd.current_cash = { ...nd.current_cash, balance: (nd.current_cash?.balance || 0) + amt }
    if (debtRef) {
      if (debtRef.type === 'cc') {
        nd.debts.credit_cards = nd.debts.credit_cards.map((c) =>
          c.id === debtRef.id ? { ...c, balance: (c.balance || 0) + amt } : c
        )
      } else {
        nd.debts.small_loans = nd.debts.small_loans.map((l) =>
          l.id === debtRef.id ? { ...l, remaining_balance: (l.remaining_balance || 0) + amt } : l
        )
      }
    }
  } else {
    paid.add(key)
    nd.current_cash = { ...nd.current_cash, balance: Math.max(0, (nd.current_cash?.balance || 0) - amt) }
    if (debtRef) {
      if (debtRef.type === 'cc') {
        nd.debts.credit_cards = nd.debts.credit_cards.map((c) =>
          c.id === debtRef.id ? { ...c, balance: Math.max(0, (c.balance || 0) - amt) } : c
        )
      } else {
        nd.debts.small_loans = nd.debts.small_loans.map((l) =>
          l.id === debtRef.id ? { ...l, remaining_balance: Math.max(0, (l.remaining_balance || 0) - amt) } : l
        )
      }
    }
  }
  nd.paid_obligations = [...paid]
  d.value = nd
  await pushData()
}

async function importNewJson(jsonStr) {
  if (!jsonStr) return
  importErr.value = ''
  try {
    const parsed = JSON.parse(jsonStr)
    const merged = {
      ...parsed,
      expenses: d.value.expenses || [],
      incomes: d.value.incomes || [],
      paid_obligations: d.value.paid_obligations || [],
      one_time_expenses: d.value.one_time_expenses || [],
      custom_daily_limit: d.value.custom_daily_limit || 0,
      current_cash: parsed.current_cash || d.value.current_cash,
    }
    d.value = merged
    await pushData()
  } catch (e) {
    importErr.value =
      e.message === 'Unexpected token' || e.message?.includes('JSON')
        ? 'JSON không hợp lệ — kiểm tra lại cú pháp'
        : e.message || 'Lỗi không xác định'
  }
}

// --- Init ---
if (isConfigured.value) pullData()
</script>
