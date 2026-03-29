import { computed } from 'vue'
import { useFormatters } from './useFormatters'
import { useDailyLimit } from './useDailyLimit'
import { useCashData } from './useCashData'
import { useDebtCards } from './useDebtCards'
import { useUpcoming } from './useUpcoming'
import { useTimeline } from './useTimeline'

/**
 * Root composable — orchestrates all debt/finance computed data.
 * App.vue consumes this single composable; sub-composables handle focused concerns.
 * @param {import('vue').Ref} d - main data ref (AppData)
 */
export function useDebtData(d) {
  const { isT, isTM } = useFormatters()

  // ─── Sub-composables ──────────────────────────────────────────────────
  const { actualPayDate, dToSalary, afterSalary, dayLimit } = useDailyLimit(d)
  const { spentSinceSnapshot, availCash, unpaidObsToPayday, cashDaysLeft } = useCashData(d, dayLimit, actualPayDate)
  const { findDebtId, minPaidByCard, debtCards, smallLoans, totalDebt, origDebt, repayPct, debtBreakdown, debtTrend } = useDebtCards(d)
  const { upcomingLabel, upcoming } = useUpcoming(d)
  const { milestones } = useTimeline(d)

  // ─── Base transaction lists ───────────────────────────────────────────
  const expenses = computed(() => d.value.expenses || [])
  const incomes = computed(() => d.value.incomes || [])

  const sortedTx = computed(() =>
    [
      ...expenses.value.map((e) => ({ ...e, type: 'exp' })),
      ...incomes.value.map((e) => ({ ...e, type: 'inc' })),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  )

  const today = computed(() =>
    new Date().toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  )

  // ─── Daily / monthly spending ─────────────────────────────────────────
  // Exclude obligation payments (_obTag) from daily/monthly spending
  const todaySpent = computed(() =>
    expenses.value.filter((e) => isT(e.date) && !e._obTag).reduce((s, e) => s + e.amount, 0)
  )

  const monthSpent = computed(() =>
    expenses.value.filter((e) => isTM(e.date) && !e._obTag).reduce((s, e) => s + e.amount, 0)
  )

  // Total outflow today including obligation payments (for trend display)
  const todayOutflow = computed(() =>
    expenses.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  const todayIncome = computed(() =>
    incomes.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  // ─── Limit status (depends on todaySpent + dayLimit) ─────────────────
  const isOver = computed(() => dayLimit.value > 0 && todaySpent.value > dayLimit.value)

  const limPct = computed(() =>
    !dayLimit.value ? 0 : Math.round((todaySpent.value / dayLimit.value) * 100)
  )

  const limSt = computed(() =>
    limPct.value >= 100 ? 'over' : limPct.value >= 75 ? 'warn' : 'safe'
  )

  // ─── Trend directions ─────────────────────────────────────────────────
  const cashTrend = computed(() => {
    if (todayOutflow.value === 0 && todayIncome.value === 0) return 'neutral'
    return todayIncome.value > todayOutflow.value ? 'up' : 'down'
  })

  const txTrend = computed(() => cashTrend.value)

  return {
    // Transaction lists
    expenses,
    incomes,
    sortedTx,
    today,
    // Spending
    todaySpent,
    todayOutflow,
    todayIncome,
    monthSpent,
    // Limit
    dToSalary,
    afterSalary,
    dayLimit,
    isOver,
    limPct,
    limSt,
    // Cash
    availCash,
    cashDaysLeft,
    spentSinceSnapshot,
    unpaidObsToPayday,
    // Debt
    debtCards,
    smallLoans,
    totalDebt,
    origDebt,
    repayPct,
    debtBreakdown,
    findDebtId,
    // Trends
    cashTrend,
    debtTrend,
    txTrend,
    // Upcoming / Timeline
    upcomingLabel,
    upcoming,
    milestones,
  }
}
