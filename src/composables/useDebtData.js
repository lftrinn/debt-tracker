import { computed } from 'vue'
import { useFormatters } from './useFormatters'
import { useColors } from './useColors'

/**
 * Computed debt-related data derived from the main data store
 */
export function useDebtData(d) {
  const { fS, isT, isTM, dDiff } = useFormatters()
  const { palette } = useColors()

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

  // Adjust pay date for weekends: Sat → Fri (−1), Sun → Mon (+1)
  function actualPayDate(year, month, nominalDay) {
    const dt = new Date(year, month, nominalDay)
    const dow = dt.getDay()
    if (dow === 6) dt.setDate(dt.getDate() - 1)
    if (dow === 0) dt.setDate(dt.getDate() + 1)
    return dt
  }

  const dToSalary = computed(() => {
    const now = new Date()
    const pd = d.value.income?.pay_date || 5
    let t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    if (t <= now) t = actualPayDate(now.getFullYear(), now.getMonth() + 1, pd)
    return Math.ceil((t - now) / 86400000)
  })

  const afterSalary = computed(() => {
    const now = new Date()
    const pd = d.value.income?.pay_date || 5
    const t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    return now >= t
  })

  // Daily limit from settings (no recalculation)
  const dayLimit = computed(() => {
    if (d.value.custom_daily_limit > 0) return d.value.custom_daily_limit
    const dl = d.value.rules?.daily_limit
    return afterSalary.value ? dl?.after_salary || 100000 : dl?.until_salary || 70000
  })

  // Exclude obligation payments (_obTag) from daily/monthly spending — they are debt payments, not daily expenses
  const todaySpent = computed(() =>
    expenses.value.filter((e) => isT(e.date) && !e._obTag).reduce((s, e) => s + e.amount, 0)
  )

  const monthSpent = computed(() =>
    expenses.value.filter((e) => isTM(e.date) && !e._obTag).reduce((s, e) => s + e.amount, 0)
  )

  // Total expenses since current_cash.as_of (inclusive)
  // Exclude obligation payments (_obTag) — those already deducted from balance directly
  const spentSinceSnapshot = computed(() => {
    const asOf = d.value.current_cash?.as_of
    if (!asOf) return 0
    return expenses.value
      .filter((e) => e.date >= asOf && !e._obTag)
      .reduce((s, e) => s + e.amount, 0)
  })

  // Total incomes since current_cash.as_of (inclusive, already added to balance on addInc)
  // Note: addInc already adds to current_cash.balance, so we don't add incomes here
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

  const isOver = computed(
    () => dayLimit.value > 0 && todaySpent.value > dayLimit.value
  )

  const limPct = computed(() =>
    !dayLimit.value ? 0 : Math.round((todaySpent.value / dayLimit.value) * 100)
  )

  const limSt = computed(() =>
    limPct.value >= 100 ? 'over' : limPct.value >= 75 ? 'warn' : 'safe'
  )

  // Today's income total
  const todayIncome = computed(() =>
    incomes.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  // Total outflow today (including obligation payments) — for trend display
  const todayOutflow = computed(() =>
    expenses.value.filter((e) => isT(e.date)).reduce((s, e) => s + e.amount, 0)
  )

  // Cash trend: based on ALL money in/out today (including debt payments)
  const cashTrend = computed(() => {
    if (todayOutflow.value === 0 && todayIncome.value === 0) return 'neutral'
    return todayIncome.value > todayOutflow.value ? 'up' : 'down'
  })

  // Debt trend: only count payments that actually reduce debt (credit cards / small loans)
  const debtTrend = computed(() => {
    const paidObs = d.value.paid_obligations || []
    const extraPaid = d.value.extra_paid || 0
    const hasDebtPayment = paidObs.some((key) => {
      const name = key.split(':').slice(1).join(':')
      return findDebtId(name) !== null
    })
    if (hasDebtPayment || extraPaid > 0) return 'down'
    return 'neutral'
  })

  // Transaction trend for today: same as cashTrend
  const txTrend = computed(() => cashTrend.value)

  const debtCards = computed(() =>
    (d.value.debts?.credit_cards || []).map((c) => ({
      id: c.id,
      name: c.name.replace(' — Techcombank', '').replace(' — ', ''),
      balance: c.balance,
      limit: c.credit_limit,
      rate: Math.round(c.interest_rate_annual * 100),
      min: c.minimum_payment,
    }))
  )

  const smallLoans = computed(() =>
    (d.value.debts?.small_loans || []).filter((l) => (l.remaining_balance || 0) > 0)
  )

  const totalDebt = computed(() => {
    const cc = (d.value.debts?.credit_cards || []).reduce(
      (s, c) => s + (c.balance || 0),
      0
    )
    const sl = (d.value.debts?.small_loans || []).reduce(
      (s, l) => s + (l.remaining_balance || 0),
      0
    )
    return Math.max(0, cc + sl)
  })

  const origDebt = computed(() => d.value.debts?.summary?.total || 91721251)

  const repayPct = computed(() =>
    Math.min(
      100,
      Math.max(0, Math.round((1 - totalDebt.value / origDebt.value) * 100))
    )
  )

  const debtBreakdown = computed(() => {
    const cc = (d.value.debts?.credit_cards || []).map((c, i) => ({
      name: c.name.replace(' — Techcombank', ''),
      val: c.balance,
      color: palette[i % palette.length],
    }))
    const sl = (d.value.debts?.small_loans || [])
      .filter((l) => (l.remaining_balance || 0) > 0)
      .map((l, i) => ({
        name: l.name.length > 24 ? l.name.slice(0, 24) + '…' : l.name,
        val: l.remaining_balance,
        color: palette[(cc.length + i) % palette.length],
      }))
    return [...cc, ...sl]
  })

  const upcomingLabel = computed(() => {
    const now = new Date()
    return 'T' + String(now.getMonth() + 1) + '/' + now.getFullYear()
  })

  const upcoming = computed(() => {
    const plans = d.value.monthly_plans || {}
    const paid = new Set(d.value.paid_obligations || [])
    const now = new Date()
    const months = [0, 1, 2].map((i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return dt.toISOString().slice(0, 7)
    })
    const items = []

    months.forEach((mo) => {
      const plan = plans[mo]
      if (!plan?.obligations) return
      plan.obligations.forEach((ob) => {
        if (ob.monthly) return
        const dateStr = ob.date || ob['date ']
        if (!dateStr) return
        const diff = dDiff(dateStr)
        if (diff < -2) return
        const d2 = new Date(dateStr)
        const key = dateStr + ':' + ob.name
        items.push({
          _key: key,
          day: String(d2.getDate()).padStart(2, '0'),
          mo: String(d2.getMonth() + 1).padStart(2, '0'),
          name: ob.name,
          sub: ob.category === 'debt_minimum' ? 'Thanh toán tối thiểu' : null,
          amt: ob.amount,
          paid: paid.has(key),
          urg: paid.has(key)
            ? 'ok'
            : diff < 0
              ? 'urgent'
              : diff <= 5
                ? 'urgent'
                : diff <= 10
                  ? 'soon'
                  : 'ok',
          _date: dateStr,
          source: 'monthly_plan',
          _mo: mo,
        })
      })
    })

    // One-time expenses
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const diff = dDiff(ev.date)
      if (diff < -2) return
      const d2 = new Date(ev.date)
      const key = ev.date + ':' + ev.name
      items.push({
        _key: key,
        day: String(d2.getDate()).padStart(2, '0'),
        mo: String(d2.getMonth() + 1).padStart(2, '0'),
        name: ev.name,
        sub: 'Khoản chi một lần 📌',
        amt: ev.amount,
        paid: paid.has(key),
        urg: paid.has(key)
          ? 'ok'
          : diff <= 5
            ? 'urgent'
            : diff <= 10
              ? 'soon'
              : 'ok',
        _date: ev.date,
        source: 'one_time',
        _id: ev.id,
      })
    })

    return items.sort((a, b) => a._date.localeCompare(b._date)).slice(0, 10)
  })

  const milestones = computed(() => {
    const now = new Date().toISOString().slice(0, 7)
    const raw = d.value.payoff_timeline?.milestones || []
    const debtMap = {}
    ;(d.value.payoff_timeline?.projected_debt_by_month || []).forEach((p) => {
      debtMap[p.month] = p.total_debt
    })

    if (raw.length) {
      return raw.map((m) => ({
        month: m.month,
        ev:
          m.event ||
          (m.month === '2026-11' ? '🏆 THOÁT NỢ HOÀN TOÀN' : m.month),
        debt: debtMap[m.month] ?? null,
        st: m.month < now ? 'done' : m.month === now ? 'active' : 'future',
      }))
    }

    return (d.value.payoff_timeline?.projected_debt_by_month || []).map((p) => ({
      month: p.month,
      ev:
        p.total_debt === 0
          ? '🏆 Thoát nợ hoàn toàn'
          : 'Nợ: ₫' + fS(p.total_debt),
      debt: p.total_debt,
      st: p.month < now ? 'done' : p.month === now ? 'active' : 'future',
    }))
  })

  // Match obligation name → debt id for auto-update
  function findDebtId(name) {
    const n = name.toLowerCase()
    const cards = d.value.debts?.credit_cards || []
    for (const c of cards) {
      const cn = c.name.toLowerCase()
      if (n.includes('visa 1') || (cn.includes('visa 1') && n.includes('visa'))) {
        if (n.includes('visa 1') || n.includes('867011'))
          return { type: 'cc', id: c.id }
      }
      if (n.includes('visa 2') || (cn.includes('visa 2') && n.includes('visa'))) {
        if (n.includes('visa 2') || n.includes('867028'))
          return { type: 'cc', id: c.id }
      }
    }
    const loans = d.value.debts?.small_loans || []
    for (const l of loans) {
      const ln = l.name.toLowerCase().split(' ').slice(0, 2).join(' ')
      if (
        n.includes(ln) ||
        ln.split(' ').every((w) => w.length > 2 && n.includes(w))
      ) {
        return { type: 'sl', id: l.id }
      }
    }
    return null
  }

  return {
    expenses,
    incomes,
    sortedTx,
    today,
    dToSalary,
    afterSalary,
    dayLimit,
    cashDaysLeft,
    todaySpent,
    todayOutflow,
    todayIncome,
    monthSpent,
    availCash,
    cashTrend,
    debtTrend,
    txTrend,
    isOver,
    limPct,
    limSt,
    debtCards,
    smallLoans,
    totalDebt,
    origDebt,
    repayPct,
    debtBreakdown,
    upcomingLabel,
    upcoming,
    milestones,
    findDebtId,
  }
}
