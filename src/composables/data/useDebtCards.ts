import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, Debt, DebtCard, DebtRef, TrendDirection } from '@/types/data'
import { useFormatters } from '../ui/useFormatters'
import { useColors } from '../ui/useColors'

export interface DebtCardsResult {
  findDebtId: (name: string) => DebtRef | null
  minPaidByCard: ComputedRef<Record<string, boolean>>
  debtCards: ComputedRef<DebtCard[]>
  smallLoans: ComputedRef<Debt[]>
  totalDebt: ComputedRef<number>
  origDebt: ComputedRef<number>
  repayPct: ComputedRef<number>
  debtBreakdown: ComputedRef<Array<{ name: string; val: number; color: string }>>
  debtTrend: ComputedRef<TrendDirection>
}

/**
 * Tính toán dữ liệu thẻ tín dụng, khoản vay, tổng nợ và trạng thái thanh toán tối thiểu.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @returns Các computed values và hàm tiện ích liên quan đến nợ
 */
export function useDebtCards(d: Ref<AppData>): DebtCardsResult {
  const { dDiff, isTM } = useFormatters()
  const { palette } = useColors()

  /**
   * Khớp tên nghĩa vụ với ID nợ tương ứng.
   */
  function findDebtId(name: string): DebtRef | null {
    const n = name.toLowerCase()
    const cards = (d.value.debts || []).filter((x) => x.type === 'credit_card')
    for (const c of cards) {
      const cn = c.name.toLowerCase()
      const shortName = cn.split(' — ')[0].trim()
      if (shortName && n.includes(shortName)) return { type: 'cc', id: c.id }
      if (c.id && n.includes(c.id)) return { type: 'cc', id: c.id }
    }
    const loans = (d.value.debts || []).filter((x) => x.type === 'loan')
    for (const l of loans) {
      const ln = l.name.toLowerCase().split(' ').slice(0, 2).join(' ')
      if (n.includes(ln) || ln.split(' ').every((w) => w.length > 2 && n.includes(w))) {
        return { type: 'sl', id: l.id }
      }
    }
    return null
  }

  /**
   * Kiểm tra xem nghĩa vụ thanh toán tối thiểu của từng thẻ đã được đánh dấu chưa.
   */
  const minPaidByCard = computed((): Record<string, boolean> => {
    const paid = new Set(d.value.paid_obligations || [])
    const now = new Date()
    const months = [0, 1, 2].map((i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return dt.toISOString().slice(0, 7)
    })
    const allObs: Array<{ name: string; date?: string; amount: number; category?: string | null }> = []
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const evMonth = (ev.date || '').slice(0, 7)
      if (months.includes(evMonth)) {
        allObs.push({ name: ev.name, date: ev.date, amount: ev.amount, category: null })
      }
    })
    if (allObs.length === 0) return {}
    const result: Record<string, boolean> = {}
    const cards = (d.value.debts || []).filter((x) => x.type === 'credit_card')
    cards.forEach((c) => {
      const shortName = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase().trim()
      const dueDate = c.payment_due_date || ''
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
        const obDate = ob.date
        if (dueDate && obDate) return obDate <= dueDate
        return true
      })
      if (cardObs.length === 0) {
        result[c.id] = false
      } else {
        result[c.id] = cardObs.every((ob) => {
          const key = ob.date + ':' + ob.name
          return paid.has(key)
        })
      }
    })
    return result
  })

  /**
   * Danh sách thẻ tín dụng đã được enrich với trạng thái khẩn cấp thanh toán.
   */
  const debtCards = computed((): DebtCard[] => {
    return (d.value.debts || []).filter((x) => x.type === 'credit_card').map((c): DebtCard => {
      const dueDate = c.payment_due_date || ''
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
      const thisMonthTransactions = (d.value.transactions || []).filter(
        (t) => t.type === 'exp' && isTM(t.date) && t.payMethod === c.id
      )
      const thisMonthSpent = thisMonthTransactions.reduce((s, t) => s + t.amount, 0)
      const thisMonthSpentCount = thisMonthTransactions.length

      const thisMonthPaymentCount = (d.value.paid_obligations || []).filter((key) => {
        const colonIdx = key.indexOf(':')
        if (colonIdx === -1) return false
        const datePart = key.slice(0, colonIdx)
        const namePart = key.slice(colonIdx + 1).toLowerCase()
        return datePart.slice(0, 7) === nowMonth && namePart.includes(cardShort)
      }).length

      return {
        id: c.id,
        name: c.name.replace(' — Techcombank', '').replace(' — ', ''),
        balance: c.balance || 0,
        limit: c.credit_limit || 0,
        rate: Math.round((c.interest_rate_annual || 0) * 100),
        min: c.minimum_payment || 0,
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

  /** Chỉ lấy các khoản vay còn dư nợ. */
  const smallLoans = computed(() =>
    (d.value.debts || []).filter((x) => x.type === 'loan' && (x.remaining_balance || 0) > 0)
  )

  /** Tổng nợ hiện tại. */
  const totalDebt = computed((): number => {
    const cc = (d.value.debts || []).filter((x) => x.type === 'credit_card').reduce((s, c) => s + (c.balance || 0), 0)
    const sl = (d.value.debts || []).filter((x) => x.type === 'loan').reduce((s, l) => s + (l.remaining_balance || 0), 0)
    return Math.max(0, cc + sl)
  })

  /** Tổng nợ ban đầu — tính từ tổng credit_limit + original_amount nếu không có fallback. */
  const origDebt = computed((): number => {
    const cc = (d.value.debts || []).filter((x) => x.type === 'credit_card').reduce((s, c) => s + (c.credit_limit || 0), 0)
    const sl = (d.value.debts || []).filter((x) => x.type === 'loan').reduce((s, l) => s + (l.original_amount || 0), 0)
    const computed_ = cc + sl
    return computed_ > 0 ? computed_ : 91721251
  })

  /** Phần trăm nợ đã trả (0–100). */
  const repayPct = computed((): number =>
    Math.min(100, Math.max(0, Math.round((1 - totalDebt.value / origDebt.value) * 100)))
  )

  /** Dữ liệu phân tích nợ theo từng thẻ/khoản vay. */
  const debtBreakdown = computed(() => {
    const cc = (d.value.debts || []).filter((x) => x.type === 'credit_card').map((c, i) => ({
      name: c.name.replace(' — Techcombank', ''),
      val: c.balance || 0,
      color: palette[i % palette.length],
    }))
    const sl = (d.value.debts || [])
      .filter((x) => x.type === 'loan' && (x.remaining_balance || 0) > 0)
      .map((l, i) => {
        const n = l.name
        return {
          name: n.length > 24 ? n.slice(0, 24) + '…' : n,
          val: l.remaining_balance || 0,
          color: palette[(cc.length + i) % palette.length],
        }
      })
    return [...cc, ...sl]
  })

  /**
   * Chiều hướng nợ tổng hợp trong tháng.
   */
  const debtTrend = computed((): TrendDirection => {
    const nowMonth = new Date().toISOString().slice(0, 7)
    const cards = (d.value.debts || []).filter((x) => x.type === 'credit_card')
    const cardIds = new Set(cards.map((c) => c.id))

    const totalSpendingAmount = (d.value.transactions || [])
      .filter((t) => t.type === 'exp' && isTM(t.date) && t.payMethod != null && cardIds.has(t.payMethod as string))
      .reduce((s, t) => s + t.amount, 0)

    const obAmtMap = new Map<string, number>()
    ;(d.value.one_time_expenses || []).forEach((ev) => {
      obAmtMap.set((ev.date || '') + ':' + ev.name, ev.amount)
    })

    const totalPaymentAmount = (d.value.paid_obligations || [])
      .filter((key) => {
        const colonIdx = key.indexOf(':')
        if (colonIdx === -1) return false
        const datePart = key.slice(0, colonIdx)
        if (datePart.slice(0, 7) !== nowMonth) return false
        const namePart = key.slice(colonIdx + 1).toLowerCase()
        return cards.some((c) => {
          const cardShort = c.name.replace(' — Techcombank', '').replace(' — ', '').toLowerCase()
          return namePart.includes(cardShort)
        })
      })
      .reduce((s, key) => s + (obAmtMap.get(key) || 0), 0)

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
