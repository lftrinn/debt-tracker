import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData } from '@/types/data'

export interface CashDataResult {
  spentSinceSnapshot: ComputedRef<number>
  availCash: ComputedRef<number>
  unpaidObsToPayday: ComputedRef<number>
  cashDaysLeft: ComputedRef<number | null>
}

/**
 * Tính toán số dư tiền mặt khả dụng, chi tiêu kể từ snapshot, và số ngày tiền mặt còn đủ dùng.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @param dayLimit - Hạn mức chi tiêu mỗi ngày (computed từ useDailyLimit)
 * @param actualPayDate - Hàm tính ngày lương thực tế (đã điều chỉnh cuối tuần)
 * @returns spentSinceSnapshot, availCash, unpaidObsToPayday, cashDaysLeft
 */
export function useCashData(
  d: Ref<AppData>,
  dayLimit: ComputedRef<number>,
  actualPayDate: (year: number, month: number, nominalDay: number) => Date,
): CashDataResult {
  // Chỉ tính chi tiêu tiền mặt (loại trừ thanh toán nghĩa vụ _obTag và giao dịch qua thẻ)
  const spentSinceSnapshot = computed((): number => {
    const asOf = d.value.current_cash?.as_of
    if (!asOf) return 0
    return (d.value.expenses || [])
      .filter((e) => e.date >= asOf && !e._obTag && (!e.payMethod || e.payMethod === 'cash'))
      .reduce((s, e) => s + e.amount, 0)
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
   * Tổng các nghĩa vụ chưa thanh toán từ hôm nay đến ngày lương tiếp theo.
   * Dùng để ước tính tiền cần giữ lại, không nên tiêu vào.
   */
  const unpaidObsToPayday = computed((): number => {
    const paid = new Set(d.value.paid_obligations || [])
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const pd = d.value.income?.pay_date || 5
    let nextPay = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    if (nextPay <= now) nextPay = actualPayDate(now.getFullYear(), now.getMonth() + 1, pd)
    const payStr = nextPay.toISOString().slice(0, 10)

    let total = 0
    const plans = d.value.monthly_plans || {}
    Object.values(plans).forEach((plan) => {
      ;(plan.obligations || []).forEach((ob) => {
        if (ob.monthly) return
        const dateStr = ob.date || ob['date ']
        if (!dateStr) return
        const key = dateStr + ':' + ob.name
        if (paid.has(key)) return
        if (dateStr >= todayStr && dateStr < payStr) total += ob.amount || 0
      })
    })
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const key = ev.date + ':' + ev.name
      if (paid.has(key)) return
      if (ev.date >= todayStr && ev.date < payStr) total += ev.amount || 0
    })
    return total
  })

  /**
   * Ước tính số ngày tiền mặt còn đủ dùng dựa trên hạn mức chi tiêu ngày.
   * Trả về null nếu hạn mức chưa được cài đặt.
   */
  const cashDaysLeft = computed((): number | null => {
    const lim = dayLimit.value
    if (lim <= 0) return null
    const cashAfterObs = availCash.value - unpaidObsToPayday.value
    if (cashAfterObs <= 0) return 0
    return Math.floor(cashAfterObs / lim)
  })

  return { spentSinceSnapshot, availCash, unpaidObsToPayday, cashDaysLeft }
}
