import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, LimitStatus, TrendDirection, TransactionItem } from '@/types/data'
import { i18n } from '../../i18n'
import { useFormatters } from '../ui/useFormatters'
import { useDailyLimit } from './useDailyLimit'
import { useCashData } from './useCashData'
import { useDebtCards } from './useDebtCards'
import { useUpcoming } from './useUpcoming'
import { useTimeline } from './useTimeline'
import { useItems } from './useItems'

/**
 * Aggregator — tổng hợp toàn bộ dữ liệu tài chính/nợ cho ứng dụng.
 * App.vue dùng composable này duy nhất; các sub-composable xử lý từng mảng riêng.
 */
export function useDebtData(d: Ref<AppData>) {
  const { isT, isTM } = useFormatters()
  const { expenseLogs, incomeLogs } = useItems(d)

  const { actualPayDate, dToSalary, afterSalary, dayLimit } = useDailyLimit(d)
  const { spentSinceSnapshot, availCash, unpaidObsToPayday, unpaidObsAmounts, cashDaysLeft } = useCashData(d, dayLimit, actualPayDate)
  const { findDebtId, minPaidByCard, debtCards, smallLoans, totalDebt, origDebt, repayPct, debtBreakdown, debtTrend } = useDebtCards(d)
  const { upcomingLabel, upcoming } = useUpcoming(d)
  const { milestones } = useTimeline(d)

  /** Tháng hoàn thành trả nợ — đầu tiên total_debt = 0 trong projected. */
  const freeMonthStr = computed((): string => {
    const pts = d.value.meta?.projected_debt_by_month ?? []
    const zero = pts.find((p) => p.total_debt === 0)
    if (zero) return zero.month
    if (pts.length) return pts[pts.length - 1].month
    return ''
  })

  /** Map ExpenseLogItem → TransactionItem (UI shape, dùng `date` thay vì `due_date`). */
  const expenses = computed((): TransactionItem[] =>
    expenseLogs.value.map((e): TransactionItem => ({
      id: e.id,
      type: 'exp',
      desc: e.name,
      amount: e.amount,
      cat: e.cat,
      date: e.due_date,
      pay_method: e.pay_method ?? null,
      currency: e.currency ?? null,
      time: e.time ?? null,
      note: e.note ?? null,
      ref_id: e.ref_id ?? null,
      descLang: e.nameLang,
      descI18n: e.nameI18n,
      descI18nMeta: e.nameI18nMeta,
    }))
  )

  const incomes = computed((): TransactionItem[] =>
    incomeLogs.value.map((i): TransactionItem => ({
      id: i.id,
      type: 'inc',
      desc: i.name,
      amount: i.amount,
      cat: i.cat,
      date: i.due_date,
      pay_method: null,
      currency: i.currency ?? null,
      time: i.time ?? null,
      note: i.note ?? null,
      ref_id: null,
      descLang: i.nameLang,
      descI18n: i.nameI18n,
      descI18nMeta: i.nameI18nMeta,
    }))
  )

  const sortedTx = computed((): TransactionItem[] =>
    [...expenses.value, ...incomes.value].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    )
  )

  const today = computed((): string => {
    const locale = (i18n.global.locale as { value: string }).value
    const now = new Date()
    if (locale === 'en') return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    if (locale === 'ja') return now.toLocaleDateString('ja-JP', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
    return now.toLocaleDateString('vi-VN', { weekday: 'narrow', day: '2-digit', month: '2-digit', year: 'numeric' })
  })

  // Loại trừ ref_id (= payment) khỏi tính daily/monthly spending
  const todaySpent = computed((): number =>
    expenseLogs.value.filter((e) => isT(e.due_date) && !e.ref_id).reduce((s, e) => s + e.amount, 0)
  )

  const monthSpent = computed((): number =>
    expenseLogs.value.filter((e) => isTM(e.due_date)).reduce((s, e) => s + e.amount, 0)
  )

  const todayOutflow = computed((): number =>
    expenseLogs.value.filter((e) => isT(e.due_date)).reduce((s, e) => s + e.amount, 0)
  )

  const todayIncome = computed((): number =>
    incomeLogs.value.filter((i) => isT(i.due_date)).reduce((s, i) => s + i.amount, 0)
  )

  const monthIncome = computed((): number =>
    incomeLogs.value.filter((i) => isTM(i.due_date)).reduce((s, i) => s + i.amount, 0)
  )

  const isOver: ComputedRef<boolean> = computed(() => dayLimit.value > 0 && todaySpent.value > dayLimit.value)

  const limPct: ComputedRef<number> = computed(() =>
    !dayLimit.value ? 0 : Math.round((todaySpent.value / dayLimit.value) * 100)
  )

  const limSt: ComputedRef<LimitStatus> = computed(() =>
    limPct.value >= 100 ? 'over' : limPct.value >= 75 ? 'warn' : 'safe'
  )

  const cashTrend: ComputedRef<TrendDirection> = computed(() => {
    if (monthSpent.value === 0 && monthIncome.value === 0) return 'neutral'
    return monthIncome.value > monthSpent.value ? 'up' : 'down'
  })

  const txTrend: ComputedRef<TrendDirection> = computed(() => cashTrend.value)

  /** Hạn mức thực tế = min(baseDayLimit, tiền mặt còn sau nghĩa vụ). */
  const effectiveDayLimit: ComputedRef<number> = computed((): number => {
    const baseLimit = dayLimit.value
    if ((d.value.meta?.custom_daily_limit ?? 0) > 0) return baseLimit
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
    if (cashAfterObs >= 0) return Math.floor(cashAfterObs / lim)
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
    minPaidByCard,
    cashTrend,
    debtTrend,
    txTrend,
    upcomingLabel,
    upcoming,
    milestones,
    freeMonthStr,
  }
}
