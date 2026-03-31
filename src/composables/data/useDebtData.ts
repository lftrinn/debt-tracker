import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, LimitStatus, TrendDirection } from '@/types/data'
import { i18n } from '../../i18n'
import { useFormatters } from '../ui/useFormatters'
import { useDailyLimit } from './useDailyLimit'
import { useCashData } from './useCashData'
import { useDebtCards } from './useDebtCards'
import { useUpcoming } from './useUpcoming'
import { useTimeline } from './useTimeline'

/**
 * Composable gốc — tổng hợp toàn bộ dữ liệu tài chính/nợ cho ứng dụng.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @returns Tất cả computed values và helpers cần thiết cho UI
 */
export function useDebtData(d: Ref<AppData>) {
  const { isT, isTM } = useFormatters()

  // ─── Sub-composables ──────────────────────────────────────────────────
  const { actualPayDate, dToSalary, afterSalary, dayLimit } = useDailyLimit(d)
  const { spentSinceSnapshot, availCash, unpaidObsToPayday, unpaidObsAmounts, cashDaysLeft } = useCashData(d, dayLimit, actualPayDate)
  const { findDebtId, minPaidByCard, debtCards, smallLoans, totalDebt, origDebt, repayPct, debtBreakdown, debtTrend } = useDebtCards(d)
  const { upcomingLabel, upcoming } = useUpcoming(d)
  const { milestones } = useTimeline(d)

  /** freeMonthStr: luôn rỗng trong v2 (payoff_timeline bị xoá) */
  const freeMonthStr = computed((): string => '')

  // ─── Base transaction lists ───────────────────────────────────────────
  const expenses = computed(() => (d.value.transactions || []).filter((t) => t.type === 'exp'))
  const incomes = computed(() => (d.value.transactions || []).filter((t) => t.type === 'inc'))

  /**
   * Gộp và sắp xếp tất cả giao dịch theo ngày mới nhất lên đầu.
   */
  const sortedTx = computed(() =>
    (d.value.transactions || []).slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  )

  const today = computed((): string => {
    const locale = (i18n.global.locale as { value: string }).value
    const now = new Date()
    if (locale === 'en') return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    if (locale === 'ja') return now.toLocaleDateString('ja-JP', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
    return now.toLocaleDateString('vi-VN', { weekday: 'narrow', day: '2-digit', month: '2-digit', year: 'numeric' })
  })

  // ─── Daily / monthly spending ─────────────────────────────────────────
  const todaySpent = computed((): number =>
    expenses.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  const monthSpent = computed((): number =>
    expenses.value.filter((e) => isTM(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  const todayOutflow = computed((): number =>
    expenses.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  const todayIncome = computed((): number =>
    incomes.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  const monthIncome = computed((): number =>
    incomes.value.filter((e) => isTM(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  // ─── Limit status ─────────────────────────────────────────────────────
  const isOver: ComputedRef<boolean> = computed(() => dayLimit.value > 0 && todaySpent.value > dayLimit.value)

  const limPct: ComputedRef<number> = computed(() =>
    !dayLimit.value ? 0 : Math.round((todaySpent.value / dayLimit.value) * 100)
  )

  const limSt: ComputedRef<LimitStatus> = computed(() =>
    limPct.value >= 100 ? 'over' : limPct.value >= 75 ? 'warn' : 'safe'
  )

  // ─── Trend directions ─────────────────────────────────────────────────
  const cashTrend: ComputedRef<TrendDirection> = computed(() => {
    if (monthSpent.value === 0 && monthIncome.value === 0) return 'neutral'
    return monthIncome.value > monthSpent.value ? 'up' : 'down'
  })

  const txTrend: ComputedRef<TrendDirection> = computed(() => cashTrend.value)

  // ─── Smart daily limit ────────────────────────────────────────────────
  const effectiveDayLimit: ComputedRef<number> = computed((): number => {
    const baseLimit = dayLimit.value
    if (d.value.custom_daily_limit > 0) return baseLimit
    const cash = availCash.value
    const cashAfterObs = cash - unpaidObsToPayday.value
    if (cashAfterObs >= 0) return Math.min(baseLimit, cashAfterObs)
    const amounts = unpaidObsAmounts.value.slice().sort((a, b) => a - b)
    let remaining = cash
    for (const amt of amounts) {
      if (remaining >= amt) remaining -= amt
      else break
    }
    return Math.min(baseLimit, Math.max(0, remaining))
  })

  const smartCashDaysLeft: ComputedRef<number | null> = computed((): number | null => {
    const lim = effectiveDayLimit.value
    if (lim <= 0) return 0
    const cash = availCash.value
    const obsTotal = unpaidObsToPayday.value
    const cashAfterObs = cash - obsTotal
    if (cashAfterObs >= 0) {
      return Math.floor(cashAfterObs / lim)
    }
    const amounts = unpaidObsAmounts.value.slice().sort((a, b) => a - b)
    let remaining = cash
    for (const amt of amounts) {
      if (remaining >= amt) remaining -= amt
      else break
    }
    if (remaining <= 0) return 0
    return Math.floor(remaining / lim)
  })

  return {
    expenses,
    incomes,
    sortedTx,
    today,
    todaySpent,
    todayOutflow,
    todayIncome,
    monthSpent,
    dToSalary,
    afterSalary,
    dayLimit: effectiveDayLimit,
    isOver,
    limPct,
    limSt,
    availCash,
    cashDaysLeft: smartCashDaysLeft,
    spentSinceSnapshot,
    unpaidObsToPayday,
    debtCards,
    smallLoans,
    totalDebt,
    origDebt,
    repayPct,
    debtBreakdown,
    findDebtId,
    cashTrend,
    debtTrend,
    txTrend,
    upcomingLabel,
    upcoming,
    milestones,
    freeMonthStr,
  }
}
