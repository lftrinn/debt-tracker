import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  isAccount,
  isDebt,
  isExpenseLog,
  isOneTimeExpense,
  isPaymentRecord,
  mkOneTimeExpense,
  mkPaymentRecord,
  mkExpenseLog,
} from '@/types/data'
import { usePayments } from '../actions/usePayments'
import { makeData, VISA1, mockPush, mockToast, mockTStr, mockFindDebtId, mkLoan } from './helpers'

function setup(items?: Parameters<typeof makeData>[0]) {
  const d = ref(makeData(items))
  const push = mockPush()
  const toast = mockToast()
  const tStr = mockTStr()
  const findDebtId = mockFindDebtId()
  const pay = usePayments(d, push, toast, tStr, findDebtId)
  return { d, push, toast, ...pay }
}

const account = (d: { value: { items: ReturnType<typeof makeData>['items'] } }) =>
  d.value.items.find(isAccount)
const debt = (d: { value: { items: ReturnType<typeof makeData>['items'] } }, id: string) =>
  d.value.items.find((i) => isDebt(i) && i.id === id)
const paymentRecords = (d: { value: { items: ReturnType<typeof makeData>['items'] } }) =>
  d.value.items.filter(isPaymentRecord)
const expenseLogs = (d: { value: { items: ReturnType<typeof makeData>['items'] } }) =>
  d.value.items.filter(isExpenseLog)
const oteList = (d: { value: { items: ReturnType<typeof makeData>['items'] } }) =>
  d.value.items.filter(isOneTimeExpense)

describe('usePayments', () => {
  afterEach(() => vi.useRealTimers())

  describe('togglePaid (mark)', () => {
    it('đánh dấu paid → tạo payment_record', async () => {
      const { d, togglePaid } = setup()
      await togglePaid('2026-03-29:Trả Visa', 500_000, 'Trả Visa')
      const pr = paymentRecords(d).find((p) => p.key === '2026-03-29:Trả Visa')
      expect(pr).toBeDefined()
      expect(pr?.amount).toBe(500_000)
    })

    it('đánh dấu paid → trừ tiền mặt', async () => {
      const { d, togglePaid } = setup()
      const before = account(d)?.amount ?? 0
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(account(d)?.amount).toBe(before - 500_000)
    })

    it('đánh dấu paid → thêm expense_log với ref_id', async () => {
      const { d, togglePaid } = setup()
      await togglePaid('2026-03-29:Trả Visa', 500_000, 'Trả Visa')
      const tagged = expenseLogs(d).find((e) => e.ref_id === 'ob:2026-03-29:Trả Visa')
      expect(tagged).toBeDefined()
      expect(tagged?.amount).toBe(500_000)
      expect(tagged?.cat).toBe('thanhToan')
    })

    it('đánh dấu paid khi findDebtId trả về id → giảm DebtItem.amount', async () => {
      const d = ref(makeData({ items: [...makeData().items, { ...VISA1, amount: 5_000_000 }] }))
      const push = mockPush()
      const toast = mockToast()
      const findDebtId = vi.fn().mockReturnValue('visa1')
      const { togglePaid } = usePayments(d, push, toast, mockTStr(), findDebtId)

      await togglePaid('2026-03-29:Visa 1 min', 500_000, 'Visa 1 min')
      const card = debt(d, 'visa1')
      expect(card && isDebt(card) ? card.amount : 0).toBe(4_500_000)
    })
  })

  describe('togglePaid (un-mark)', () => {
    it('hoàn tác paid → xoá payment_record', async () => {
      const { d, togglePaid } = setup({
        items: [
          ...makeData().items,
          mkPaymentRecord('pay_1', 'Trả Visa', {
            amount: 500_000, due_date: '2026-03-29', key: '2026-03-29:Trả Visa',
            ref_id: null, ref_type: null,
          }),
          mkExpenseLog('tx_e_1', 'Trả Visa', {
            amount: 500_000, cat: 'thanhToan', due_date: '2026-03-29',
            ref_id: 'ob:2026-03-29:Trả Visa',
          }),
        ],
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(paymentRecords(d).find((p) => p.key === '2026-03-29:Trả Visa')).toBeUndefined()
    })

    it('hoàn tác paid → hoàn trả tiền mặt', async () => {
      const { d, togglePaid } = setup({
        items: [
          ...makeData().items,
          mkPaymentRecord('pay_1', 'Trả Visa', {
            amount: 500_000, due_date: '2026-03-29', key: '2026-03-29:Trả Visa',
            ref_id: null, ref_type: null,
          }),
        ],
      })
      const before = account(d)?.amount ?? 0
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(account(d)?.amount).toBe(before + 500_000)
    })

    it('hoàn tác paid → xoá expense_log có ref_id', async () => {
      const { d, togglePaid } = setup({
        items: [
          ...makeData().items,
          mkPaymentRecord('pay_1', 'Trả Visa', {
            amount: 500_000, due_date: '2026-03-29', key: '2026-03-29:Trả Visa',
            ref_id: null, ref_type: null,
          }),
          mkExpenseLog('tx_e_1', 'Trả Visa', {
            amount: 500_000, cat: 'thanhToan', due_date: '2026-03-29',
            ref_id: 'ob:2026-03-29:Trả Visa',
          }),
        ],
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(expenseLogs(d).find((e) => e.ref_id === 'ob:2026-03-29:Trả Visa')).toBeUndefined()
    })

    it('toast paid khi mark', async () => {
      const { toast, togglePaid } = setup()
      await togglePaid('2026-03-29:X', 100_000)
      expect(toast).toHaveBeenCalledWith('toast.paid')
    })
  })

  describe('recPay', () => {
    it('ghi nhận trả nợ cc → giảm amount thẻ', async () => {
      const { d, recPay } = setup({
        items: [...makeData().items, { ...VISA1, amount: 5_000_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 1_000_000 })
      const card = debt(d, 'visa1')
      expect(card && isDebt(card) ? card.amount : 0).toBe(4_000_000)
    })

    it('trả hơn số nợ → amount tối thiểu 0', async () => {
      const { d, recPay } = setup({
        items: [...makeData().items, { ...VISA1, amount: 500_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 1_000_000 })
      const card = debt(d, 'visa1')
      expect(card && isDebt(card) ? card.amount : 0).toBe(0)
    })

    it('ghi nhận trả nợ small loan → giảm amount', async () => {
      const { d, recPay } = setup({
        items: [...makeData().items, mkLoan('sl1', 'Vay A', 2_000_000)],
      })
      await recPay({ target: 'sl:sl1', amount: 500_000 })
      const loan = debt(d, 'sl1')
      expect(loan && isDebt(loan) ? loan.amount : 0).toBe(1_500_000)
    })

    it('amount = 0 → không làm gì', async () => {
      const { push, recPay } = setup({
        items: [...makeData().items, { ...VISA1, amount: 5_000_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 0 })
      expect(push).not.toHaveBeenCalled()
    })

    it('toast thành công', async () => {
      const { toast, recPay } = setup({
        items: [...makeData().items, { ...VISA1, amount: 1_000_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 500_000 })
      expect(toast).toHaveBeenCalledWith('toast.debtPaid')
    })
  })

  describe('addOneTime', () => {
    it('thêm one_time_expense item', async () => {
      const { d, addOneTime } = setup()
      await addOneTime({ name: 'Trả thẻ', date: '2026-04-15', amount: 500_000 })
      const ote = oteList(d).find((o) => o.name === 'Trả thẻ')
      expect(ote).toBeDefined()
      expect(ote?.due_date).toBe('2026-04-15')
      expect(ote?.amount).toBe(500_000)
    })

    it('thiếu name → không thêm', async () => {
      const { d, push, addOneTime } = setup()
      await addOneTime({ name: '', date: '2026-04-15', amount: 500_000 })
      expect(oteList(d)).toHaveLength(0)
      expect(push).not.toHaveBeenCalled()
    })

    it('amount = 0 → không thêm', async () => {
      const { d, push, addOneTime } = setup()
      await addOneTime({ name: 'Trả thẻ', date: '2026-04-15', amount: 0 })
      expect(oteList(d)).toHaveLength(0)
      expect(push).not.toHaveBeenCalled()
    })

    it('toast thành công', async () => {
      const { toast, addOneTime } = setup()
      await addOneTime({ name: 'Trả thẻ', date: '2026-04-15', amount: 500_000 })
      expect(toast).toHaveBeenCalledWith('toast.expenseAdded')
    })
  })

  describe('cleanupPastPaid', () => {
    it('không có payment_record → không làm gì', async () => {
      const { push, cleanupPastPaid } = setup()
      await cleanupPastPaid()
      expect(push).not.toHaveBeenCalled()
    })

    it('xoá payment_record + linked one_time_expense trong quá khứ', async () => {
      const { d, cleanupPastPaid } = setup({
        items: [
          ...makeData().items,
          mkOneTimeExpense('ote_1', 'Trả thẻ', { amount: 500_000, due_date: '2026-03-01' }),
          mkPaymentRecord('pay_1', 'Trả thẻ', {
            amount: 500_000, due_date: '2026-03-01',
            key: '2026-03-01:Trả thẻ', ref_id: 'ote_1', ref_type: 'one_time_expense',
          }),
        ],
      })
      await cleanupPastPaid()
      expect(paymentRecords(d).find((p) => p.key === '2026-03-01:Trả thẻ')).toBeUndefined()
      expect(oteList(d).find((o) => o.name === 'Trả thẻ')).toBeUndefined()
    })

    it('giữ lại payment_record trong tương lai', async () => {
      const { d, cleanupPastPaid } = setup({
        items: [
          ...makeData().items,
          mkPaymentRecord('pay_2', 'Mới', {
            amount: 100_000, due_date: '2026-04-01',
            key: '2026-04-01:Mới', ref_id: null, ref_type: null,
          }),
        ],
      })
      await cleanupPastPaid()
      expect(paymentRecords(d).find((p) => p.key === '2026-04-01:Mới')).toBeDefined()
    })

    it('giữ lại one_time_expense chưa paid', async () => {
      const { d, cleanupPastPaid } = setup({
        items: [
          ...makeData().items,
          mkOneTimeExpense('ote_old', 'Trả thẻ cũ', { amount: 500_000, due_date: '2026-03-01' }),
          mkOneTimeExpense('ote_new', 'Trả thẻ mới', { amount: 500_000, due_date: '2026-04-15' }),
          mkPaymentRecord('pay_old', 'Trả thẻ cũ', {
            amount: 500_000, due_date: '2026-03-01',
            key: '2026-03-01:Trả thẻ cũ', ref_id: 'ote_old', ref_type: 'one_time_expense',
          }),
        ],
      })
      await cleanupPastPaid()
      expect(oteList(d).find((o) => o.name === 'Trả thẻ mới')).toBeDefined()
      expect(oteList(d).find((o) => o.name === 'Trả thẻ cũ')).toBeUndefined()
    })
  })
})
