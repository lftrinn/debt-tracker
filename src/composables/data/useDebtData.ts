import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, LimitStatus, TrendDirection } from '@/types/data'
import { useFormatters } from '../ui/useFormatters'
import { useDailyLimit } from './useDailyLimit'
import { useCashData } from './useCashData'
import { useDebtCards } from './useDebtCards'
import { useUpcoming } from './useUpcoming'
import { useTimeline } from './useTimeline'

/**
 * Composable gốc — tổng hợp toàn bộ dữ liệu tài chính/nợ cho ứng dụng.
 * App.vue dùng composable này duy nhất; các sub-composable xử lý từng mảng chức năng riêng.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @returns Tất cả computed values và helpers cần thiết cho UI
 */
export function useDebtData(d: Ref<AppData>) {
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

  /**
   * Gộp và sắp xếp tất cả giao dịch (chi tiêu + thu nhập) theo ngày mới nhất lên đầu.
   * Dùng id để phân biệt thứ tự khi cùng ngày.
   */
  const sortedTx = computed(() =>
    [
      ...expenses.value.map((e) => ({ ...e, type: 'exp' as const })),
      ...incomes.value.map((e) => ({ ...e, type: 'inc' as const })),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  )

  const today = computed((): string =>
    new Date().toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  )

  // ─── Daily / monthly spending ─────────────────────────────────────────
  // Loại trừ _obTag để không tính kép thanh toán nghĩa vụ vào chi tiêu hàng ngày/tháng
  const todaySpent = computed((): number =>
    expenses.value.filter((e) => isT(e.date) && !e._obTag).reduce((s, e) => s + e.amount, 0)
  )

  const monthSpent = computed((): number =>
    expenses.value.filter((e) => isTM(e.date) && !e._obTag).reduce((s, e) => s + e.amount, 0)
  )

  const todayOutflow = computed((): number =>
    expenses.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  const todayIncome = computed((): number =>
    incomes.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  // ─── Limit status (depends on todaySpent + dayLimit) ─────────────────
  const isOver: ComputedRef<boolean> = computed(() => dayLimit.value > 0 && todaySpent.value > dayLimit.value)

  const limPct: ComputedRef<number> = computed(() =>
    !dayLimit.value ? 0 : Math.round((todaySpent.value / dayLimit.value) * 100)
  )

  const limSt: ComputedRef<LimitStatus> = computed(() =>
    limPct.value >= 100 ? 'over' : limPct.value >= 75 ? 'warn' : 'safe'
  )

  // ─── Trend directions ─────────────────────────────────────────────────
  /**
   * Chiều hướng tiền mặt trong ngày: 'up' nếu thu > chi, 'down' nếu ngược lại, 'neutral' nếu không có giao dịch.
   */
  const cashTrend: ComputedRef<TrendDirection> = computed(() => {
    if (todayOutflow.value === 0 && todayIncome.value === 0) return 'neutral'
    return todayIncome.value > todayOutflow.value ? 'up' : 'down'
  })

  const txTrend: ComputedRef<TrendDirection> = computed(() => cashTrend.value)

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
    dayLimit,
    isOver,
    limPct,
    limSt,
    availCash,
    cashDaysLeft,
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
  }
}
