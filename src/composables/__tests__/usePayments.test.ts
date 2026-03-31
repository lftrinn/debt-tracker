import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { usePayments } from '../actions/usePayments'
import { makeData, VISA1, mockPush, mockToast, mockTStr, mockFindDebtId } from './helpers'

function setup(dataOverrides = {}) {
  const d = ref(makeData(dataOverrides))
  const push = mockPush()
  const toast = mockToast()
  const tStr = mockTStr()
  const findDebtId = mockFindDebtId()
  const pay = usePayments(d, push, toast, tStr, findDebtId)
  return { d, push, toast, ...pay }
}

describe('usePayments', () => {
  afterEach(() => vi.useRealTimers())

  // ─── togglePaid ───────────────────────────────────────────────────────

  describe('togglePaid', () => {
    it('đánh dấu paid → thêm vào paid_obligations', async () => {
      const { d, togglePaid } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000, 'Trả Visa')
      expect(d.value.paid_obligations).toContain('2026-03-29:Trả Visa')
    })

    it('đánh dấu paid → trừ tiền mặt', async () => {
      const { d, togglePaid } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(d.value.current_cash.balance).toBe(500_000)
    })

    it('đánh dấu paid → thêm transaction với note', async () => {
      const { d, togglePaid } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000, 'Trả Visa')
      const taggedExp = d.value.transactions.find((t) => t.note === 'ob:2026-03-29:Trả Visa')
      expect(taggedExp).toBeDefined()
      expect(taggedExp?.amount).toBe(500_000)
    })

    it('đánh dấu paid khi có debtRef cc → giảm balance thẻ', async () => {
      const d = ref(makeData({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
        debts: [{ ...VISA1, balance: 5_000_000 }],
      }))
      const push = mockPush()
      const toast = mockToast()
      const findDebtId = vi.fn().mockReturnValue({ type: 'cc', id: 'visa1' })
      const { togglePaid } = usePayments(d, push, toast, mockTStr(), findDebtId)

      await togglePaid('2026-03-29:Visa 1 min', 500_000, 'Visa 1 min')
      const card = (d.value.debts || []).find((c) => c.id === 'visa1')
      expect(card?.balance).toBe(4_500_000)
    })

    it('hoàn tác paid → xoá khỏi paid_obligations', async () => {
      const { d, togglePaid } = setup({
        current_cash: { balance: 500_000, reserved: 0, as_of: '2026-03-01' },
        paid_obligations: ['2026-03-29:Trả Visa'],
        transactions: [{
          id: 999, type: 'exp', desc: 'Trả Visa', amount: 500_000, cat: 'thanhToan',
          date: '2026-03-29', note: 'ob:2026-03-29:Trả Visa',
        }],
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(d.value.paid_obligations).not.toContain('2026-03-29:Trả Visa')
    })

    it('hoàn tác paid → hoàn trả tiền mặt', async () => {
      const { d, togglePaid } = setup({
        current_cash: { balance: 500_000, reserved: 0, as_of: '2026-03-01' },
        paid_obligations: ['2026-03-29:Trả Visa'],
        transactions: [{
          id: 999, type: 'exp', desc: 'Trả Visa', amount: 500_000, cat: 'thanhToan',
          date: '2026-03-29', note: 'ob:2026-03-29:Trả Visa',
        }],
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(d.value.current_cash.balance).toBe(1_000_000) // 500_000 + 500_000
    })

    it('hoàn tác paid → xoá transaction có note', async () => {
      const { d, togglePaid } = setup({
        current_cash: { balance: 500_000, reserved: 0, as_of: '2026-03-01' },
        paid_obligations: ['2026-03-29:Trả Visa'],
        transactions: [{
          id: 999, type: 'exp', desc: 'Trả Visa', amount: 500_000, cat: 'thanhToan',
          date: '2026-03-29', note: 'ob:2026-03-29:Trả Visa',
        }],
      })
      await togglePaid('2026-03-29:Trả Visa', 500_000)
      expect(d.value.transactions.find((t) => t.note === 'ob:2026-03-29:Trả Visa')).toBeUndefined()
    })

    it('toast sau togglePaid', async () => {
      const { toast, togglePaid } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
      })
      await togglePaid('2026-03-29:X', 100_000)
      expect(toast).toHaveBeenCalledWith('toast.paid')
    })
  })

  // ─── recPay ───────────────────────────────────────────────────────────

  describe('recPay', () => {
    it('ghi nhận trả nợ cc → giảm balance thẻ', async () => {
      const { d, recPay } = setup({
        debts: [{ ...VISA1, balance: 5_000_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 1_000_000 })
      const card = (d.value.debts || []).find((c) => c.id === 'visa1')
      expect(card?.balance).toBe(4_000_000)
    })

    it('trả hơn số nợ → balance tối thiểu 0', async () => {
      const { d, recPay } = setup({
        debts: [{ ...VISA1, balance: 500_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 1_000_000 })
      const card = (d.value.debts || []).find((c) => c.id === 'visa1')
      expect(card?.balance).toBe(0)
    })

    it('ghi nhận trả nợ sl → giảm remaining_balance', async () => {
      const { d, recPay } = setup({
        debts: [{ id: 'sl1', type: 'loan', name: 'Vay A', remaining_balance: 2_000_000, payment_due_date: '' }],
      })
      await recPay({ target: 'sl:sl1', amount: 500_000 })
      const loan = (d.value.debts || []).find((l) => l.id === 'sl1')
      expect(loan?.remaining_balance).toBe(1_500_000)
    })

    it('amount = 0 → không làm gì', async () => {
      const { d, push, recPay } = setup({
        debts: [{ ...VISA1, balance: 5_000_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 0 })
      expect(push).not.toHaveBeenCalled()
    })

    it('toast thành công', async () => {
      const { toast, recPay } = setup({
        debts: [{ ...VISA1, balance: 1_000_000 }],
      })
      await recPay({ target: 'cc:visa1', amount: 500_000 })
      expect(toast).toHaveBeenCalledWith('toast.debtPaid')
    })
  })

  // ─── addOneTime ───────────────────────────────────────────────────────

  describe('addOneTime', () => {
    it('thêm khoản chi một lần', async () => {
      const { d, addOneTime } = setup()
      await addOneTime({ name: 'Trả thẻ', date: '2026-04-15', amount: 500_000 })
      expect(d.value.one_time_expenses).toHaveLength(1)
      expect(d.value.one_time_expenses![0]).toMatchObject({
        name: 'Trả thẻ',
        date: '2026-04-15',
        amount: 500_000,
      })
    })

    it('thiếu name → không thêm', async () => {
      const { d, push, addOneTime } = setup()
      await addOneTime({ name: '', date: '2026-04-15', amount: 500_000 })
      expect(d.value.one_time_expenses ?? []).toHaveLength(0)
      expect(push).not.toHaveBeenCalled()
    })

    it('amount = 0 → không thêm', async () => {
      const { d, push, addOneTime } = setup()
      await addOneTime({ name: 'Trả thẻ', date: '2026-04-15', amount: 0 })
      expect(d.value.one_time_expenses ?? []).toHaveLength(0)
      expect(push).not.toHaveBeenCalled()
    })

    it('toast thành công', async () => {
      const { toast, addOneTime } = setup()
      await addOneTime({ name: 'Trả thẻ', date: '2026-04-15', amount: 500_000 })
      expect(toast).toHaveBeenCalledWith('toast.expenseAdded')
    })
  })

  // ─── cleanupPastPaid ──────────────────────────────────────────────────

  describe('cleanupPastPaid', () => {
    it('không có paid_obligations → không làm gì', async () => {
      const { d, push, cleanupPastPaid } = setup()
      await cleanupPastPaid()
      expect(push).not.toHaveBeenCalled()
    })

    it('xoá paid_obligations trong quá khứ', async () => {
      const { d, cleanupPastPaid } = setup({
        paid_obligations: ['2026-03-01:Cũ', '2026-04-01:Mới'],
      })
      // tStr = '2026-03-29', nên '2026-03-01' < '2026-03-29' → bị xoá
      await cleanupPastPaid()
      expect(d.value.paid_obligations).not.toContain('2026-03-01:Cũ')
    })

    it('giữ lại paid_obligations trong tương lai', async () => {
      const { d, cleanupPastPaid } = setup({
        paid_obligations: ['2026-03-01:Cũ', '2026-04-01:Mới'],
      })
      await cleanupPastPaid()
      expect(d.value.paid_obligations).toContain('2026-04-01:Mới')
    })

    it('xoá one_time_expenses đã paid trong quá khứ', async () => {
      const { d, cleanupPastPaid } = setup({
        paid_obligations: ['2026-03-01:Trả thẻ'],
        one_time_expenses: [{ id: 1, name: 'Trả thẻ', date: '2026-03-01', amount: 500_000 }],
      })
      await cleanupPastPaid()
      expect(d.value.one_time_expenses).toHaveLength(0)
    })

    it('giữ lại one_time_expenses chưa paid', async () => {
      const { d, cleanupPastPaid } = setup({
        paid_obligations: ['2026-03-01:Trả thẻ cũ'],
        one_time_expenses: [
          { id: 1, name: 'Trả thẻ cũ', date: '2026-03-01', amount: 500_000 },
          { id: 2, name: 'Trả thẻ mới', date: '2026-04-15', amount: 500_000 },
        ],
      })
      await cleanupPastPaid()
      expect(d.value.one_time_expenses).toHaveLength(1)
      expect(d.value.one_time_expenses![0].name).toBe('Trả thẻ mới')
    })
  })
})
