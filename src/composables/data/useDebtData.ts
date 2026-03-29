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
 * App.vue dùng composable này duy nhất; các sub-composable xử lý từng mảng chức năng riêng.
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

  /** Tháng hoàn thành trả nợ, lấy từ projected_debt_by_month (tháng đầu tiên total_debt = 0). */
  const freeMonthStr = computed((): string => {
    const pts = d.value.payoff_timeline?.projected_debt_by_month || []
    const zero = pts.find((p) => p.total_debt === 0)
    if (zero) return zero.month
    const raws = d.value.payoff_timeline?.milestones || []
    if (raws.length) return raws[raws.length - 1].month
    return ''
  })

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

  const today = computed((): string => {
    const locale = (i18n.global.locale as { value: string }).value
    const now = new Date()
    if (locale === 'en') return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    if (locale === 'ja') return now.toLocaleDateString('ja-JP', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
    return now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  })

  // ─── Daily / monthly spending ─────────────────────────────────────────
  // Loại trừ _obTag để không tính kép thanh toán nghĩa vụ vào chi tiêu hàng ngày/tháng
  const todaySpent = computed((): number =>
    expenses.value.filter((e) => isT(e.date) && !e._obTag).reduce((s, e) => s + e.amount, 0)
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
   * Chiều hướng tiền mặt trong tháng: 'up' nếu thu > chi, 'down' nếu ngược lại, 'neutral' nếu không có giao dịch.
   * Reset khi sang tháng mới (dùng isTM), không reset hàng ngày.
   */
  const cashTrend: ComputedRef<TrendDirection> = computed(() => {
    if (monthSpent.value === 0 && monthIncome.value === 0) return 'neutral'
    return monthIncome.value > monthSpent.value ? 'up' : 'down'
  })

  const txTrend: ComputedRef<TrendDirection> = computed(() => cashTrend.value)

  // ─── Smart daily limit ────────────────────────────────────────────────
  /**
   * Hạn mức chi tiêu thực tế = min(baseDayLimit, tiền mặt còn sau nghĩa vụ).
   * Nếu tiền không đủ trang trải tất cả nghĩa vụ: chọn greedy (nhỏ trước) và lấy phần dư.
   * custom_daily_limit > 0 bỏ qua logic này.
   */
  const effectiveDayLimit: ComputedRef<number> = computed((): number => {
    const baseLimit = dayLimit.value
    if (d.value.custom_daily_limit > 0) return baseLimit
    const cash = availCash.value
    const cashAfterObs = cash - unpaidObsToPayday.value
    if (cashAfterObs >= 0) return Math.min(baseLimit, cashAfterObs)
    // Không đủ trả tất cả: greedy chọn khoản nhỏ nhất trước
    const amounts = unpaidObsAmounts.value.slice().sort((a, b) => a - b)
    let remaining = cash
    for (const amt of amounts) {
      if (remaining >= amt) remaining -= amt
      else break
    }
    return Math.min(baseLimit, Math.max(0, remaining))
  })

  /**
   * Số ngày còn đủ tiền mặt dựa trên effectiveDayLimit.
   */
  const smartCashDaysLeft: ComputedRef<number | null> = computed((): number | null => {
    const lim = effectiveDayLimit.value
    if (lim <= 0) return 0
    const cash = availCash.value
    const obsTotal = unpaidObsToPayday.value
    const cashAfterObs = cash - obsTotal
    if (cashAfterObs >= 0) {
      return Math.floor(cashAfterObs / lim)
    }
    // Greedy: tính lại phần dư sau khi trả các khoản nhỏ nhất
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
