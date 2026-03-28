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
  // Exclude Visa payments — those don't reduce cash, they increase card balance
  const spentSinceSnapshot = computed(() => {
    const asOf = d.value.current_cash?.as_of
    if (!asOf) return 0
    return expenses.value
      .filter((e) => e.date >= asOf && !e._obTag && (!e.payMethod || e.payMethod === 'cash'))
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

  // Check if all minimum payment obligations for a card are paid
  // Only count obligations with dates <= the card's min_due_date
  const minPaidByCard = computed(() => {
    const paid = new Set(d.value.paid_obligations || [])
    const plans = d.value.monthly_plans || {}
    const now = new Date()
    // Collect obligations from current and next 2 months
    const months = [0, 1, 2].map((i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return dt.toISOString().slice(0, 7)
    })
    const allObs = []
    months.forEach((mo) => {
      const plan = plans[mo]
      if (plan?.obligations) {
        plan.obligations.forEach((ob) => allObs.push(ob))
      }
    })
    // Also include one_time_expenses as virtual obligations (for CC payments created via add popup)
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const evMonth = (ev.date || '').slice(0, 7)
      if (months.includes(evMonth)) {
        allObs.push({ name: ev.name, date: ev.date, amount: ev.amount, category: null })
      }
    })
    if (allObs.length === 0) return {}
    const result = {}
    const cards = d.value.debts?.credit_cards || []
    cards.forEach((c) => {
      const shortName = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase().trim()
      const dueDate = c.min_due_date || ''
      // Find payment obligations for this card (minimum or custom level)
      // Only include obligations with date <= card's min_due_date
      const cardObs = allObs.filter((ob) => {
        if (ob.monthly) return false
        const obName = (ob.name || '').toLowerCase()
        const matchesCard = obName.includes(shortName)
        if (!matchesCard) return false
        // Match: debt_minimum, custom CC payment (category null), or name contains min/minimum
        const isCcPayment = ob.category === 'debt_minimum'
          || (ob.category == null && matchesCard)
          || obName.includes('min')
          || obName.includes('tối thiểu')
          || obName.includes('minimum')
        if (!isCcPayment) return false
        // If card has a due date, only count obligations on or before that date
        const obDate = ob.date || ob['date ']
        if (dueDate && obDate) return obDate <= dueDate
        return true
      })
      if (cardObs.length === 0) {
        result[c.id] = false
      } else {
        result[c.id] = cardObs.every((ob) => {
          const dateStr = ob.date || ob['date ']
          const key = dateStr + ':' + ob.name
          return paid.has(key)
        })
      }
    })
    return result
  })

  const debtCards = computed(() =>
    (d.value.debts?.credit_cards || []).map((c) => {
      const dueDate = c.min_due_date || ''
      const daysLeft = dueDate ? dDiff(dueDate) : null
      const paid = minPaidByCard.value[c.id] || false
      // Urgency: paid → 'ok', overdue → 'overdue', ≤3d → 'urgent', ≤7d → 'soon', else 'normal'
      let minUrg = 'normal'
      if (paid) minUrg = 'ok'
      else if (daysLeft !== null) {
        if (daysLeft <= 0) minUrg = 'overdue'
        else if (daysLeft <= 3) minUrg = 'urgent'
        else if (daysLeft <= 7) minUrg = 'soon'
      }
      // Find planned payment for this card in the upcoming month
      const cardShort = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase()
      const nowMonth = new Date().toISOString().slice(0, 7)
      const nextMonth = (() => { const dt = new Date(); dt.setMonth(dt.getMonth() + 1); return dt.toISOString().slice(0, 7) })()
      let plannedPayment = null
      // Check one_time_expenses for a payment matching this card in current or next month
      for (const ev of (d.value.one_time_expenses || [])) {
        const evName = (ev.name || '').toLowerCase()
        if (!evName.includes(cardShort)) continue
        const evMonth = (ev.date || '').slice(0, 7)
        if (evMonth === nowMonth || evMonth === nextMonth) {
          const isMin = evName.includes('minimum')
          plannedPayment = { amount: ev.amount, isMin, name: ev.name, date: ev.date }
          break
        }
      }
      // Also check upcoming items from monthly_plans (include paid items to preserve label)
      if (!plannedPayment) {
        const plans = d.value.monthly_plans || {}
        for (const mo of [nowMonth, nextMonth]) {
          const obs = plans[mo]?.obligations || []
          for (const ob of obs) {
            if (ob.monthly) continue
            const obName = (ob.name || '').toLowerCase()
            if (!obName.includes(cardShort)) continue
            // Match debt_minimum or CC payments edited to custom (category null but name matches card)
            if (ob.category && ob.category !== 'debt_minimum') continue
            const isMin = obName.includes('minimum')
            plannedPayment = { amount: ob.amount, isMin, name: ob.name, date: ob.date || '' }
            break
          }
          if (plannedPayment) break
        }
      }
      return {
        id: c.id,
        name: c.name.replace(' — Techcombank', '').replace(' — ', ''),
        balance: c.balance,
        limit: c.credit_limit,
        rate: Math.round(c.interest_rate_annual * 100),
        min: c.minimum_payment,
        minDueDate: dueDate,
        minDaysLeft: daysLeft,
        minPaid: paid,
        minUrg,
        plannedPayment,
      }
    })
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
    const todayStr = now.toISOString().slice(0, 10)
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
        const key = dateStr + ':' + ob.name
        const isPaid = paid.has(key)
        // Hide paid items whose date is in the past
        if (isPaid && dateStr < todayStr) return
        if (!isPaid && diff < -30) return
        const d2 = new Date(dateStr)
        const overdueDays = dateStr < todayStr ? Math.abs(diff) : 0
        items.push({
          _key: key,
          day: String(d2.getDate()).padStart(2, '0'),
          mo: String(d2.getMonth() + 1).padStart(2, '0'),
          name: ob.name,
          sub: overdueDays > 0
            ? `Chậm ${overdueDays} ngày`
            : ob.category === 'debt_minimum' ? 'Thanh toán tối thiểu' : null,
          amt: ob.amount,
          paid: isPaid,
          urg: isPaid
            ? 'ok'
            : overdueDays > 0
              ? 'overdue'
              : diff <= 5
                ? 'urgent'
                : diff <= 10
                  ? 'soon'
                  : 'ok',
          _date: dateStr,
          source: 'monthly_plan',
          _category: ob.category || null,
          _isLastPeriod: ob.category === 'installment' && (ob.name || '').includes('kỳ cuối'),
          _mo: mo,
          overdueDays,
        })
      })
    })

    // One-time expenses
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const diff = dDiff(ev.date)
      const key = ev.date + ':' + ev.name
      const isPaid = paid.has(key)
      // Hide paid items whose date is in the past
      if (isPaid && ev.date < todayStr) return
      if (!isPaid && diff < -30) return
      const d2 = new Date(ev.date)
      const overdueDays = ev.date < todayStr ? Math.abs(diff) : 0
      items.push({
        _key: key,
        day: String(d2.getDate()).padStart(2, '0'),
        mo: String(d2.getMonth() + 1).padStart(2, '0'),
        name: ev.name,
        sub: overdueDays > 0
          ? `Chậm ${overdueDays} ngày`
          : null,
        amt: ev.amount,
        paid: isPaid,
        urg: isPaid
          ? 'ok'
          : overdueDays > 0
            ? 'overdue'
            : diff <= 5
              ? 'urgent'
              : diff <= 10
                ? 'soon'
                : 'ok',
        _date: ev.date,
        source: 'one_time',
        _id: ev.id,
        overdueDays,
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
      // Extract short name from card (e.g. "Visa 1" from "Visa 1 — Techcombank")
      const shortName = cn.split(' — ')[0].trim()
      // Match if obligation name contains the card's short name
      if (shortName && n.includes(shortName)) {
        return { type: 'cc', id: c.id }
      }
      // Fallback: match by card number fragments in the name
      if (c.id && n.includes(c.id)) {
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
