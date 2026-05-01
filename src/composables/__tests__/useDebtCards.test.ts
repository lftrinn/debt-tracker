import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  mkDebt,
  mkOneTimeExpense,
  mkFixedExpense,
  mkPaymentRecord,
} from '@/types/data'
import { useDebtCards } from '../data/useDebtCards'
import { makeData, VISA1, VISA2, mkLoan } from './helpers'

describe('useDebtCards', () => {
  afterEach(() => vi.useRealTimers())

  describe('totalDebt', () => {
    it('không có nợ → 0', () => {
      const d = ref(makeData())
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(0)
    })

    it('tính tổng credit card + small loan', () => {
      const d = ref(makeData({
        items: [
          { ...VISA1, amount: 3_000_000 },
          mkLoan('sl1', 'Vay A', 500_000),
        ],
      }))
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(3_500_000)
    })

    it('small loan amount = 0 → vẫn cộng (nhưng smallLoans filter)', () => {
      const d = ref(makeData({
        items: [
          { ...VISA1, amount: 2_000_000 },
          mkLoan('sl1', 'Vay A', 0),
        ],
      }))
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(2_000_000)
    })

    it('phản ứng khi amount thẻ thay đổi', () => {
      const d = ref(makeData({
        items: [{ ...VISA1, amount: 1_000_000 }],
      }))
      const { totalDebt } = useDebtCards(d)
      expect(totalDebt.value).toBe(1_000_000)
      d.value = { ...d.value, items: [{ ...VISA1, amount: 2_000_000 }] }
      expect(totalDebt.value).toBe(2_000_000)
    })
  })

  describe('findDebtId', () => {
    it('không có debts → null', () => {
      const d = ref(makeData())
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('Visa 1 minimum')).toBeNull()
    })

    it('khớp theo tên ngắn của thẻ', () => {
      const d = ref(makeData({ items: [VISA1] }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('visa 1 minimum')).toBe('visa1')
    })

    it('khớp theo card id trong tên', () => {
      const d = ref(makeData({ items: [VISA1] }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('thanh toán visa1')).toBe('visa1')
    })

    it('nhiều thẻ → khớp đúng thẻ', () => {
      const d = ref(makeData({ items: [VISA1, VISA2] }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('visa 2 minimum')).toBe('visa2')
    })

    it('không khớp → null', () => {
      const d = ref(makeData({ items: [VISA1] }))
      const { findDebtId } = useDebtCards(d)
      expect(findDebtId('Mastercard payment')).toBeNull()
    })
  })

  describe('debtCards minUrg', () => {
    it('không có thẻ → mảng rỗng', () => {
      const d = ref(makeData())
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value).toHaveLength(0)
    })

    it('đã paid → ok', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      // Synthesized obligation `<name> minimum` từ DebtItem.due_date được match
      // với PaymentRecord.key cùng format → minPaid=true.
      const d = ref(makeData({
        items: [
          mkDebt('visa1', 'Visa 1', { ...VISA1, due_date: '2026-03-10' }),
          mkPaymentRecord('pay_1', 'Visa 1 minimum', {
            amount: 500_000, due_date: '2026-03-10',
            key: '2026-03-10:Visa 1 minimum', ref_id: 'visa1', ref_type: 'debt',
          }),
        ],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('ok')
      expect(debtCards.value[0].minPaid).toBe(true)
    })

    it('đã quá hạn (daysLeft <= 0) → overdue', () => {
      vi.setSystemTime(new Date('2026-03-15T12:00:00'))
      const d = ref(makeData({
        items: [mkDebt('visa1', 'Visa 1', { ...VISA1, due_date: '2026-03-10' })],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('overdue')
    })

    it('còn 2 ngày → urgent', () => {
      vi.setSystemTime(new Date('2026-03-08T12:00:00'))
      const d = ref(makeData({
        items: [mkDebt('visa1', 'Visa 1', { ...VISA1, due_date: '2026-03-10' })],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('urgent')
    })

    it('còn 5 ngày → soon', () => {
      vi.setSystemTime(new Date('2026-03-05T12:00:00'))
      const d = ref(makeData({
        items: [mkDebt('visa1', 'Visa 1', { ...VISA1, due_date: '2026-03-10' })],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('soon')
    })

    it('còn 20 ngày → normal', () => {
      vi.setSystemTime(new Date('2026-03-01T12:00:00'))
      const d = ref(makeData({
        items: [mkDebt('visa1', 'Visa 1', { ...VISA1, due_date: '2026-03-21' })],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('normal')
    })

    it('không có due_date → normal', () => {
      const d = ref(makeData({
        items: [mkDebt('visa1', 'Visa 1', { ...VISA1, due_date: null })],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].minUrg).toBe('normal')
      expect(debtCards.value[0].minDaysLeft).toBeNull()
    })
  })

  describe('debtCards plannedPayment', () => {
    it('có one_time_expense khớp → plannedPayment', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [
          mkDebt('visa1', 'Visa 1', { ...VISA1 }),
          mkOneTimeExpense('ote_1', 'Visa 1 minimum', { amount: 500_000, due_date: '2026-03-15' }),
        ],
      }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].plannedPayment).not.toBeNull()
      expect(debtCards.value[0].plannedPayment?.amount).toBe(500_000)
    })

    it('không có planned → null', () => {
      const d = ref(makeData({ items: [VISA1] }))
      const { debtCards } = useDebtCards(d)
      expect(debtCards.value[0].plannedPayment).toBeNull()
    })
  })

  describe('smallLoans', () => {
    it('lọc khoản vay đã trả hết (amount = 0)', () => {
      const d = ref(makeData({
        items: [mkLoan('sl1', 'Vay A', 500_000), mkLoan('sl2', 'Vay B', 0)],
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

  describe('debtTrend', () => {
    it('không có thanh toán → neutral', () => {
      const d = ref(makeData())
      const { debtTrend } = useDebtCards(d)
      expect(debtTrend.value).toBe('neutral')
    })

    it('có payment_record tháng này, không có card spending → down', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-15'))
      const d = ref(makeData({
        items: [
          VISA1,
          mkFixedExpense('fe_1', 'Visa 1', { amount: 500_000, per_period: 500_000, frequency: 'monthly', due_date: '2026-03-15' }),
          mkPaymentRecord('pay_1', 'Visa 1', {
            amount: 500_000, due_date: '2026-03-15',
            key: '2026-03-15:Visa 1', ref_id: 'visa1', ref_type: 'debt',
          }),
        ],
      }))
      const { debtTrend } = useDebtCards(d)
      expect(debtTrend.value).toBe('down')
    })
  })
})
