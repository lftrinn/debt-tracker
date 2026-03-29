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
    @toggle-paid="(k: string, a: number, n: string) => { popupItem = null; togglePaid(k, a, n) }"
    @save-upcoming="handlePopupSaveUpcomingWrapped"
    @save-tx="handlePopupSaveTxWrapped"
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
        @import-json="handleImportJson"
        @set-hide-zone="({ key, val }: { key: string; val: boolean }) => setHideZone(key, val)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { AppData } from '@/types/data'

import { useApi } from './composables/useApi'
import { useFormatters } from './composables/useFormatters'
import { useDebtData } from './composables/useDebtData'
import { useToast } from './composables/useToast'
import { useHideZones } from './composables/useHideZones'
import { useAppSetup } from './composables/useAppSetup'
import { useTransactions } from './composables/useTransactions'
import { usePayments } from './composables/usePayments'
import { useDebtActions } from './composables/useDebtActions'

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

// ─── API & Formatters ─────────────────────────────────────────────────────
const api = useApi()
const { syncSt, syncMsg, syncTime, syncing, isConfigured } = api
const { fN, fS, fV, tStr } = useFormatters()

// ─── UI state ─────────────────────────────────────────────────────────────
const appState = ref<'loading' | 'setup' | 'ready' | 'error'>(isConfigured.value ? 'loading' : 'setup')
const tab = ref('add')
const importErr = ref('')
const settingsRef = ref<InstanceType<typeof SettingsPanel> | null>(null)
const upcomingRef = ref<InstanceType<typeof UpcomingPayments> | null>(null)
const syncBarRef = ref<InstanceType<typeof SyncBar> | null>(null)
const syncBarScrolled = ref(false)
const alertRef = ref<HTMLElement | null>(null)
const limBlink = ref(false)
const overBanner = ref(false)
let syncObserver: IntersectionObserver | null = null
let alertObserver: IntersectionObserver | null = null
let overTimer: ReturnType<typeof setTimeout> | null = null

// ─── Toast ────────────────────────────────────────────────────────────────
const { toastMsg, toastType, toastTrigger, toast } = useToast()

// ─── Hide zones ───────────────────────────────────────────────────────────
const { hideAmounts, toggleHide, hideZones, setHideZone, hz } = useHideZones()

// ─── Main data ref ────────────────────────────────────────────────────────
const d = ref<AppData>({
  expenses: [],
  incomes: [],
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

// ─── Computed debt data ───────────────────────────────────────────────────
const {
  expenses, incomes, sortedTx, today, dToSalary, dayLimit, cashDaysLeft,
  todaySpent, todayOutflow, todayIncome, monthSpent, availCash, isOver, limPct, limSt,
  cashTrend, debtTrend, txTrend,
  debtCards, smallLoans, totalDebt, origDebt, repayPct, debtBreakdown,
  upcomingLabel, upcoming, milestones, findDebtId,
} = useDebtData(d)

const overMsg = computed(() =>
  isOver.value ? `Vượt hạn mức +${hz('alert') ? '•••' : fV(todaySpent.value - dayLimit.value)}` : ''
)

// ─── Animation keys ───────────────────────────────────────────────────────
const cashAnimKey = ref(0)
const spentAnimKey = ref(0)
const debtAnimKey = ref(0)
watch(availCash, () => { cashAnimKey.value++ })
watch(todaySpent, () => { spentAnimKey.value++ })
watch(totalDebt, () => { debtAnimKey.value++ })

// ─── Over-limit blink logic ───────────────────────────────────────────────
watch([todaySpent, limSt], ([spent, st], [oldSpent]) => {
  if (st === 'over' && (oldSpent === undefined || spent > oldSpent)) {
    limBlink.value = true
    overBanner.value = false
    if (overTimer) clearTimeout(overTimer)
    overTimer = setTimeout(() => {
      if (limBlink.value) overBanner.value = true
    }, 5000)
  }
  if (st !== 'over') {
    limBlink.value = false
    overBanner.value = false
    if (overTimer) clearTimeout(overTimer)
  }
})

watch(alertRef, (el) => {
  alertObserver?.disconnect()
  if (!el) return
  alertObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && limBlink.value) {
      limBlink.value = false
      overBanner.value = false
      if (overTimer) clearTimeout(overTimer)
    }
  }, { threshold: 0.5 })
  alertObserver.observe(el)
}, { immediate: true })

function scrollToAlert(): void {
  dismissOverBanner()
  alertRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function dismissOverBanner(): void {
  overBanner.value = false
  limBlink.value = false
  if (overTimer) clearTimeout(overTimer)
}

// ─── SyncBar intersection observer ───────────────────────────────────────
onMounted(() => {
  syncObserver = new IntersectionObserver(
    ([entry]) => { syncBarScrolled.value = !entry.isIntersecting },
    { threshold: 0 }
  )
  const checkEl = () => {
    const el = (syncBarRef.value as any)?.el
    if (el) { syncObserver!.observe(el); return true }
    return false
  }
  if (!checkEl()) {
    const stop = watch(syncBarRef, () => { if (checkEl()) stop() }, { immediate: false })
  }
})
onUnmounted(() => {
  syncObserver?.disconnect()
  alertObserver?.disconnect()
  if (overTimer) clearTimeout(overTimer)
})

// ─── Setup composable ─────────────────────────────────────────────────────
// Payments is wired first so cleanupPastPaid can be passed to useAppSetup
const payments = usePayments(d, async () => { try { await api.push(d.value); return true } catch { return false } }, toast, tStr, findDebtId)
const { togglePaid, recPay, addOneTime, saveEdit, deleteUpcoming, handlePopupSaveUpcoming } = payments

const { loading, sErr, pushData, pullData, handleSetup, reconnect, hardReload, logout } = useAppSetup(
  d, appState, api, toast, () => payments.cleanupPastPaid()
)

// ─── Transaction composable ───────────────────────────────────────────────
const { copyTxData, addExp, addInc, deleteTx, handlePopupSaveTx } = useTransactions(d, pushData, toast, tStr, findDebtId)

// ─── Debt action composable ───────────────────────────────────────────────
const { updateCardDirect, addCash, updLimit, importNewJson } = useDebtActions(d, pushData, toast, tStr)

// ─── Popup state ──────────────────────────────────────────────────────────
const popupItem = ref<Record<string, unknown> | null>(null)
function openDetail(item: Record<string, unknown>, variant: string): void {
  popupItem.value = { ...item, _variant: variant }
}

async function handlePopupSaveUpcomingWrapped(p: Parameters<typeof handlePopupSaveUpcoming>[0]): Promise<void> {
  popupItem.value = null
  await handlePopupSaveUpcoming(p)
}

async function handlePopupSaveTxWrapped(item: Parameters<typeof handlePopupSaveTx>[0]): Promise<void> {
  popupItem.value = null
  await handlePopupSaveTx(item)
}

async function handlePopupDelete(item: Record<string, unknown>): Promise<void> {
  popupItem.value = null
  if (item._variant === 'upcoming') {
    await deleteUpcoming(item as Parameters<typeof deleteUpcoming>[0])
  } else {
    await deleteTx(item as Parameters<typeof deleteTx>[0])
  }
}

function handleCopy(item: Record<string, unknown>): void {
  popupItem.value = null
  if (item._variant === 'upcoming') {
    const isDebt = item._category === 'debt_minimum' || item._category === 'installment'
    setTimeout(() => {
      ;(upcomingRef.value as any)?.openWithPrefill({
        type: isDebt ? 'pay' : 'oneTime',
        name: item.name,
        date: item._date || item.date || '',
        amount: item.amt || item.amount || 0,
      })
    }, 100)
  } else {
    tab.value = 'add'
    setTimeout(() => {
      const addEl = document.querySelector('.add-tx')
      if (addEl) (addEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    copyTxData.value = {
      desc: (item.desc || item.name || '') as string,
      amount: (item.amount || item.amt || 0) as number,
      cat: (item.cat || 'an') as string,
      type: (item.type || 'exp') as 'exp' | 'inc',
    }
  }
}

// ─── Wrappers that need script-scope refs ─────────────────────────────────
// importErr is a Ref<string> — auto-unwrapped in template, so pass from script scope
async function handleImportJson(jsonStr: string): Promise<void> {
  await importNewJson(jsonStr, importErr)
}

// ─── Init ─────────────────────────────────────────────────────────────────
if (isConfigured.value) pullData()
</script>
