import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, DebtCard, DebtRef, TrendDirection } from '@/types/data'
import { useFormatters } from './useFormatters'
import { useColors } from './useColors'

export interface DebtCardsResult {
  findDebtId: (name: string) => DebtRef | null
  minPaidByCard: ComputedRef<Record<string, boolean>>
  debtCards: ComputedRef<DebtCard[]>
  smallLoans: ComputedRef<AppData['debts']['small_loans']>
  totalDebt: ComputedRef<number>
  origDebt: ComputedRef<number>
  repayPct: ComputedRef<number>
  debtBreakdown: ComputedRef<Array<{ name: string; val: number; color: string }>>
  debtTrend: ComputedRef<TrendDirection>
}

/**
 * Credit card and small loan derived data, debt totals, and minimum payment tracking.
 */
export function useDebtCards(d: Ref<AppData>): DebtCardsResult {
  const { dDiff } = useFormatters()
  const { palette } = useColors()

  /** Match obligation name → debt id for auto-update */
  function findDebtId(name: string): DebtRef | null {
    const n = name.toLowerCase()
    const cards = d.value.debts?.credit_cards || []
    for (const c of cards) {
      const cn = c.name.toLowerCase()
      const shortName = cn.split(' — ')[0].trim()
      if (shortName && n.includes(shortName)) return { type: 'cc', id: c.id }
      if (c.id && n.includes(c.id)) return { type: 'cc', id: c.id }
    }
    const loans = d.value.debts?.small_loans || []
    for (const l of loans) {
      const ln = l.name.toLowerCase().split(' ').slice(0, 2).join(' ')
      if (n.includes(ln) || ln.split(' ').every((w) => w.length > 2 && n.includes(w))) {
        return { type: 'sl', id: l.id }
      }
    }
    return null
  }

  // Check if all minimum payment obligations for a card are paid
  const minPaidByCard = computed((): Record<string, boolean> => {
    const paid = new Set(d.value.paid_obligations || [])
    const plans = d.value.monthly_plans || {}
    const now = new Date()
    const months = [0, 1, 2].map((i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return dt.toISOString().slice(0, 7)
    })
    const allObs: Array<{ name: string; date?: string; 'date '?: string; amount: number; category: string | null }> = []
    months.forEach((mo) => {
      const plan = plans[mo]
      if (plan?.obligations) {
        plan.obligations.forEach((ob) => allObs.push({ ...ob, category: ob.category ?? null }))
      }
    })
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const evMonth = (ev.date || '').slice(0, 7)
      if (months.includes(evMonth)) {
        allObs.push({ name: ev.name, date: ev.date, amount: ev.amount, category: null })
      }
    })
    if (allObs.length === 0) return {}
    const result: Record<string, boolean> = {}
    const cards = d.value.debts?.credit_cards || []
    cards.forEach((c) => {
      const shortName = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase().trim()
      const dueDate = c.min_due_date || ''
      const cardObs = allObs.filter((ob) => {
        const obName = (ob.name || '').toLowerCase()
        const matchesCard = obName.includes(shortName)
        if (!matchesCard) return false
        const isCcPayment =
          ob.category === 'debt_minimum' ||
          (ob.category == null && matchesCard) ||
          obName.includes('min') ||
          obName.includes('tối thiểu') ||
          obName.includes('minimum')
        if (!isCcPayment) return false
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

  const debtCards = computed((): DebtCard[] =>
    (d.value.debts?.credit_cards || []).map((c): DebtCard => {
      const dueDate = c.min_due_date || ''
      const daysLeft = dueDate ? dDiff(dueDate) : null
      const paid = minPaidByCard.value[c.id] || false
      let minUrg: DebtCard['minUrg'] = 'normal'
      if (paid) minUrg = 'ok'
      else if (daysLeft !== null) {
        if (daysLeft <= 0) minUrg = 'overdue'
        else if (daysLeft <= 3) minUrg = 'urgent'
        else if (daysLeft <= 7) minUrg = 'soon'
      }
      const cardShort = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase()
      const nowMonth = new Date().toISOString().slice(0, 7)
      const nextMonth = (() => {
        const dt = new Date()
        dt.setMonth(dt.getMonth() + 1)
        return dt.toISOString().slice(0, 7)
      })()
      let plannedPayment: DebtCard['plannedPayment'] = null
      for (const ev of d.value.one_time_expenses || []) {
        const evName = (ev.name || '').toLowerCase()
        if (!evName.includes(cardShort)) continue
        const evMonth = (ev.date || '').slice(0, 7)
        if (evMonth === nowMonth || evMonth === nextMonth) {
          plannedPayment = { amount: ev.amount, isMin: evName.includes('minimum'), name: ev.name, date: ev.date }
          break
        }
      }
      if (!plannedPayment) {
        const plans = d.value.monthly_plans || {}
        outer: for (const mo of [nowMonth, nextMonth]) {
          const obs = plans[mo]?.obligations || []
          for (const ob of obs) {
            if (ob.monthly) continue
            const obName = (ob.name || '').toLowerCase()
            if (!obName.includes(cardShort)) continue
            if (ob.category && ob.category !== 'debt_minimum') continue
            plannedPayment = { amount: ob.amount, isMin: obName.includes('minimum'), name: ob.name, date: ob.date || '' }
            break outer
          }
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

  const totalDebt = computed((): number => {
    const cc = (d.value.debts?.credit_cards || []).reduce((s, c) => s + (c.balance || 0), 0)
    const sl = (d.value.debts?.small_loans || []).reduce((s, l) => s + (l.remaining_balance || 0), 0)
    return Math.max(0, cc + sl)
  })

  const origDebt = computed((): number => d.value.debts?.summary?.total || 91721251)

  const repayPct = computed((): number =>
    Math.min(100, Math.max(0, Math.round((1 - totalDebt.value / origDebt.value) * 100)))
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

  const debtTrend = computed((): TrendDirection => {
    const paidObs = d.value.paid_obligations || []
    const extraPaid = d.value.extra_paid || 0
    const hasDebtPayment = paidObs.some((key) => {
      const name = key.split(':').slice(1).join(':')
      return findDebtId(name) !== null
    })
    if (hasDebtPayment || extraPaid > 0) return 'down'
    return 'neutral'
  })

  return {
    findDebtId,
    minPaidByCard,
    debtCards,
    smallLoans,
    totalDebt,
    origDebt,
    repayPct,
    debtBreakdown,
    debtTrend,
  }
}
