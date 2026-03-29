import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useTransactions } from '../useTransactions'
import { makeData, VISA1, mockPush, mockToast, mockTStr, mockFindDebtId } from './helpers'

function setup(dataOverrides = {}) {
  const d = ref(makeData(dataOverrides))
  const push = mockPush()
  const toast = mockToast()
  const tStr = mockTStr()
  const findDebtId = mockFindDebtId()
  const tx = useTransactions(d, push, toast, tStr, findDebtId)
  return { d, push, toast, ...tx }
}

describe('useTransactions', () => {
  // ─── addExp ───────────────────────────────────────────────────────────

  describe('addExp', () => {
    it('thêm expense tiền mặt vào đầu danh sách', async () => {
      const { d, addExp } = setup()
      await addExp({ desc: 'Ăn trưa', amount: 50_000, cat: 'an' })
      expect(d.value.expenses[0]).toMatchObject({
        desc: 'Ăn trưa',
        amount: 50_000,
        cat: 'an',
        payMethod: 'cash',
        date: '2026-03-29',
      })
    })

    it('toast thành công sau khi push OK', async () => {
      const { toast, addExp } = setup()
      await addExp({ desc: 'Cafe', amount: 30_000, cat: 'cafe' })
      expect(toast).toHaveBeenCalledWith('toast.expAdded')
    })

    it('toast lỗi khi push thất bại', async () => {
      const d = ref(makeData())
      const push = vi.fn().mockResolvedValue(false)
      const toast = mockToast()
      const { addExp } = useTransactions(d, push, toast, mockTStr(), mockFindDebtId())
      await addExp({ desc: 'X', amount: 10_000, cat: 'x' })
      expect(toast).toHaveBeenCalledWith('toast.expAddedErr', 'err')
    })

    it('thanh toán bằng Visa → tăng balance thẻ', async () => {
      const { d, addExp } = setup({
        debts: { credit_cards: [{ ...VISA1, balance: 5_000_000 }], small_loans: [] },
      })
      await addExp({ desc: 'Mua sắm', amount: 200_000, cat: 'mua', payMethod: 'visa1' })
      const card = d.value.debts.credit_cards.find((c) => c.id === 'visa1')
      expect(card?.balance).toBe(5_200_000)
    })

    it('expense Visa không ảnh hưởng thẻ khác', async () => {
      const { d, addExp } = setup({
        debts: { credit_cards: [{ ...VISA1, balance: 5_000_000 }, { ...VISA1, id: 'visa2', name: 'Visa 2', balance: 3_000_000 }], small_loans: [] },
      })
      await addExp({ desc: 'Mua', amount: 100_000, cat: 'mua', payMethod: 'visa1' })
      const visa2 = d.value.debts.credit_cards.find((c) => c.id === 'visa2')
      expect(visa2?.balance).toBe(3_000_000) // không đổi
    })

    it('payMethod cash → không thay đổi balance thẻ', async () => {
      const { d, addExp } = setup({
        debts: { credit_cards: [{ ...VISA1, balance: 5_000_000 }], small_loans: [] },
      })
      await addExp({ desc: 'Ăn', amount: 50_000, cat: 'an', payMethod: 'cash' })
      const card = d.value.debts.credit_cards.find((c) => c.id === 'visa1')
      expect(card?.balance).toBe(5_000_000) // không đổi
    })
  })

  // ─── addInc ───────────────────────────────────────────────────────────

  describe('addInc', () => {
    it('thêm income vào đầu danh sách', async () => {
      const { d, addInc } = setup()
      await addInc({ desc: 'Lương', amount: 1_000_000, cat: 'luong' })
      expect(d.value.incomes[0]).toMatchObject({
        desc: 'Lương',
        amount: 1_000_000,
        cat: 'luong',
      })
    })

    it('tăng cash balance sau khi thêm income', async () => {
      const { d, addInc } = setup({
        current_cash: { balance: 500_000, reserved: 0, as_of: '2026-03-01' },
      })
      await addInc({ desc: 'Lương', amount: 1_000_000, cat: 'luong' })
      expect(d.value.current_cash.balance).toBe(1_500_000)
    })

    it('toast thành công', async () => {
      const { toast, addInc } = setup()
      await addInc({ desc: 'Lương', amount: 500_000, cat: 'luong' })
      expect(toast).toHaveBeenCalledWith('toast.incAdded')
    })
  })

  // ─── deleteTx ─────────────────────────────────────────────────────────

  describe('deleteTx', () => {
    it('xoá income → giảm cash balance', async () => {
      const { d, addInc, deleteTx } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
      })
      await addInc({ desc: 'Thưởng', amount: 500_000, cat: 'thuong' })
      const incomeId = d.value.incomes[0].id
      await deleteTx({ id: incomeId, type: 'inc' })
      expect(d.value.incomes).toHaveLength(0)
      expect(d.value.current_cash.balance).toBe(1_000_000) // trở về ban đầu
    })

    it('xoá expense tiền mặt → xoá khỏi danh sách', async () => {
      const { d, addExp, deleteTx } = setup()
      await addExp({ desc: 'Ăn', amount: 30_000, cat: 'an' })
      const expId = d.value.expenses[0].id
      await deleteTx({ id: expId, type: 'exp' })
      expect(d.value.expenses).toHaveLength(0)
    })

    it('xoá expense Visa → giảm balance thẻ', async () => {
      const { d, addExp, deleteTx } = setup({
        debts: { credit_cards: [{ ...VISA1, balance: 5_000_000 }], small_loans: [] },
      })
      await addExp({ desc: 'Mua', amount: 200_000, cat: 'mua', payMethod: 'visa1' })
      const expId = d.value.expenses[0].id
      await deleteTx({ id: expId, type: 'exp' })
      const card = d.value.debts.credit_cards.find((c) => c.id === 'visa1')
      expect(card?.balance).toBe(5_000_000) // trở về ban đầu
    })

    it('toast thành công khi xoá', async () => {
      const { d, toast, addExp, deleteTx } = setup()
      await addExp({ desc: 'X', amount: 10_000, cat: 'x' })
      await deleteTx({ id: d.value.expenses[0].id, type: 'exp' })
      expect(toast).toHaveBeenLastCalledWith('toast.txDeleted')
    })
  })

  // ─── handlePopupSaveTx ────────────────────────────────────────────────

  describe('handlePopupSaveTx', () => {
    it('cập nhật expense theo _buf', async () => {
      const { d, addExp, handlePopupSaveTx } = setup()
      await addExp({ desc: 'Cũ', amount: 50_000, cat: 'an' })
      const expId = d.value.expenses[0].id
      await handlePopupSaveTx({
        id: expId,
        type: 'exp',
        _buf: { name: 'Mới', date: '2026-03-29', amt: 80_000, cat: 'cafe' },
      })
      expect(d.value.expenses[0]).toMatchObject({ desc: 'Mới', amount: 80_000, cat: 'cafe' })
    })

    it('cập nhật income → điều chỉnh cash balance', async () => {
      const { d, addInc, handlePopupSaveTx } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
      })
      await addInc({ desc: 'Lương', amount: 500_000, cat: 'luong' })
      const incId = d.value.incomes[0].id
      await handlePopupSaveTx({
        id: incId,
        type: 'inc',
        _buf: { name: 'Lương mới', date: '2026-03-29', amt: 700_000, cat: 'luong' },
      })
      // balance ban đầu 1_000_000 + thêm 500_000 = 1_500_000, rồi diff = 700_000 - 500_000 = +200_000
      expect(d.value.current_cash.balance).toBe(1_700_000)
    })
  })
})
