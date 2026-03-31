import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData } from '@/types/data'

export interface CashDataResult {
  spentSinceSnapshot: ComputedRef<number>
  availCash: ComputedRef<number>
  unpaidObsToPayday: ComputedRef<number>
  unpaidObsAmounts: ComputedRef<number[]>
  cashDaysLeft: ComputedRef<number | null>
}

/**
 * Tính toán số dư tiền mặt khả dụng, chi tiêu kể từ snapshot, và số ngày tiền mặt còn đủ dùng.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @param dayLimit - Hạn mức chi tiêu mỗi ngày (computed từ useDailyLimit)
 * @param actualPayDate - Hàm tính ngày lương thực tế (đã điều chỉnh cuối tuần)
 * @returns spentSinceSnapshot, availCash, unpaidObsToPayday, unpaidObsAmounts, cashDaysLeft
 */
export function useCashData(
  d: Ref<AppData>,
  dayLimit: ComputedRef<number>,
  actualPayDate: (year: number, month: number, nominalDay: number) => Date,
): CashDataResult {
  // Chỉ tính chi tiêu tiền mặt (loại trừ giao dịch qua thẻ)
  const spentSinceSnapshot = computed((): number => {
    const asOf = d.value.current_cash?.as_of
    if (!asOf) return 0
    return (d.value.transactions || [])
      .filter((t) => t.type === 'exp' && t.date >= asOf && (!t.payMethod || t.payMethod === 'cash'))
      .reduce((s, t) => s + t.amount, 0)
  })

  /**
   * Tiền mặt thực sự có thể dùng = số dư - dự trữ - đã chi kể từ snapshot.
   */
  const availCash = computed((): number => {
    const c = d.value.current_cash
    if (!c) return 0
    return (c.balance || 0) - (c.reserved || 0) - spentSinceSnapshot.value
  })

  /**
   * Danh sách số tiền từng nghĩa vụ chưa thanh toán từ hôm nay đến ngày lương tiếp theo.
   * Dùng để smart daily limit tính greedy khi tiền không đủ trang trải tất cả.
   */
  const unpaidObsItems = computed((): number[] => {
    const paid = new Set(d.value.paid_obligations || [])
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const pd = d.value.income?.pay_date || 5
    let nextPay = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    if (nextPay <= now) nextPay = actualPayDate(now.getFullYear(), now.getMonth() + 1, pd)
    const payStr = nextPay.toISOString().slice(0, 10)

    const amounts: number[] = []
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const key = ev.date + ':' + ev.name
      if (paid.has(key)) return
      if (ev.date >= todayStr && ev.date < payStr) amounts.push(ev.amount || 0)
    })
    return amounts
  })

  /**
   * Tổng các nghĩa vụ chưa thanh toán từ hôm nay đến ngày lương tiếp theo.
   */
  const unpaidObsToPayday = computed((): number =>
    unpaidObsItems.value.reduce((s, a) => s + a, 0)
  )

  /** Danh sách từng khoản nghĩa vụ (dùng cho smart limit greedy). */
  const unpaidObsAmounts: ComputedRef<number[]> = unpaidObsItems

  /**
   * Ước tính số ngày tiền mặt còn đủ dùng dựa trên hạn mức chi tiêu ngày.
   */
  const cashDaysLeft = computed((): number | null => {
    const lim = dayLimit.value
    if (lim <= 0) return null
    const cashAfterObs = availCash.value - unpaidObsToPayday.value
    if (cashAfterObs <= 0) return 0
    return Math.floor(cashAfterObs / lim)
  })

  return { spentSinceSnapshot, availCash, unpaidObsToPayday, unpaidObsAmounts, cashDaysLeft }
}
