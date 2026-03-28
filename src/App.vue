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

  <!-- TOAST -->
  <ToastMessage :message="toastMsg" :type="toastType" :trigger="toastTrigger" />

  <!-- DETAIL POPUP -->
  <DetailPopup
    :item="popupItem"
    :availCash="availCash"
    :hide="!!hz('upcoming.amount')"
    :debtCards="debtCards"
    @close="popupItem = null"
    @toggle-paid="(k, a, n) => { popupItem = null; togglePaid(k, a, n) }"
    @save-upcoming="handlePopupSaveUpcoming"
    @save-tx="handlePopupSaveTx"
    @delete="handlePopupDelete"
    @clone-item="handleCopy"
  />

  <!-- MAIN -->
  <div v-if="appState === 'ready' || appState === 'error'">
    <AppHeader :today="today" :hideAmounts="hideAmounts" :scrolled="syncBarScrolled" :syncStatus="syncSt" :syncMsg="syncMsg" :syncTime="syncTime" :limSt="limSt" :limBlink="limBlink" :overBanner="overBanner" :overMsg="overMsg" :cashDaysLeft="cashDaysLeft" :dToSalary="dToSalary" @reload="hardReload" @logout="logout" @toggle-hide="toggleHide" @scroll-alert="scrollToAlert" @dismiss-over="dismissOverBanner" />

    <div class="wrap">
      <SyncBar ref="syncBarRef" :status="syncSt" :message="syncMsg" :syncTime="syncTime" :today="today" />

      <div ref="alertRef" v-if="isOver" class="alert over"><Icon name="alert-triangle" :size="14" /> Vượt hạn mức +{{ hz('alert') ? '•••' : fV(todaySpent - dayLimit) }}</div>
      <div ref="alertRef" v-else-if="dayLimit > 0" class="alert ok">
        <Icon name="check" :size="14" />
        <span class="alert-main">Còn {{ hz('alert') ? '•••' : fS(dayLimit - todaySpent) }} · mức {{ hz('alert') ? '•••' : fS(dayLimit) }}/ngày</span>
        <span v-if="cashDaysLeft !== null && cashDaysLeft < dToSalary" class="alert-badge-warn">{{ hz('alert') ? '•/•' : cashDaysLeft + '/' + dToSalary }} ngày</span>
      </div>


      <CashHero
        :availCash="availCash"
        :dToSalary="dToSalary"
        :todaySpent="todayOutflow"
        :monthSpent="monthSpent"
        :isOver="isOver"
        :cashTrend="cashTrend"
        :cashAnimKey="cashAnimKey"
        :spentAnimKey="spentAnimKey"
        :hide="{ balance: hz('cash.balance'), todaySpent: hz('cash.todaySpent'), monthSpent: hz('cash.monthSpent') }"
      />

      <DebtOverview
        :totalDebt="totalDebt"
        :debtCards="debtCards"
        :debtTrend="debtTrend"
        :debtAnimKey="debtAnimKey"
        :hide="{ total: hz('debt.total'), cardBal: hz('debt.cardBal'), minPay: hz('debt.minPay') }"
        @update-card="updateCardDirect"
      />

      <ProgressSection
        :repayPct="repayPct"
        :origDebt="origDebt"
        :totalDebt="totalDebt"
        :hide="{ origDebt: hz('progress.origDebt'), remaining: hz('progress.remaining') }"
      />

      <UpcomingPayments
        ref="upcomingRef"
        :items="upcoming"
        :label="upcomingLabel"
        :availCash="availCash"
        :debtCards="debtCards"
        :smallLoans="smallLoans"
        :monthlyPlans="d.monthly_plans || {}"
        :paidObligations="d.paid_obligations || []"
        :oneTimeExpenses="d.one_time_expenses || []"
        :hide="{ amount: hz('upcoming.amount'), shortage: hz('upcoming.shortage') }"
        @open-detail="openDetail($event, 'upcoming')"
        @toggle-paid="togglePaid"
        @record-payment="recPay"
        @add-one-time="addOneTime"
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
        :expenses="expenses"
        :incomes="incomes"
        :creditCards="d.debts?.credit_cards || []"
        :prefill="copyTxData"
        @add-expense="addExp"
        @add-income="addInc"
        @prefill-consumed="copyTxData = null"
      />

      <TransactionList
        v-if="tab === 'list'"
        :transactions="sortedTx"
        :hide="hz('transactions')"
        :txTrend="txTrend"
        :todaySpent="todayOutflow"
        :todayIncome="todayIncome"
        @open-detail="openDetail($event, 'tx')"
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
        :dayLimit="dayLimit"
        :todaySpent="todaySpent"
        :limPct="limPct"
        :limSt="limSt"
        :rules="d.rules?.must_not || []"
        :syncMsg="syncMsg"
        :syncTime="syncTime"
        :syncing="syncing"
        :importErr="importErr"
        :hide="{ cardInfo: hz('settings.cardInfo'), dailyLim: hz('settings.dailyLim'), dropdown: hz('settings.dropdown'), cashInfo: hz('settings.cashInfo') }"
        :hideZones="hideZones"
        @update-limit="updLimit"
        @import-json="importNewJson"
        @set-hide-zone="({ key, val }) => setHideZone(key, val)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
import ToastMessage from './components/ToastMessage.vue'
import DetailPopup from './components/DetailPopup.vue'
import Icon from './components/Icon.vue'

// --- API ---
const api = useApi()
const { syncSt, syncMsg, syncTime, syncing, isConfigured } = api

// --- Formatters ---
const { fN, fS, fV, tStr } = useFormatters()

// --- State ---
const appState = ref(isConfigured.value ? 'loading' : 'setup')
const loading = ref(false)
const sErr = ref('')
const tab = ref('add')
const importErr = ref('')
const settingsRef = ref(null)
const upcomingRef = ref(null)
const toastMsg = ref('')
const toastType = ref('ok')
const toastTrigger = ref(0)
function toast(msg, type = 'ok') { toastMsg.value = msg; toastType.value = type; toastTrigger.value++ }
const syncBarRef = ref(null)
const syncBarScrolled = ref(false)
const alertRef = ref(null)
const limBlink = ref(false)
const overBanner = ref(false)
let syncObserver = null
let alertObserver = null
let overTimer = null

function scrollToAlert() {
  dismissOverBanner()
  alertRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function dismissOverBanner() {
  overBanner.value = false
  limBlink.value = false
  clearTimeout(overTimer)
}

onMounted(() => {
  syncObserver = new IntersectionObserver(
    ([entry]) => { syncBarScrolled.value = !entry.isIntersecting },
    { threshold: 0 }
  )
  const checkEl = () => {
    const el = syncBarRef.value?.el
    if (el) { syncObserver.observe(el); return true }
    return false
  }
  if (!checkEl()) {
    const stop = watch(syncBarRef, () => { if (checkEl()) stop() }, { immediate: false })
  }
})

onUnmounted(() => { syncObserver?.disconnect(); alertObserver?.disconnect(); clearTimeout(overTimer) })

const popupItem = ref(null)
function openDetail(item, variant) { popupItem.value = { ...item, _variant: variant } }

function handleCopy(item) {
  popupItem.value = null
  if (item._variant === 'upcoming') {
    const isDebt = item._category === 'debt_minimum' || item._category === 'installment'
    setTimeout(() => {
      upcomingRef.value?.openWithPrefill({
        type: isDebt ? 'pay' : 'oneTime',
        name: item.name,
        date: item._date || item.date || '',
        amount: item.amt || item.amount || 0,
      })
    }, 100)
  } else {
    // Transaction — switch to add tab and prefill
    tab.value = 'add'
    setTimeout(() => {
      const addEl = document.querySelector('.add-tx')
      if (addEl) addEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    copyTxData.value = {
      desc: item.desc || item.name || '',
      amount: item.amount || item.amt || 0,
      cat: item.cat || 'an',
      type: item.type || 'exp',
    }
  }
}
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
  expenses, incomes, sortedTx, today, dToSalary, dayLimit, cashDaysLeft,
  todaySpent, todayOutflow, todayIncome, monthSpent, availCash, isOver, limPct, limSt,
  cashTrend, debtTrend, txTrend,
  debtCards, smallLoans, totalDebt, origDebt, repayPct,
  debtBreakdown, upcomingLabel, upcoming, milestones, findDebtId,
} = useDebtData(d)

const overMsg = computed(() =>
  isOver.value
    ? `Vượt hạn mức +${hz('alert') ? '•••' : fV(todaySpent.value - dayLimit.value)}`
    : ''
)

// --- Animation keys ---
const cashAnimKey = ref(0)
const spentAnimKey = ref(0)
const debtAnimKey = ref(0)
const editBuf = ref({ name: '', date: '', amt: null })
const copyTxData = ref(null)

watch(availCash, () => { cashAnimKey.value++ })
watch(todaySpent, () => { spentAnimKey.value++ })
watch(totalDebt, () => { debtAnimKey.value++ })

// Blink when todaySpent increases while over limit
watch([todaySpent, limSt], ([spent, st], [oldSpent]) => {
  if (st === 'over' && (oldSpent === undefined || spent > oldSpent)) {
    limBlink.value = true
    overBanner.value = false
    clearTimeout(overTimer)
    overTimer = setTimeout(() => {
      if (limBlink.value) overBanner.value = true
    }, 5000)
  }
  if (st !== 'over') {
    limBlink.value = false
    overBanner.value = false
    clearTimeout(overTimer)
  }
})

// Stop blink when alert area is visible
watch(alertRef, (el) => {
  alertObserver?.disconnect()
  if (!el) return
  alertObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && limBlink.value) {
        limBlink.value = false
        overBanner.value = false
        clearTimeout(overTimer)
      }
    },
    { threshold: 0.5 }
  )
  alertObserver.observe(el)
}, { immediate: true })

// --- Sync helpers ---
async function pushData() {
  try {
    await api.push(d.value)
    return true
  } catch {
    return false
  }
}

async function pullData() {
  try {
    d.value = await api.pull()
    appState.value = 'ready'
    cleanupPastPaid()
  } catch {
    syncSt.value = 'error'
    syncMsg.value = 'Lỗi'
    syncTime.value = ''
    appState.value = d.value.debts ? 'error' : 'setup'
  }
}

/** Remove paid obligations whose date is in the past — also clean source data */
async function cleanupPastPaid() {
  const todayStr = tStr()
  const paid = new Set(d.value.paid_obligations || [])
  if (!paid.size) return
  const pastKeys = new Set([...paid].filter((k) => {
    const dateStr = k.split(':')[0]
    return dateStr && dateStr < todayStr
  }))
  if (!pastKeys.size) return
  // Remove from paid_obligations
  pastKeys.forEach((k) => paid.delete(k))
  // Remove matching one_time_expenses
  const filteredOneTime = (d.value.one_time_expenses || []).filter((ev) => {
    const key = ev.date + ':' + ev.name
    return !pastKeys.has(key)
  })
  // Remove matching obligations from monthly_plans
  const plans = { ...(d.value.monthly_plans || {}) }
  for (const mo of Object.keys(plans)) {
    const obs = plans[mo]?.obligations
    if (!obs) continue
    const filtered = obs.filter((ob) => {
      const dateStr = ob.date || ob['date ']
      if (!dateStr) return true
      const key = dateStr + ':' + ob.name
      return !pastKeys.has(key)
    })
    if (filtered.length !== obs.length) {
      plans[mo] = { ...plans[mo], obligations: filtered }
    }
  }
  d.value = {
    ...d.value,
    paid_obligations: [...paid],
    one_time_expenses: filteredOneTime,
    monthly_plans: plans,
  }
  await pushData()
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
async function addExp({ desc, amount, cat, payMethod }) {
  const isCash = !payMethod || payMethod === 'cash'
  const e = { id: Date.now(), desc, amount, cat, date: tStr(), payMethod: payMethod || 'cash' }
  const nd = {
    ...d.value,
    expenses: [e, ...(d.value.expenses || [])],
  }
  if (!isCash) {
    // Visa payment — add amount to card balance
    nd.debts = {
      ...nd.debts,
      credit_cards: (nd.debts?.credit_cards || []).map((c) =>
        c.id === payMethod ? { ...c, balance: (c.balance || 0) + amount } : c
      ),
    }
  }
  d.value = nd
  ;(await pushData()) ? toast('Đã thêm chi tiêu') : toast('Lỗi lưu chi tiêu', 'err')
}

async function addInc({ desc, amount, cat }) {
  const e = { id: Date.now(), desc, amount, cat, date: tStr() }
  d.value = { ...d.value, incomes: [e, ...(d.value.incomes || [])] }
  d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amount } }
  ;(await pushData()) ? toast('Đã thêm thu nhập') : toast('Lỗi lưu thu nhập', 'err')
}

async function deleteTx(e) {
  if (e.type === 'inc') {
    const inc = incomes.value.find((i) => i.id === e.id)
    d.value = { ...d.value, incomes: d.value.incomes.filter((i) => i.id !== e.id) }
    if (inc) d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: Math.max(0, (d.value.current_cash?.balance || 0) - inc.amount) } }
  } else {
    const exp = (d.value.expenses || []).find((i) => i.id === e.id)
    const nd = { ...d.value, expenses: d.value.expenses.filter((i) => i.id !== e.id) }
    // Reverse Visa balance if paid by card
    if (exp?.payMethod && exp.payMethod !== 'cash') {
      nd.debts = {
        ...nd.debts,
        credit_cards: (nd.debts?.credit_cards || []).map((c) =>
          c.id === exp.payMethod ? { ...c, balance: Math.max(0, (c.balance || 0) - exp.amount) } : c
        ),
      }
    }
    d.value = nd
  }
  ;(await pushData()) ? toast('Đã xoá giao dịch') : toast('Lỗi xoá giao dịch', 'err')
}

async function updLimit(val) {
  if (val > 0) {
    d.value.custom_daily_limit = val
    ;(await pushData()) ? toast('Đã cập nhật hạn mức') : toast('Lỗi cập nhật hạn mức', 'err')
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
  ;(await pushData()) ? toast('Đã ghi nhận trả nợ') : toast('Lỗi ghi nhận trả nợ', 'err')
}

async function addCash({ amount }) {
  if (!amount || amount <= 0) return
  d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amount, as_of: tStr() } }
  ;(await pushData()) ? toast('Đã cập nhật tiền mặt') : toast('Lỗi cập nhật tiền mặt', 'err')
}

async function addOneTime({ name, date, amount }) {
  if (!name || !date || !amount) return
  const ev = { id: Date.now(), name, date, amount }
  d.value = { ...d.value, one_time_expenses: [...(d.value.one_time_expenses || []), ev] }
  ;(await pushData()) ? toast('Đã thêm khoản chi') : toast('Lỗi thêm khoản chi', 'err')
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
  ;(await pushData()) ? toast('Đã cập nhật thẻ') : toast('Lỗi cập nhật thẻ', 'err')
}

async function updateCardDirect({ cardId, balance, min, minDueDate }) {
  d.value = {
    ...d.value,
    debts: {
      ...d.value.debts,
      credit_cards: d.value.debts.credit_cards.map((c) => {
        if (c.id !== cardId) return c
        return {
          ...c,
          ...(balance != null ? { balance } : {}),
          ...(min != null ? { minimum_payment: min } : {}),
          ...(minDueDate !== undefined ? { min_due_date: minDueDate } : {}),
        }
      }),
    },
  }
  ;(await pushData()) ? toast('Đã cập nhật thẻ') : toast('Lỗi cập nhật thẻ', 'err')
}

// --- Upcoming edit/pay ---
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
            // Update category if CC payment level changed (minimum ↔ custom)
            const newCat = (buf.name || '').toLowerCase().includes('minimum') ? 'debt_minimum'
              : (ob.category === 'debt_minimum' ? null : ob.category)
            return { ...ob, name: buf.name, date: buf.date, amount: buf.amt, category: newCat }
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
  ;(await pushData()) ? toast('Đã cập nhật khoản thanh toán') : toast('Lỗi cập nhật', 'err')
}

async function deleteUpcoming(p) {
  if (p.source === 'one_time') {
    d.value = { ...d.value, one_time_expenses: (d.value.one_time_expenses || []).filter((e) => e.id !== p._id) }
  } else if (p.source === 'monthly_plan' && p._mo) {
    const plans = { ...(d.value.monthly_plans || {}) }
    const plan = plans[p._mo]
    if (plan?.obligations) {
      plans[p._mo] = {
        ...plan,
        obligations: plan.obligations.filter((ob) => {
          const dateStr = ob.date || ob['date '] || ''
          return (dateStr + ':' + ob.name) !== p._key
        }),
      }
      d.value = { ...d.value, monthly_plans: plans }
    }
  } else {
    return
  }
  ;(await pushData()) ? toast('Đã xoá khoản chi') : toast('Lỗi xoá khoản chi', 'err')
}

async function togglePaid(key, amt, obName) {
  const paid = new Set(d.value.paid_obligations || [])
  const nd = {
    ...d.value,
    expenses: [...(d.value.expenses || [])],
    debts: {
      ...d.value.debts,
      credit_cards: [...(d.value.debts?.credit_cards || [])],
      small_loans: [...(d.value.debts?.small_loans || [])],
    },
  }
  const debtRef = obName ? findDebtId(obName) : null
  // Unique tag to link expense with this obligation
  const obTag = 'ob:' + key

  if (paid.has(key)) {
    // --- Undo payment ---
    paid.delete(key)
    nd.current_cash = { ...nd.current_cash, balance: (nd.current_cash?.balance || 0) + amt }
    // Remove linked expense
    nd.expenses = nd.expenses.filter((e) => e._obTag !== obTag)
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
    // --- Mark as paid ---
    paid.add(key)
    nd.current_cash = { ...nd.current_cash, balance: Math.max(0, (nd.current_cash?.balance || 0) - amt) }
    // Add expense record to transaction history
    nd.expenses = [
      { id: Date.now(), desc: obName || 'Thanh toán', amount: amt, cat: 'thanhToan', date: tStr(), _obTag: obTag },
      ...nd.expenses,
    ]
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
  const wasPaid = paid.has(key)
  ;(await pushData()) ? toast(wasPaid ? 'Đã thanh toán' : 'Đã hoàn tác thanh toán') : toast('Lỗi cập nhật', 'err')
}

// --- Popup handlers ---
async function handlePopupSaveUpcoming(p) {
  const buf = p._buf
  popupItem.value = null
  // Reuse saveEdit logic
  editBuf.value = buf
  await saveEdit(p)
}

async function handlePopupSaveTx(item) {
  const buf = item._buf
  popupItem.value = null
  // Update transaction in-place
  if (item.type === 'inc') {
    const old = (d.value.incomes || []).find((i) => i.id === item.id)
    const amtDiff = buf.amt - (old?.amount || 0)
    d.value = {
      ...d.value,
      incomes: (d.value.incomes || []).map((i) =>
        i.id === item.id ? { ...i, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat } : i
      ),
      current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amtDiff },
    }
  } else {
    d.value = {
      ...d.value,
      expenses: (d.value.expenses || []).map((i) =>
        i.id === item.id ? { ...i, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat } : i
      ),
    }
  }
  ;(await pushData()) ? toast('Đã cập nhật giao dịch') : toast('Lỗi cập nhật', 'err')
}

async function handlePopupDelete(item) {
  popupItem.value = null
  if (item._variant === 'upcoming') {
    await deleteUpcoming(item)
  } else {
    await deleteTx(item)
  }
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
    ;(await pushData()) ? toast('Đã import dữ liệu') : toast('Lỗi import dữ liệu', 'err')
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
