import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useDebtCards } from '../data/useDebtCards'
import { makeData, VISA1, VISA2 } from './helpers'

describe('useDebtCards', () => {
  afterEach(() => vi.useRealTimers())

  // ─── totalDebt ────────────────────────────────────────────────────────

  describe('totalDebt', () => {
    it('không có nợ → 0', () => {
      const d = ref(makeData())
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(0)
    })

    it('tính tổng cc balance + sl remaining_balance', () => {
      const d = ref(makeData({
        debts: {
          credit_cards: [{ ...VISA1, balance: 3_000_000 }],
          small_loans: [{ id: 'sl1', name: 'Vay A', remaining_balance: 500_000 }],
        },
      }))
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(3_500_000)
    })

    it('sl remaining_balance = 0 → không tính vào tổng', () => {
      const d = ref(makeData({
        debts: {
          credit_cards: [{ ...VISA1, balance: 2_000_000 }],
          small_loans: [{ id: 'sl1', name: 'Vay A', remaining_balance: 0 }],
        },
      }))
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(2_000_000)
    })

    it('phản ứng khi balance thẻ thay đổi', () => {
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, balance: 1_000_000 }], small_loans: [] },
      }))
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(1_000_000)
      d.value = { ...d.value, debts: { ...d.value.debts, credit_cards: [{ ...VISA1, balance: 2_000_000 }] } }
      expect(totalDebt.value).toBe(2_000_000)
    })
  })

  // ─── findDebtId ───────────────────────────────────────────────────────

  describe('findDebtId', () => {
    it('không có debts → null', () => {
      const d = ref(makeData())
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('Visa 1 minimum')).toBeNull()
    })

    it('khớp theo tên ngắn của thẻ', () => {
      const d = ref(makeData({
        debts: { credit_cards: [VISA1], small_loans: [] },
      }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('visa 1 minimum')).toEqual({ type: 'cc', id: 'visa1' })
    })

    it('khớp theo card id trong tên', () => {
      const d = ref(makeData({
        debts: { credit_cards: [VISA1], small_loans: [] },
      }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('thanh toán visa1')).toEqual({ type: 'cc', id: 'visa1' })
    })

    it('nhiều thẻ → khớp đúng thẻ', () => {
      const d = ref(makeData({
        debts: { credit_cards: [VISA1, VISA2], small_loans: [] },
      }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('visa 2 minimum')).toEqual({ type: 'cc', id: 'visa2' })
    })

    it('không khớp → null', () => {
      const d = ref(makeData({
        debts: { credit_cards: [VISA1], small_loans: [] },
      }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('Mastercard payment')).toBeNull()
    })
  })

  // ─── debtCards minUrg ─────────────────────────────────────────────────

  describe('debtCards minUrg', () => {
    it('không có thẻ → mảng rỗng', () => {
      const d = ref(makeData())
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value).toHaveLength(0)
    })

    it('đã paid → ok', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, min_due_date: '2026-03-10' }], small_loans: [] },
        one_time_expenses: [{ id: 1, name: 'visa 1 minimum', date: '2026-03-10', amount: 500_000 }],
        paid_obligations: ['2026-03-10:visa 1 minimum'],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('ok')
      expect(debtCards.value[0].minPaid).toBe(true)
    })

    it('đã quá hạn (daysLeft <= 0) → overdue', () => {
      vi.setSystemTime(new Date('2026-03-15T12:00:00'))
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, min_due_date: '2026-03-10' }], small_loans: [] },
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('overdue')
    })

    it('còn 2 ngày (daysLeft <= 3) → urgent', () => {
      vi.setSystemTime(new Date('2026-03-08T12:00:00'))
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, min_due_date: '2026-03-10' }], small_loans: [] },
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('urgent')
    })

    it('còn 5 ngày (daysLeft <= 7) → soon', () => {
      vi.setSystemTime(new Date('2026-03-05T12:00:00'))
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, min_due_date: '2026-03-10' }], small_loans: [] },
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('soon')
    })

    it('còn 20 ngày → normal', () => {
      vi.setSystemTime(new Date('2026-03-01T12:00:00'))
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, min_due_date: '2026-03-21' }], small_loans: [] },
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('normal')
    })

    it('không có min_due_date → normal', () => {
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, min_due_date: undefined }], small_loans: [] },
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('normal')
      expect(debtCards.value[0].minDaysLeft).toBeNull()
    })
  })

  // ─── debtCards plannedPayment ─────────────────────────────────────────

  describe('debtCards plannedPayment', () => {
    it('có one_time_expense khớp → plannedPayment', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        debts: { credit_cards: [{ ...VISA1, name: 'Visa 1' }], small_loans: [] },
        one_time_expenses: [{ id: 1, name: 'Visa 1 minimum', date: '2026-03-15', amount: 500_000 }],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].plannedPayment).not.toBeNull()
      expect(debtCards.value[0].plannedPayment?.amount).toBe(500_000)
    })

    it('không có planned → null', () => {
      const d = ref(makeData({
        debts: { credit_cards: [VISA1], small_loans: [] },
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].plannedPayment).toBeNull()
    })
  })

  // ─── smallLoans ───────────────────────────────────────────────────────

  describe('smallLoans', () => {
    it('lọc khoản vay đã trả hết (remaining_balance = 0)', () => {
      const d = ref(makeData({
        debts: {
          credit_cards: [],
          small_loans: [
            { id: 'sl1', name: 'Vay A', remaining_balance: 500_000 },
            { id: 'sl2', name: 'Vay B', remaining_balance: 0 },
          ],
        },
      }))
      const { smallLoans } = useDebtCards(d)
      expect(smallLoans.value).toHaveLength(1)
      expect(smallLoans.value[0].id).toBe('sl1')
    })

    it('không có khoản vay → mảng rỗng', () => {
      const d = ref(makeData())
      const { smallLoans } = useDebtCards(d)
      expect(smallLoans.value).toHaveLength(0)
    })
  })

  // ─── debtTrend ────────────────────────────────────────────────────────

  describe('debtTrend', () => {
    it('không có thanh toán → neutral', () => {
      const d = ref(makeData())
      const { debtTrend } = useDebtCards(d)
      expect(debtTrend.value).toBe('neutral')
    })

    it('extra_paid > 0 → down', () => {
      const d = ref(makeData({ extra_paid: 500_000 }))
      const { debtTrend } = useDebtCards(d)
      expect(debtTrend.value).toBe('down')
    })
  })
})
