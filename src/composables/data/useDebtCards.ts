import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, DebtCard, DebtItem, TrendDirection } from '@/types/data'
import { i18n } from '../../i18n'
import { useFormatters } from '../ui/useFormatters'
import { useColors } from '../ui/useColors'
import { getLocalized } from './useI18nData'
import { useItems } from './useItems'

export interface DebtCardsResult {
  /** Tìm debt id từ tên obligation (heuristic name match). Trả null nếu không match. */
  findDebtId: (name: string) => string | null
  minPaidByCard: ComputedRef<Record<string, boolean>>
  debtCards: ComputedRef<DebtCard[]>
  smallLoans: ComputedRef<DebtItem[]>
  totalDebt: ComputedRef<number>
  origDebt: ComputedRef<number>
  repayPct: ComputedRef<number>
  debtBreakdown: ComputedRef<Array<{ name: string; val: number; color: string }>>
  debtTrend: ComputedRef<TrendDirection>
}

/** Default origDebt fallback nếu meta không cấu hình. */
const DEFAULT_ORIG_DEBT = 91_721_251

export function useDebtCards(d: Ref<AppData>): DebtCardsResult {
  const { dDiff, isTM } = useFormatters()
  const { palette } = useColors()
  const {
    debts: debtItems,
    creditCards: creditCardItems,
    smallLoans: smallLoanItems,
    fixedExpenses,
    oneTimeExpenses,
    expenseLogs,
    paymentRecords,
    paidKeys,
  } = useItems(d)

  /** Heuristic match obligation name → debt id. */
  function findDebtId(name: string): string | null {
    const n = name.toLowerCase()
    for (const c of creditCardItems.value) {
      const cn = c.name.toLowerCase()
      const shortName = cn.split(' — ')[0].trim()
      if (shortName && n.includes(shortName)) return c.id
      if (c.id && n.includes(c.id.toLowerCase())) return c.id
    }
    for (const l of smallLoanItems.value) {
      const ln = l.name.toLowerCase().split(' ').slice(0, 2).join(' ')
      if (n.includes(ln) || ln.split(' ').every((w) => w.length > 2 && n.includes(w))) {
        return l.id
      }
    }
    return null
  }

  /**
   * Per credit card · đã trả minimum cho chu kỳ hiện tại?
   * Match obligation name (lowercase, strip "— Techcombank") với cardShort, scope 3 tháng.
   */
  const minPaidByCard = computed((): Record<string, boolean> => {
    const paid = paidKeys.value
    const now = new Date()
    const months = [0, 1, 2].map((i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return dt.toISOString().slice(0, 7)
    })

    const allObs: Array<{ name: string; date: string; amount: number; category: string | null }> = []
    for (const fe of fixedExpenses.value) {
      const dateStr = fe.due_date
      if (!dateStr) continue
      if (!months.includes(dateStr.slice(0, 7))) continue
      allObs.push({ name: fe.name, date: dateStr, amount: fe.amount, category: fe.cat ?? null })
    }
    for (const ote of oneTimeExpenses.value) {
      if (!months.includes(ote.due_date.slice(0, 7))) continue
      allObs.push({ name: ote.name, date: ote.due_date, amount: ote.amount, category: null })
    }
    // Synth từ debt items (replicate legacy debt_minimum)
    for (const dt of debtItems.value) {
      if (!dt.due_date || !dt.minimum_payment) continue
      if (!months.includes(dt.due_date.slice(0, 7))) continue
      allObs.push({ name: dt.name + ' minimum', date: dt.due_date, amount: dt.minimum_payment, category: 'debt_minimum' })
    }

    if (allObs.length === 0) return {}

    const result: Record<string, boolean> = {}
    for (const c of creditCardItems.value) {
      const shortName = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase().trim()
      const dueDate = c.due_date || ''
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
        if (dueDate && ob.date) return ob.date <= dueDate
        return true
      })
      if (cardObs.length === 0) {
        result[c.id] = false
      } else {
        result[c.id] = cardObs.every((ob) => paid.has(ob.date + ':' + ob.name))
      }
    }
    return result
  })

  const debtCards = computed((): DebtCard[] => {
    const locale = (i18n.global.locale as { value: string }).value
    return creditCardItems.value.map((c): DebtCard => {
      const dueDate = c.due_date || ''
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
      // Search ote
      for (const ev of oneTimeExpenses.value) {
        const evName = (ev.name || '').toLowerCase()
        if (!evName.includes(cardShort)) continue
        const evMonth = ev.due_date.slice(0, 7)
        if (evMonth === nowMonth || evMonth === nextMonth) {
          plannedPayment = { amount: ev.amount, isMin: evName.includes('minimum'), name: ev.name, date: ev.due_date }
          break
        }
      }
      // Search fixed_expense
      if (!plannedPayment) {
        for (const fe of fixedExpenses.value) {
          if (!fe.due_date) continue
          const obName = (fe.name || '').toLowerCase()
          if (!obName.includes(cardShort)) continue
          if (fe.cat && fe.cat !== 'debt_minimum') continue
          const mo = fe.due_date.slice(0, 7)
          if (mo !== nowMonth && mo !== nextMonth) continue
          plannedPayment = { amount: fe.amount, isMin: obName.includes('minimum'), name: fe.name, date: fe.due_date }
          break
        }
      }

      const thisMonthExpenses = expenseLogs.value.filter(
        (e) => isTM(e.due_date) && e.pay_method === c.id
      )
      const thisMonthSpent = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)
      const thisMonthSpentCount = thisMonthExpenses.length

      const thisMonthPaymentCount = paymentRecords.value.filter((p) => {
        if (p.due_date.slice(0, 7) !== nowMonth) return false
        return p.key.toLowerCase().includes(cardShort)
      }).length

      return {
        id: c.id,
        name: getLocalized({ name: c.name, nameI18n: c.nameI18n }, 'name', locale).replace(' — Techcombank', '').replace(' — ', ''),
        balance: c.amount,
        limit: c.credit_limit ?? 0,
        rate: Math.round((c.apr || 0) * 100),
        min: c.minimum_payment,
        minDueDate: dueDate,
        minDaysLeft: daysLeft,
        minPaid: paid,
        minUrg,
        plannedPayment,
        thisMonthSpent,
        thisMonthPaid: paid,
        thisMonthSpentCount,
        thisMonthPaymentCount,
      }
    })
  })

  const smallLoans = computed(() =>
    smallLoanItems.value.filter((l) => (l.amount || 0) > 0)
  )

  const totalDebt = computed((): number => {
    return Math.max(0, debtItems.value.reduce((s, dt) => s + (dt.amount || 0), 0))
  })

  const origDebt = computed((): number => d.value.meta?.debt_summary_total || DEFAULT_ORIG_DEBT)

  const repayPct = computed((): number =>
    Math.min(100, Math.max(0, Math.round((1 - totalDebt.value / origDebt.value) * 100)))
  )

  const debtBreakdown = computed(() => {
    const locale = (i18n.global.locale as { value: string }).value
    const cc = creditCardItems.value.map((c, i) => ({
      name: getLocalized({ name: c.name, nameI18n: c.nameI18n }, 'name', locale).replace(' — Techcombank', ''),
      val: c.amount,
      color: palette[i % palette.length],
    }))
    const sl = smallLoanItems.value
      .filter((l) => (l.amount || 0) > 0)
      .map((l, i) => {
        const n = getLocalized({ name: l.name, nameI18n: l.nameI18n }, 'name', locale)
        return {
          name: n.length > 24 ? n.slice(0, 24) + '…' : n,
          val: l.amount,
          color: palette[(cc.length + i) % palette.length],
        }
      })
    return [...cc, ...sl]
  })

  const debtTrend = computed((): TrendDirection => {
    const nowMonth = new Date().toISOString().slice(0, 7)
    const ccIds = new Set(creditCardItems.value.map((c) => c.id))

    const totalSpendingAmount = expenseLogs.value
      .filter((e) => isTM(e.due_date) && e.pay_method != null && ccIds.has(e.pay_method))
      .reduce((s, e) => s + e.amount, 0)

    const totalPaymentAmount = paymentRecords.value
      .filter((p) => {
        if (p.due_date.slice(0, 7) !== nowMonth) return false
        const namePart = p.key.split(':').slice(1).join(':').toLowerCase()
        return creditCardItems.value.some((c) => {
          const cardShort = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase()
          return namePart.includes(cardShort)
        })
      })
      .reduce((s, p) => s + (p.amount || 0), 0)

    if (totalPaymentAmount === 0 && totalSpendingAmount === 0) return 'neutral'
    return totalPaymentAmount > totalSpendingAmount ? 'down' : 'up'
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
