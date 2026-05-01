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

  <!-- DETAIL POPUP · chỉ upcoming variant theo design (PayQuestPopup) -->
  <DetailPopup
    :item="popupItem"
    :availCash="availCash"
    :hide="!!hz('upcoming.amount')"
    @close="popupItem = null"
    @toggle-paid="(k: string, a: number, n: string) => { popupItem = null; togglePaid(k, a, n) }"
    @delete="handlePopupDelete"
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

        <!-- Alert · chỉ hiện khi vượt giới (theo design) -->
        <div v-if="isOver" class="alert warn">
          <IconWarn :size="18" class="ic" />
          <div><b>Phá giới!</b> Linh khí vượt mức {{ fCurr(todaySpent - dayLimit) }} — giảm 1 tu vi.</div>
        </div>

        <!-- Tâm Ma · Final boss = totalDebt (tier-aware) -->
        <BossCard
          :display="boss.display"
          :real="boss.real"
          :tier="boss.tier"
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
          act="+ Triệu hồi"
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
          :act="`${items.paymentRecords.value.length}/24`"
        />
        <AchievementList
          :paidCount="items.paymentRecords.value.length"
          :isOver="isOver"
          :repayPct="repayPct"
          :max="3"
        />
      </template>

      <!-- ADD · Xuất Kiếm ──────────────────────────────────────────── -->
      <AddTransaction
        v-if="tab === 'add'"
        :syncing="syncing"
        :creditCards="items.creditCards.value"
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
        @delete-tx="(tx: any) => deleteTx(tx)"
        @quick-add="handleQuickAdd"
      />

      <!-- CHT · Tu Vi Ký ───────────────────────────────────────────── -->
      <ChartsPanel
        v-if="tab === 'cht'"
        :expenses="expenses"
        :incomes="incomes"
        :debtBreakdown="debtBreakdown"
        :projectedDebt="d.meta?.projected_debt_by_month || []"
        :hide="{ spend: hz('charts.spend'), debtLine: hz('charts.debtLine'), pie: hz('charts.pie') }"
      />

      <!-- MAP · Lộ Đồ ──────────────────────────────────────────────── -->
      <TimelinePanel
        v-if="tab === 'map'"
        :milestones="milestones"
        :hide="{ debt: hz('timeline.debt'), eventAmt: hz('timeline.eventAmt') }"
        :paidCount="items.paymentRecords.value.length"
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
        :syncMsg="syncMsgText"
        :syncTime="syncTime"
        :pushStatus="pushStatus"
        :playerName="playerName"
        :playerRealm="playerRealm"
        :playerLvl="playerLvl"
        :hideFlag="hideAmounts"
        @update-limit="updLimit"
        @enable-push="handleEnablePush"
        @logout="logout"
        @reload="hardReload"
        @toggle-hide="toggleHide"
        @export-json="handleExport"
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
import { IconScroll, IconDemon, IconTrophy, IconWarn } from './components/ui/quest-icons'

// Tu Tiên foundations — useTheme/useDisplayMode singletons khởi tạo qua import
// (side effect ở module level: theme đồng bộ class body.light)
import { useDisplayMode } from './composables/ui/useDisplayMode'
import './composables/ui/useTheme' // ensure theme class applied
import { realmOf } from './composables/data/useTutienNames'
import { bossForAmount, tierByKey, type BossTier } from './composables/data/useBossTiers'
import { useItems } from './composables/data/useItems'
import {
  type Item,
  type Meta,
  mkAccount,
  mkIncomeRecurring,
  mkFixedExpense,
  mkOneTimeExpense,
  mkDebt,
  mkHiddenInstallment,
  mkRule,
  mkRisk,
  mkMilestone,
  isDebt,
  isRule,
} from './types/data'

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
  schema_note: 'v2 unified items[] · per-type discriminated union',
  daily_limit: { until_salary: 70000, after_salary: 100000 },
  custom_daily_limit: 0,
  extra_paid: 0,
  projected_debt_by_month: [],
  debt_summary_total: 91721251,
}

const seedItems: Item[] = [
  mkAccount('vcb_checking', 'VCB checking', {
    issuer: 'VCB',
    amount: 1668727,
    as_of: '2026-04-30',
    note: 'Primary checking; salary is deposited here.',
  }),
  mkIncomeRecurring('salary_april_2026', 'Luong thang 04/2026 (received 05/05)', {
    issuer: 'Dr.JOY',
    amount: 22792714,
    per_period: 22792714,
    frequency: 'monthly',
    due_day_of_month: 5,
    due_date: '2026-05-05',
    as_of: '2026-04-30',
    note: 'Net actual from payslip: gross 26,000,000 - insurance 2,730,000 - PIT 380,143 - union 130,000 + lunch 200,000 - 1.08h unpaid leave.',
  }),
  mkFixedExpense('rent_may_2026', 'Tien nha thang 05', {
    amount: 4838000,
    per_period: 4838000,
    frequency: 'monthly',
    due_day_of_month: 5,
    due_date: '2026-05-05',
    note: 'May actual: room 4,000,000 + electricity 187kWh*4,000 + water 30,000 + service 60,000.',
  }),
  mkFixedExpense('living_expense', 'Sinh hoat', {
    amount: 3000000,
    per_period: 3000000,
    frequency: 'monthly',
  }),
  mkFixedExpense('misc_expense_may_2026', 'Chi phi khac (May reduced)', {
    amount: 1287711,
    per_period: 3000000,
    frequency: 'monthly',
    note: 'Baseline 3,000,000/month; reduced this month to absorb tuition shortfall (1,712,289 cut).',
  }),
  mkOneTimeExpense('tuition_may_2026', 'Hoc phi 13 tin chi', {
    amount: 7046000,
    frequency: 'one_time',
    due_day_of_month: 18,
    due_date: '2026-05-18',
    note: '13 credits x 542,000 VND/credit.',
  }),
  mkDebt('visa_1', 'Techcombank Visa 1 (...1882)', {
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
      mkHiddenInstallment('v1_inst_hyperskill', 'HYPERSKILL', {
        issuer: 'HYPERSKILL', amount: 435442, per_period: 435442, periods_remaining: 1,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-05-28', as_of: '2026-04-28',
        note: 'Auto-debits on V1 statement day. 11/12 paid, 1 left.',
      }),
      mkHiddenInstallment('v1_inst_claude', 'CLAUDE.AI SUBSCRIPTION', {
        issuer: 'ANTHROPIC', amount: 403142, per_period: 403142, periods_remaining: 1,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-05-28', as_of: '2026-04-28',
        non_cancellable: true,
        note: 'Cannot cancel. 5/6 paid, 1 left.',
      }),
      mkHiddenInstallment('v1_inst_fpt_tiktok', 'FPT*TIKTOKSHOP', {
        issuer: 'FPT', amount: 378232, per_period: 189116, periods_remaining: 2,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-06-28', as_of: '2026-04-28',
        note: '4/6 paid, 2 left.',
      }),
      mkHiddenInstallment('v1_inst_9pay_tiktok', '9PAY*TikTok Shop', {
        issuer: '9PAY', amount: 347074, per_period: 173537, periods_remaining: 2,
        frequency: 'monthly', due_day_of_month: 28, statement_day_of_month: 28,
        ends_on: '2026-06-28', as_of: '2026-04-28',
        note: '4/6 paid, 2 left.',
      }),
    ],
  }),
  mkDebt('visa_2', 'Techcombank Visa 2 (...5444)', {
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
      mkHiddenInstallment('v2_inst_9pay_tiktok', '9PAY*TIKTOKSHOP', {
        issuer: '9PAY', amount: 620272, per_period: 310136, periods_remaining: 2,
        frequency: 'monthly', due_day_of_month: 20, statement_day_of_month: 20,
        ends_on: '2026-06-20', as_of: '2026-04-20',
        note: '4/6 paid, 2 left.',
      }),
    ],
  }),
  mkDebt('hd_saison', 'HD Saison loan DL037340629', {
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
  mkDebt('shopee_1', 'Shopee installment 1', {
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
  mkDebt('shopee_2', 'Shopee installment 2', {
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
  mkRule('rule_no_new_credit', 'No new credit card charges', {
    severity: 'high',
    note: 'No new credit card transactions; avoid auto-debits where possible.',
  }),
  mkRule('rule_pay_minimum_before_due', 'Pay minimum before due date', {
    severity: 'high',
    note: 'Pay minimum on every credit card before 17:00 on due_date.',
  }),
  mkRule('rule_extra_payment_timing', 'Apply extra payment before statement day', {
    severity: 'medium',
    note: 'Pay extra to target debt before its statement_day_of_month to maximize interest reduction.',
  }),
  mkRule('rule_buffer_floor', 'Maintain buffer of 1,000,000', {
    amount: 1000000,
    severity: 'medium',
    note: 'Keep at least 1,000,000 in vcb_checking as emergency buffer.',
  }),
  mkRisk('risk_v1_credit_limit_breach', 'Visa 1 may breach credit limit', {
    issuer: 'Techcombank',
    account_last_4: '1882',
    credit_limit: 53000000,
    available_credit: 523823,
    as_of: '2026-04-28',
    severity: 'high',
    note: 'Available credit only ~524k; any unexpected auto-debit may breach limit.',
  }),
  mkRisk('risk_may_2026_tightness', 'May 2026 cash flow tight', {
    amount: 1712289,
    as_of: '2026-05-01',
    severity: 'high',
    note: 'Tuition + minimum payments leave shortfall ~1,712,289 VND; absorbed by reducing misc expense this month.',
  }),
  mkMilestone('milestone_shopee_2_cleared', 'Shopee 2 cleared', {
    due_date: '2026-05-27', note: 'Linked to: shopee_2',
  }),
  mkMilestone('milestone_hd_saison_cleared', 'HD Saison cleared', {
    due_date: '2026-06-12', note: 'Linked to: hd_saison',
  }),
  mkMilestone('milestone_shopee_1_cleared', 'Shopee 1 cleared', {
    due_date: '2026-07-01', note: 'Linked to: shopee_1',
  }),
  mkMilestone('milestone_visa_2_cleared', 'Visa 2 cleared', {
    due_date: '2026-10-15', note: 'Linked to: visa_2',
  }),
  mkMilestone('milestone_visa_1_cleared', 'Visa 1 cleared (debt-free)', {
    due_date: '2027-02-15', note: 'Linked to: visa_1. Debt-free milestone.',
  }),
]

const d = ref<AppData>({ meta: seedMeta, items: seedItems })
const items = useItems(d)

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

/**
 * Final boss tier — pin to 'tavuong' khi user là story owner (nợ lớn nhưng cố
 * định lăng kính), hoặc derive động theo `tierForAmount(totalDebt)`. Hiện tại
 * dùng động.
 */
const FORCE_FINAL_TIER: BossTier['key'] | null = null
const bossDescriptor = computed(() => {
  const totalSeed = 'tam-ma-tong'
  if (FORCE_FINAL_TIER) {
    const tier = tierByKey(FORCE_FINAL_TIER)
    return { tier, name: 'Tâm Ma Tổng' }
  }
  const desc = bossForAmount(totalDebt.value, totalSeed)
  // Final boss luôn dùng tên cố định "Tâm Ma Tổng" (override tier name pool)
  return { tier: desc.tier, name: 'Tâm Ma Tổng' }
})

const boss = computed(() => {
  const next = upcoming.value[0]
  const desc = bossDescriptor.value
  return {
    display: desc.name,
    real: t('boss.totalDebtReal'),
    tier: desc.tier,
    nextDate: next ? fmtDueShort(next._date) : '—',
    nextAmt: next ? next.amt : 0,
  }
})

// ─── EnemyRow data · DebtItem[] (cards + active small loans) ────────────
// Small loan (credit_limit=null) hiển thị bar 100% (limit fallback = balance).
const allEnemyDebts = computed(() =>
  items.debts.value.filter((dt) => (dt.amount || 0) > 0).map((dt) => ({
    ...dt,
    credit_limit: dt.credit_limit ?? dt.amount,
  }))
)

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
    const dt = new Date()
    dt.setDate(dt.getDate() - i)
    const dateKey =
      dt.getFullYear() + '-' +
      String(dt.getMonth() + 1).padStart(2, '0') + '-' +
      String(dt.getDate()).padStart(2, '0')
    const daySum = expenses.value
      .filter((e) => e.date === dateKey)
      .reduce((s, e) => s + e.amount, 0)
    if (daySum <= dayLimit.value) streak++
    else break
  }
  return streak
})

/** Danh sách quy tắc đã bản địa hoá từ rule items. */
const localizedRules = computed(() =>
  items.rules.value.map((r) => getRuleText({ text: r.name, textLang: r.nameLang, textI18n: r.nameI18n }))
)
void isDebt; void isRule

// ─── Service worker + push notification setup ───────────────────────────
onMounted(() => {
  registerServiceWorker()
  checkPushStatus()
})

// ─── Push notification khi app sẵn sàng ──────────────────────────────────
watch(appState, (state) => {
  if (state === 'ready') {
    sendDueNotification(upcoming.value)
    sendPaydayNotification(items.primaryIncome.value?.due_day_of_month ?? 5)
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
const { togglePaid, deleteUpcoming } = payments
void payments  // recPay/addOneTime/saveEdit/cleanupPastPaid available qua payments object

const { loading, sErr, pushData, pullData, handleSetup, reconnect, hardReload, logout } = useAppSetup(
  d, appState, api, toastFn, () => payments.cleanupPastPaid()
)

// ─── Transaction composable ───────────────────────────────────────────────
const { copyTxData, addExp, addInc, deleteTx } = useTransactions(d, pushData, toastFn, tStr)

// ─── Debt action composable ───────────────────────────────────────────────
const { updateCardDirect, updLimit } = useDebtActions(d, pushData, toastFn, tStr)

// ─── Popup state · DetailPopup chỉ render upcoming variant theo design ──
const popupItem = ref<Record<string, unknown> | null>(null)
function openDetail(item: object, variant: string): void {
  popupItem.value = { ...(item as Record<string, unknown>), _variant: variant }
}

async function handlePopupDelete(item: object): Promise<void> {
  popupItem.value = null
  await deleteUpcoming(item as Parameters<typeof deleteUpcoming>[0])
}

async function handleQuickAdd(tx: TransactionItem): Promise<void> {
  const now = new Date()
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  const common = {
    desc: tx.desc || '',
    amount: tx.amount || 0,
    cat: tx.cat || 'khac',
    currency: 'VND',
    note: tx.note ?? undefined,
    time: timeStr,
  }
  if (tx.type === 'inc') {
    await addInc(common)
  } else {
    await addExp({ ...common, payMethod: tx.pay_method ?? undefined })
  }
}

/** Export current data — copy JSON to clipboard hoặc tải CSV. */
async function handleExport(format: 'json' | 'csv'): Promise<void> {
  if (format === 'json') {
    const json = JSON.stringify({ meta: d.value.meta, items: d.value.items }, null, 2)
    if (navigator.clipboard) await navigator.clipboard.writeText(json)
    else {
      const ta = document.createElement('textarea')
      ta.value = json
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  } else {
    // CSV: chỉ expense_log + income_log
    const items = d.value.items
    const lines = ['type,date,time,desc,amount,cat,pay_method,currency,note']
    for (const i of items) {
      if (i.type !== 'expense_log' && i.type !== 'income_log') continue
      const row = [
        i.type === 'expense_log' ? 'exp' : 'inc',
        i.due_date, i.time ?? '',
        '"' + (i.name || '').replace(/"/g, '""') + '"',
        i.amount,
        i.cat,
        i.type === 'expense_log' ? (i.pay_method ?? '') : '',
        i.currency ?? '',
        '"' + (i.note ?? '').replace(/"/g, '""') + '"',
      ]
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chien-ky-${tStr()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────
if (isConfigured.value) pullData()
</script>
