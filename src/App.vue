<template>
  <!-- LOADING -->
  <LoadingScreen v-if="appState === 'loading'" :message="syncMsgText" />

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

  <!-- LEVEL UP TOAST -->
  <LevelUpToast :show="lvlUpShow" :level="playerLvl" />

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

  <!-- MAIN · Tru Ma Lục shell ─────────────────────────────────────────── -->
  <div v-if="appState === 'ready' || appState === 'error'">
    <TutienHeader
      :name="playerName"
      :realm="playerRealm"
      :lvl="playerLvl"
      :coins="availCash"
      :hide="hideAmounts"
      @toggle-hide="toggleHide"
      @tap-avatar="tab = 'cfg'"
    />

    <div class="wrap">
      <SyncBar ref="syncBarRef" :status="syncSt" :message="syncMsgText" :syncTime="syncTime" :today="today" />

      <!-- HOME · Đại Trận ──────────────────────────────────────────── -->
      <template v-if="tab === 'home'">
        <div class="xp-bar">
          <span class="lab">Tu vi</span>
          <div class="track"><div class="fill" :style="{ width: playerXpPct + '%' }"></div></div>
          <span class="next">{{ playerXp }}/{{ playerXpMax }}</span>
        </div>

        <div v-if="isOver" class="alert over"><Icon name="alert-triangle" :size="14" /> {{ $t('app.alert.over') }}{{ hz('alert') ? '•••' : fCurrFull(todaySpent - dayLimit) }}</div>
        <div v-else-if="dayLimit > 0" class="alert ok">
          <Icon name="check" :size="14" />
          <span class="alert-main">{{ $t('app.alert.okMain', { amount: hz('alert') ? '****' : fCurr(dayLimit - todaySpent), limit: hz('alert') ? '****' : fCurr(dayLimit) }) }}</span>
          <span v-if="cashDaysLeft !== null && cashDaysLeft < dToSalary" class="alert-badge-warn">{{ hz('alert') ? '•/•' : $t('app.alert.days', { days: cashDaysLeft, salary: dToSalary }) }}</span>
        </div>

        <!-- Tâm Ma · Final boss = totalDebt -->
        <BossCard
          :display="boss.display"
          :real="boss.real"
          :realm="boss.realm"
          :hp="totalDebt"
          :hpMax="origDebt"
          :nextDate="boss.nextDate"
          :nextAmt="boss.nextAmt"
          :hide="hideAmounts"
          :useDisplay="useTutien"
        />

        <!-- Linh Khí Ngày + Kim Nguyên Bảo -->
        <ManaCards
          :manaLeft="manaLeft"
          :manaPct="manaPctUsed"
          :manaOver="isOver"
          :dayLimit="dayLimit"
          :gold="availCash"
          :goldDays="cashDaysLeft"
          :hide="{ mana: hz('cash.todaySpent'), gold: hz('cash.balance') }"
        />

        <!-- Kiếp Số · Quests = upcoming payments -->
        <SectionHeader
          :icon="IconScroll"
          :title="$t('section.kiepSo')"
          vn="quests"
          :act="$t('section.viewAll')"
          @click-act="tab = 'inv'"
        />
        <QuestList
          :items="upcoming"
          :hide="hz('upcoming.amount')"
          :max="4"
          @open-detail="openDetail($event, 'upcoming')"
        />

        <!-- Ma Chướng · Enemies = credit cards + small loans mini-bosses -->
        <SectionHeader
          :icon="IconDemon"
          :title="$t('section.maChuong')"
          :vn="String(allEnemyDebts.length)"
        />
        <EnemyRow
          :cards="allEnemyDebts"
          :hide="{ hp: hz('debt.cardBal'), amounts: hideAmounts }"
          :useDisplay="useTutien"
          @update-card="updateCardDirect"
        />

        <!-- Tâm Pháp · Achievements -->
        <SectionHeader
          :icon="IconTrophy"
          :title="$t('section.tamPhap')"
          vn="achievement"
        />
        <AchievementList
          :paidCount="(d.paid_obligations || []).length"
          :isOver="isOver"
          :repayPct="repayPct"
          :max="3"
        />
      </template>

      <!-- ADD · Xuất Kiếm ──────────────────────────────────────────── -->
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

      <!-- INV · Chiến Ký ───────────────────────────────────────────── -->
      <TransactionList
        v-if="tab === 'inv'"
        :transactions="sortedTx"
        :hide="hz('transactions')"
        @open-detail="openDetail($event, 'tx')"
        @delete-tx="(tx: any) => deleteTx(tx)"
        @quick-add="handleQuickAdd"
      />

      <!-- CHT · Tu Vi Ký ───────────────────────────────────────────── -->
      <ChartsPanel
        v-if="tab === 'cht'"
        :expenses="expenses"
        :incomes="incomes"
        :debtBreakdown="debtBreakdown"
        :projectedDebt="d.payoff_timeline?.projected_debt_by_month || []"
        :hide="{ spend: hz('charts.spend'), debtLine: hz('charts.debtLine'), pie: hz('charts.pie') }"
      />

      <!-- MAP · Lộ Đồ ──────────────────────────────────────────────── -->
      <TimelinePanel
        v-if="tab === 'map'"
        :milestones="milestones"
        :hide="{ debt: hz('timeline.debt'), eventAmt: hz('timeline.eventAmt') }"
        :paidCount="(d.paid_obligations || []).length"
        :isOver="isOver"
        :repayPct="repayPct"
        :streakDays="streakDays"
      />

      <!-- CFG · Đạo Tâm (truy cập qua tap avatar) ──────────────────── -->
      <SettingsPanel
        v-if="tab === 'cfg'"
        ref="settingsRef"
        :dayLimit="dayLimit"
        :todaySpent="todaySpent"
        :limPct="limPct"
        :limSt="limSt"
        :rules="localizedRules"
        :syncMsg="syncMsgText"
        :syncTime="syncTime"
        :syncing="syncing"
        :importErr="importErr"
        :hide="{ cardInfo: hz('settings.cardInfo'), dailyLim: hz('settings.dailyLim'), dropdown: hz('settings.dropdown'), cashInfo: hz('settings.cashInfo') }"
        :hideZones="hideZones"
        :pushStatus="pushStatus"
        :playerName="playerName"
        :playerRealm="playerRealm"
        :playerLvl="playerLvl"
        :hideFlag="hideAmounts"
        @update-limit="updLimit"
        @import-json="handleImportJson"
        @set-hide-zone="({ key, val }: { key: string; val: boolean }) => setHideZone(key, val)"
        @enable-push="handleEnablePush"
        @save-push-worker="handleSavePushWorker"
        @logout="logout"
        @reload="hardReload"
        @toggle-hide="toggleHide"
      />
    </div>

    <BottomTabBar :tab="tab" @set-tab="(id) => tab = id" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Ref } from 'vue'
import type { AppData, TransactionItem } from '@/types/data'
import type { ToastType } from './composables/ui/useToast'
import type { Locale } from './i18n'
import { setLocale } from './i18n'
import { useCurrency } from './composables/api/useCurrency'

import { useApi } from './composables/api/useApi'
import { useFormatters } from './composables/ui/useFormatters'
import { getRuleText } from './composables/data/useI18nData'
import { useDebtData } from './composables/data/useDebtData'
import { useToast } from './composables/ui/useToast'
import { useHideZones } from './composables/ui/useHideZones'
import { useAppSetup } from './composables/actions/useAppSetup'
import { useTransactions } from './composables/actions/useTransactions'
import { usePayments } from './composables/actions/usePayments'
import { useDebtActions } from './composables/actions/useDebtActions'
import { usePushNotifications } from './composables/ui/usePushNotifications'

import LoadingScreen from './components/ui/LoadingScreen.vue'
import ErrorPopup from './components/ui/ErrorPopup.vue'
import SetupScreen from './components/forms/SetupScreen.vue'
import TutienHeader from './components/layout/TutienHeader.vue'
import BottomTabBar from './components/layout/BottomTabBar.vue'
import SyncBar from './components/layout/SyncBar.vue'
import BossCard from './components/cards/BossCard.vue'
import ManaCards from './components/cards/ManaCards.vue'
import EnemyRow from './components/cards/EnemyRow.vue'
import SectionHeader from './components/cards/SectionHeader.vue'
import AchievementList from './components/cards/AchievementList.vue'
import QuestList from './components/payments/QuestList.vue'
import AddTransaction from './components/forms/AddTransaction.vue'
import TransactionList from './components/payments/TransactionList.vue'
import ChartsPanel from './components/charts/ChartsPanel.vue'
import TimelinePanel from './components/charts/TimelinePanel.vue'
import SettingsPanel from './components/forms/SettingsPanel.vue'
import ToastMessage from './components/ui/ToastMessage.vue'
import LevelUpToast from './components/ui/LevelUpToast.vue'
import DetailPopup from './components/ui/DetailPopup.vue'
import Icon from './components/ui/Icon.vue'

// Phase 10 cleanup: components CashHero/DebtOverview/ProgressSection/UpcomingPayments/AppHeader
// đã bị xoá sau khi Phase 1+2 thay bằng TutienHeader + BossCard + ManaCards + EnemyRow + QuestList.
import { IconScroll, IconDemon, IconTrophy } from './components/ui/quest-icons'

// Tu Tiên foundations — useTheme/useDisplayMode singletons khởi tạo qua import
// (side effect ở module level: theme đồng bộ class body.light)
import { useDisplayMode } from './composables/ui/useDisplayMode'
import './composables/ui/useTheme' // ensure theme class applied
import { realmOf, finalBossFor } from './composables/data/useTutienNames'
import { applyV2ToLegacy, blankItem } from './composables/data/useV2Adapter'
import type { Item, Meta } from './types/data'

// ─── API & Formatters ─────────────────────────────────────────────────────
const api = useApi()
const { syncSt, syncMsg, syncTime, syncing, isConfigured } = api
const { fN, tStr } = useFormatters()
const { fCurr, fCurrFull, fetchRates } = useCurrency()
fetchRates()
const { t } = useI18n()
const syncMsgText = computed(() => t(syncMsg.value))

// ─── UI state ─────────────────────────────────────────────────────────────
const appState = ref<'loading' | 'setup' | 'ready' | 'error'>(isConfigured.value ? 'loading' : 'setup')
/** TabId: 5 tab dưới (BottomTabBar) + 'cfg' (truy cập qua tap avatar) */
type TabId = 'home' | 'inv' | 'add' | 'cht' | 'map' | 'cfg'
const tab = ref<TabId>('home')
const importErr = ref('')
const settingsRef = ref<InstanceType<typeof SettingsPanel> | null>(null)
const syncBarRef = ref<InstanceType<typeof SyncBar> | null>(null)

// ─── Notifications ────────────────────────────────────────────────────────
const { pushStatus, checkPushStatus, registerServiceWorker, enablePushNotifications, sendDueNotification, sendPaydayNotification, clearDueDedup } = usePushNotifications()

// ─── Toast ────────────────────────────────────────────────────────────────
const { toastMsg, toastType, toastTrigger, toast } = useToast()
const toastFn = (key: string, type?: ToastType) => toast(t(key), type)

// ─── Hide zones ───────────────────────────────────────────────────────────
const { hideAmounts, toggleHide, hideZones, setHideZone, hz } = useHideZones()

// ─── Main data ref ────────────────────────────────────────────────────────
// ─── Default seed (v2 schema) · Phase 11 ──────────────────────────────────
// User's actual planning snapshot for May 2026. items[] = source of truth khi
// serialize lên JSONBin; legacy fields được derive qua applyV2ToLegacy.
const seedMeta: Meta = {
  owner: 'Tran Nhat Quang',
  currency: 'VND',
  generated_at: '2026-05-01',
  as_of_month: '2026-05',
  strategy: 'avalanche_modified',
  strategy_note: 'Pay minimum on all debts; surplus targets item with highest priority_score until cleared, then next.',
  debt_free_target: '2027-02',
  schema_note: "All entries share one object shape. Fields not relevant to a given type are null. The 'children' array uses the same object shape recursively. Switch on 'type' to interpret which fields are meaningful.",
  daily_limit: { until_salary: 70000, after_salary: 100000 },
  custom_daily_limit: 0,
  extra_paid: 0,
}

/** Helper: tạo Item rồi merge với overrides. */
function mk(id: string, type: Item['type'], name: string, overrides: Partial<Item> = {}): Item {
  return { ...blankItem(id, type, name), ...overrides }
}

const seedItems: Item[] = [
  mk('vcb_checking', 'account', 'VCB checking', {
    issuer: 'VCB',
    amount: 1668727,
    as_of: '2026-04-30',
    note: 'Primary checking; salary is deposited here.',
  }),
  mk('salary_april_2026', 'income', 'Luong thang 04/2026 (received 05/05)', {
    issuer: 'Dr.JOY',
    amount: 22792714,
    per_period: 22792714,
    frequency: 'monthly',
    due_day_of_month: 5,
    due_date: '2026-05-05',
    as_of: '2026-04-30',
    note: 'Net actual from payslip: gross 26,000,000 - insurance 2,730,000 - PIT 380,143 - union 130,000 + lunch 200,000 - 1.08h unpaid leave.',
  }),
  mk('rent_may_2026', 'fixed_expense', 'Tien nha thang 05', {
    amount: 4838000,
    per_period: 4838000,
    frequency: 'monthly',
    due_day_of_month: 5,
    due_date: '2026-05-05',
    note: 'May actual: room 4,000,000 + electricity 187kWh*4,000 + water 30,000 + service 60,000.',
  }),
  mk('living_expense', 'fixed_expense', 'Sinh hoat', {
    amount: 3000000,
    per_period: 3000000,
    frequency: 'monthly',
  }),
  mk('misc_expense_may_2026', 'fixed_expense', 'Chi phi khac (May reduced)', {
    amount: 1287711,
    per_period: 3000000,
    frequency: 'monthly',
    note: 'Baseline 3,000,000/month; reduced this month to absorb tuition shortfall (1,712,289 cut).',
  }),
  mk('tuition_may_2026', 'one_time_expense', 'Hoc phi 13 tin chi', {
    amount: 7046000,
    frequency: 'one_time',
    due_day_of_month: 18,
    due_date: '2026-05-18',
    note: '13 credits x 542,000 VND/credit.',
  }),
  mk('visa_1', 'debt', 'Techcombank Visa 1 (...1882)', {
    issuer: 'Techcombank',
    account_last_4: '1882',
    amount: 50893290,
    credit_limit: 53000000,
    available_credit: 523823,
    minimum_payment: 3943427,
    apr: 0.359,
    monthly_rate: 0.0299,
    frequency: 'monthly',
    due_day_of_month: 13,
    statement_day_of_month: 28,
    due_date: '2026-05-13',
    as_of: '2026-04-28',
    priority_score: 2,
    severity: 'high',
    note: 'Near credit-limit ceiling (98.9% used). Pay minimum only until visa_2 cleared, then attack.',
    children: [
      mk('v1_inst_hyperskill', 'hidden_installment', 'HYPERSKILL', {
        issuer: 'HYPERSKILL', amount: 435442, per_period: 435442, periods_remaining: 1,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-05-28', as_of: '2026-04-28',
        note: 'Auto-debits on V1 statement day. 11/12 paid, 1 left.',
      }),
      mk('v1_inst_claude', 'hidden_installment', 'CLAUDE.AI SUBSCRIPTION', {
        issuer: 'ANTHROPIC', amount: 403142, per_period: 403142, periods_remaining: 1,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-05-28', as_of: '2026-04-28',
        non_cancellable: true,
        note: 'Cannot cancel. 5/6 paid, 1 left.',
      }),
      mk('v1_inst_fpt_tiktok', 'hidden_installment', 'FPT*TIKTOKSHOP', {
        issuer: 'FPT', amount: 378232, per_period: 189116, periods_remaining: 2,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-06-28', as_of: '2026-04-28',
        note: '4/6 paid, 2 left.',
      }),
      mk('v1_inst_9pay_tiktok', 'hidden_installment', '9PAY*TikTok Shop', {
        issuer: '9PAY', amount: 347074, per_period: 173537, periods_remaining: 2,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-06-28', as_of: '2026-04-28',
        note: '4/6 paid, 2 left.',
      }),
    ],
  }),
  mk('visa_2', 'debt', 'Techcombank Visa 2 (...5444)', {
    issuer: 'Techcombank',
    account_last_4: '5444',
    amount: 33647382,
    credit_limit: 37000000,
    available_credit: 2732346,
    minimum_payment: 1976998,
    apr: 0.362,
    monthly_rate: 0.0302,
    frequency: 'monthly',
    due_day_of_month: 5,
    statement_day_of_month: 20,
    due_date: '2026-05-05',
    as_of: '2026-04-20',
    priority_score: 1,
    severity: 'medium',
    note: 'Highest interest rate; smallest balance — clear first, then redirect surplus to visa_1.',
    children: [
      mk('v2_inst_9pay_tiktok', 'hidden_installment', '9PAY*TIKTOKSHOP', {
        issuer: '9PAY', amount: 620272, per_period: 310136, periods_remaining: 2,
        frequency: 'monthly', due_day_of_month: 20, statement_day_of_month: 20,
        ends_on: '2026-06-20', as_of: '2026-04-20',
        note: '4/6 paid, 2 left.',
      }),
    ],
  }),
  mk('hd_saison', 'debt', 'HD Saison loan DL037340629', {
    issuer: 'HD Saison',
    amount: 2167404,
    minimum_payment: 1083702,
    per_period: 1083702,
    periods_remaining: 2,
    frequency: 'monthly',
    due_day_of_month: 12,
    due_date: '2026-05-12',
    ends_on: '2026-06-12',
    as_of: '2026-04-30',
    priority_score: 0,
    severity: 'low',
    note: 'Fixed schedule; periods 8/9 and 9/9 left.',
  }),
  mk('shopee_1', 'debt', 'Shopee installment 1', {
    issuer: 'Shopee',
    amount: 1257232,
    minimum_payment: 628616,
    per_period: 628616,
    periods_remaining: 2,
    frequency: 'monthly',
    due_day_of_month: 1,
    due_date: '2026-06-01',
    ends_on: '2026-07-01',
    as_of: '2026-04-30',
    priority_score: 0,
    severity: 'low',
    note: "Due day 1 → must be paid from previous month's salary. Periods 5/6 and 6/6 left.",
  }),
  mk('shopee_2', 'debt', 'Shopee installment 2', {
    issuer: 'Shopee',
    amount: 694987,
    minimum_payment: 694987,
    per_period: 694987,
    periods_remaining: 1,
    frequency: 'monthly',
    due_day_of_month: 27,
    due_date: '2026-05-27',
    ends_on: '2026-05-27',
    as_of: '2026-04-30',
    priority_score: 0,
    severity: 'low',
    note: 'Final period (3/3).',
  }),
  mk('rule_no_new_credit', 'rule', 'No new credit card charges', {
    severity: 'high',
    note: 'No new credit card transactions; avoid auto-debits where possible.',
  }),
  mk('rule_pay_minimum_before_due', 'rule', 'Pay minimum before due date', {
    severity: 'high',
    note: 'Pay minimum on every credit card before 17:00 on due_date.',
  }),
  mk('rule_extra_payment_timing', 'rule', 'Apply extra payment before statement day', {
    severity: 'medium',
    note: 'Pay extra to target debt before its statement_day_of_month to maximize interest reduction.',
  }),
  mk('rule_buffer_floor', 'rule', 'Maintain buffer of 1,000,000', {
    amount: 1000000,
    severity: 'medium',
    note: 'Keep at least 1,000,000 in vcb_checking as emergency buffer.',
  }),
  mk('risk_v1_credit_limit_breach', 'risk', 'Visa 1 may breach credit limit', {
    issuer: 'Techcombank',
    account_last_4: '1882',
    credit_limit: 53000000,
    available_credit: 523823,
    as_of: '2026-04-28',
    severity: 'high',
    note: 'Available credit only ~524k; any unexpected auto-debit may breach limit.',
  }),
  mk('risk_may_2026_tightness', 'risk', 'May 2026 cash flow tight', {
    amount: 1712289,
    as_of: '2026-05-01',
    severity: 'high',
    note: 'Tuition + minimum payments leave shortfall ~1,712,289 VND; absorbed by reducing misc expense this month.',
  }),
  mk('milestone_shopee_2_cleared', 'milestone', 'Shopee 2 cleared', {
    due_date: '2026-05-27', note: 'Linked to: shopee_2',
  }),
  mk('milestone_hd_saison_cleared', 'milestone', 'HD Saison cleared', {
    due_date: '2026-06-12', note: 'Linked to: hd_saison',
  }),
  mk('milestone_shopee_1_cleared', 'milestone', 'Shopee 1 cleared', {
    due_date: '2026-07-01', note: 'Linked to: shopee_1',
  }),
  mk('milestone_visa_2_cleared', 'milestone', 'Visa 2 cleared', {
    due_date: '2026-10-15', note: 'Linked to: visa_2',
  }),
  mk('milestone_visa_1_cleared', 'milestone', 'Visa 1 cleared (debt-free)', {
    due_date: '2027-02-15', note: 'Linked to: visa_1. Debt-free milestone.',
  }),
]

/** Build initial AppData từ v2 seed → derive legacy fields qua applyV2ToLegacy. */
const seedV2: AppData = applyV2ToLegacy({
  meta: seedMeta,
  items: seedItems,
  // Legacy field stubs (sẽ được overwrite bởi applyV2ToLegacy)
  expenses: [],
  incomes: [],
  extra_paid: 0,
  custom_daily_limit: 0,
  current_cash: { balance: 0, reserved: 0, as_of: '' },
  debts: { credit_cards: [], small_loans: [] },
  income: { monthly_net: 0, pay_date: 5 },
  rules: { daily_limit: { until_salary: 70000, after_salary: 100000 }, must_not: [] },
  payoff_timeline: { projected_debt_by_month: [] },
})

const d = ref<AppData>(seedV2)

// ─── Computed debt data ───────────────────────────────────────────────────
const {
  expenses, incomes, sortedTx, today, dToSalary, dayLimit, cashDaysLeft,
  todaySpent, todayOutflow, todayIncome, monthSpent, availCash, isOver, limPct, limSt,
  cashTrend, debtTrend, txTrend,
  debtCards, smallLoans, totalDebt, origDebt, repayPct, debtBreakdown,
  upcomingLabel, upcoming, milestones, freeMonthStr, findDebtId,
} = useDebtData(d)

// ─── Player tu vi · derived from repayPct (Phase 1 placeholder) ───────────
// Phase 2+ sẽ tính lvl/xp dựa trên streak, payment count, achievements.
const { mode: displayMode } = useDisplayMode()
const useTutien = computed(() => displayMode.value === 'tutien')
const playerXpMax = 500
const playerLvl = computed(() => Math.max(1, Math.floor(repayPct.value / 5) + 1))
const playerRealm = computed(() => realmOf(playerLvl.value))
const playerXp = computed(() => Math.min(playerXpMax, Math.floor(repayPct.value * 5)))
const playerXpPct = computed(() => (playerXp.value / playerXpMax) * 100)
const playerName = computed(() =>
  displayMode.value === 'tutien' ? 'Lưu Vân Đạo Hữu' : 'Đạo Hữu'
)

// ─── BossCard · Tâm Ma Tổng (final boss = totalDebt) ─────────────────────
function fmtDueShort(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}
const boss = computed(() => {
  const fb = finalBossFor(totalDebt.value)
  const next = upcoming.value[0]
  return {
    display: fb.display,
    real: t('boss.totalDebtReal'),
    realm: fb.realm,
    nextDate: next ? fmtDueShort(next._date) : '—',
    nextAmt: next ? next.amt : 0,
  }
})

// ─── EnemyRow data · gộp credit_cards + small_loans (Phase 11.6 fix) ────
// Small loans (HD Saison, Shopee, etc.) mapped sang CreditCard shape với
// credit_limit = balance để bar HP hiển thị đầy đủ. Nếu cần hpMax thực sự,
// dùng minimum_payment * periods_remaining (đại diện total còn lại).
const allEnemyDebts = computed(() => {
  const cards = d.value.debts?.credit_cards || []
  const loans = (d.value.debts?.small_loans || [])
    .filter((l) => (l.remaining_balance || 0) > 0)
    .map((l) => ({
      id: l.id,
      name: l.name,
      credit_limit: l.remaining_balance, // fallback: bar 100% (no limit info)
      balance: l.remaining_balance,
      interest_rate_annual: 0,
      minimum_payment: 0,
      ...(l.nameLang ? { nameLang: l.nameLang } : {}),
      ...(l.nameI18n ? { nameI18n: l.nameI18n } : {}),
    }))
  return [...cards, ...loans]
})

// ─── ManaCards · Linh khí ngày + Kim nguyên bảo ──────────────────────────
const manaLeft = computed(() => Math.max(0, dayLimit.value - todaySpent.value))
const manaPctUsed = computed(() => {
  if (dayLimit.value <= 0) return 0
  return Math.min(100, (todaySpent.value / dayLimit.value) * 100)
})

// ─── LevelUpToast trigger · watch playerLvl, pop toast 2.6s khi đột phá ─
const lvlUpShow = ref(false)
let lvlUpTimer: ReturnType<typeof setTimeout> | null = null
watch(playerLvl, (newLvl, oldLvl) => {
  if (oldLvl === undefined) return
  if (newLvl > oldLvl) {
    lvlUpShow.value = false
    nextTick(() => {
      lvlUpShow.value = true
      if (lvlUpTimer) clearTimeout(lvlUpTimer)
      lvlUpTimer = setTimeout(() => { lvlUpShow.value = false }, 2700)
    })
  }
})

// ─── Streak · số ngày liên tiếp không phá giới (max 30) ──────────────────
const streakDays = computed(() => {
  if (!dayLimit.value || dayLimit.value <= 0) return 0
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateKey =
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
    const daySum = expenses.value
      .filter((e) => e.date === dateKey)
      .reduce((s, e) => s + e.amount, 0)
    if (daySum <= dayLimit.value) streak++
    else break
  }
  return streak
})

/** Danh sách quy tắc đã bản địa hoá từ must_not + must_do (nếu có) */
const localizedRules = computed(() => [
  ...(d.value.rules?.must_not || []).map((r) => getRuleText(r)),
  ...(d.value.rules?.must_do || []).map((r) => getRuleText(r)),
])

// ─── Service worker + push notification setup ───────────────────────────
onMounted(() => {
  registerServiceWorker()
  checkPushStatus()
})

// ─── Push notification khi app sẵn sàng ──────────────────────────────────
watch(appState, (state) => {
  if (state === 'ready') {
    sendDueNotification(upcoming.value)
    sendPaydayNotification(d.value.income?.pay_date ?? 5)
  }
})

async function handleEnablePush(): Promise<void> {
  const result = await enablePushNotifications()
  if (result === 'granted') {
    toastFn('toast.pushEnabled')
  } else if (result === 'denied') {
    toastFn('toast.pushDenied', 'err')
  } else {
    toastFn('toast.pushError', 'err')
  }
}

function handleSavePushWorker(url: string): void {
  const { setWorkerUrl } = usePushNotifications()
  setWorkerUrl(url)
  toastFn('toast.pushWorkerSaved')
}

// ─── Setup composable ─────────────────────────────────────────────────────
// Payments is wired first so cleanupPastPaid can be passed to useAppSetup
const payments = usePayments(d, async () => { try { await api.push(d.value); return true } catch { return false } }, toastFn, tStr, findDebtId)
const { togglePaid, recPay, addOneTime, saveEdit, deleteUpcoming, handlePopupSaveUpcoming } = payments

const { loading, sErr, pushData, pullData, handleSetup, reconnect, hardReload, logout } = useAppSetup(
  d, appState, api, toastFn, () => payments.cleanupPastPaid()
)

// ─── Transaction composable ───────────────────────────────────────────────
const { copyTxData, addExp, addInc, deleteTx, handlePopupSaveTx } = useTransactions(d, pushData, toastFn, tStr, findDebtId)

// ─── Debt action composable ───────────────────────────────────────────────
const { updateCardDirect, addCash, updLimit, importNewJson } = useDebtActions(d, pushData, toastFn, tStr)

// ─── Popup state ──────────────────────────────────────────────────────────
const popupItem = ref<Record<string, unknown> | null>(null)
function openDetail(item: object, variant: string): void {
  popupItem.value = { ...(item as Record<string, unknown>), _variant: variant }
}

async function handlePopupSaveUpcomingWrapped(p: Parameters<typeof handlePopupSaveUpcoming>[0]): Promise<void> {
  popupItem.value = null
  await handlePopupSaveUpcoming(p)
  // Nếu chỉnh ngày thành hôm nay → reset dedup và gửi lại notification
  if (p._buf?.date === tStr()) {
    clearDueDedup()
    await sendDueNotification(upcoming.value)
  }
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

async function handleQuickAdd(tx: TransactionItem): Promise<void> {
  const now = new Date()
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  const common = {
    desc: tx.desc || '',
    amount: tx.amount || 0,
    cat: tx.cat || 'khac',
    currency: tx.currency,
    note: tx.note,
    time: timeStr,
  }
  if (tx.type === 'inc') {
    await addInc(common)
  } else {
    await addExp({ ...common, payMethod: tx.payMethod })
  }
}

function handleCopy(item: Record<string, unknown>): void {
  popupItem.value = null
  // Cả upcoming và transaction đều prefill vào Add tab (Phase 2: bỏ inline upcoming form)
  // Upcoming clone tạm map sang dạng expense — Phase 7 sẽ phân biệt one-time vs payment.
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

// ─── Wrappers that need script-scope refs ─────────────────────────────────
// importErr is a Ref<string> — auto-unwrapped in template, so pass from script scope
async function handleImportJson(jsonStr: string): Promise<void> {
  await importNewJson(jsonStr, importErr)
}

// ─── Init ─────────────────────────────────────────────────────────────────
if (isConfigured.value) pullData()
</script>
