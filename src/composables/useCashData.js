import { computed } from 'vue'

/**
 * Available cash, spending snapshot, and cash runway computations.
 * @param {import('vue').Ref} d - main data ref
 * @param {import('vue').ComputedRef<number>} dayLimit - from useDailyLimit
 * @param {Function} actualPayDate - from useDailyLimit
 */
export function useCashData(d, dayLimit, actualPayDate) {
  // Total cash expenses since current_cash.as_of
  // Excludes obligation payments (_obTag) and Visa payments (those increase card balance, not reduce cash)
  const spentSinceSnapshot = computed(() => {
    const asOf = d.value.current_cash?.as_of
    if (!asOf) return 0
    return (d.value.expenses || [])
      .filter((e) => e.date >= asOf && !e._obTag && (!e.payMethod || e.payMethod === 'cash'))
      .reduce((s, e) => s + e.amount, 0)
  })

  const availCash = computed(() => {
    const c = d.value.current_cash
    if (!c) return 0
    return (c.balance || 0) - (c.reserved || 0) - spentSinceSnapshot.value
  })

  // Sum of unpaid obligations between today and next payday
  const unpaidObsToPayday = computed(() => {
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

  // How many days current cash can last after subtracting upcoming obligations
  const cashDaysLeft = computed(() => {
    const lim = dayLimit.value
    if (lim <= 0) return null
    const cashAfterObs = availCash.value - unpaidObsToPayday.value
    if (cashAfterObs <= 0) return 0
    return Math.floor(cashAfterObs / lim)
  })

  return { spentSinceSnapshot, availCash, unpaidObsToPayday, cashDaysLeft }
}
