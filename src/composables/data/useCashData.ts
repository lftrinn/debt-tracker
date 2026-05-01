import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData } from '@/types/data'
import { useItems } from './useItems'

export interface CashDataResult {
  spentSinceSnapshot: ComputedRef<number>
  availCash: ComputedRef<number>
  unpaidObsToPayday: ComputedRef<number>
  unpaidObsAmounts: ComputedRef<number[]>
  cashDaysLeft: ComputedRef<number | null>
}

/**
 * Tính số dư tiền mặt khả dụng, chi tiêu kể từ snapshot, và số ngày tiền mặt còn đủ.
 * Đọc trực tiếp từ items[]:
 *   - account[primary] cho balance + as_of
 *   - expense_log với cat !== 'thanhToan' và pay_method ∈ {null, 'cash'} cho spentSinceSnapshot
 *   - fixed_expense + one_time_expense - payment_record cho unpaid obligations
 */
export function useCashData(
  d: Ref<AppData>,
  dayLimit: ComputedRef<number>,
  actualPayDate: (year: number, month: number, nominalDay: number) => Date,
): CashDataResult {
  const {
    primaryAccount,
    primaryIncome,
    expenseLogs,
    fixedExpenses,
    oneTimeExpenses,
    paidKeys,
  } = useItems(d)

  const spentSinceSnapshot = computed((): number => {
    const asOf = primaryAccount.value?.as_of
    if (!asOf) return 0
    return expenseLogs.value
      .filter((e) =>
        e.due_date >= asOf &&
        !e.ref_id &&
        (!e.pay_method || e.pay_method === 'cash')
      )
      .reduce((s, e) => s + e.amount, 0)
  })

  const availCash = computed((): number => {
    const acc = primaryAccount.value
    if (!acc) return 0
    return (acc.amount || 0) - (acc.reserved || 0) - spentSinceSnapshot.value
  })

  const unpaidObsItems = computed((): number[] => {
    const paid = paidKeys.value
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const pd = primaryIncome.value?.due_day_of_month ?? 5
    let nextPay = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    if (nextPay <= now) nextPay = actualPayDate(now.getFullYear(), now.getMonth() + 1, pd)
    const payStr = nextPay.toISOString().slice(0, 10)

    const amounts: number[] = []

    // Fixed expense: chỉ tính item có due_date cụ thể trong [today, payStr)
    for (const fe of fixedExpenses.value) {
      const dateStr = fe.due_date
      if (!dateStr) continue
      const key = dateStr + ':' + fe.name
      if (paid.has(key)) continue
      if (dateStr >= todayStr && dateStr < payStr) amounts.push(fe.amount || 0)
    }

    // One-time expense
    for (const ote of oneTimeExpenses.value) {
      const key = ote.due_date + ':' + ote.name
      if (paid.has(key)) continue
      if (ote.due_date >= todayStr && ote.due_date < payStr) amounts.push(ote.amount || 0)
    }

    return amounts
  })

  const unpaidObsToPayday = computed((): number =>
    unpaidObsItems.value.reduce((s, a) => s + a, 0)
  )

  const unpaidObsAmounts = unpaidObsItems

  const cashDaysLeft = computed((): number | null => {
    const lim = dayLimit.value
    if (lim <= 0) return null
    const cashAfterObs = availCash.value - unpaidObsToPayday.value
    if (cashAfterObs <= 0) return 0
    return Math.floor(cashAfterObs / lim)
  })

  return { spentSinceSnapshot, availCash, unpaidObsToPayday, unpaidObsAmounts, cashDaysLeft }
}
