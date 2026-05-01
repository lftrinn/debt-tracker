import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { isAccount, isDebt, isExpenseLog, isIncomeLog } from '@/types/data'
import { useTransactions } from '../actions/useTransactions'
import { makeData, VISA1, mockPush, mockToast, mockTStr, mkLoan } from './helpers'

vi.mock('../api/useTranslation', () => ({
  translateToAll: vi.fn(),
  translateText: vi.fn(),
  ALL_LANGS: ['vi', 'en', 'ja'],
}))

import { translateToAll, translateText } from '../api/useTranslation'

function setup(items?: Parameters<typeof makeData>[0]) {
  const d = ref(makeData(items))
  const push = mockPush()
  const toast = mockToast()
  const tStr = mockTStr()
  const tx = useTransactions(d, push, toast, tStr)
  return { d, push, toast, ...tx }
}

beforeEach(() => {
  vi.mocked(translateToAll).mockImplementation(() => new Promise(() => {}))
  vi.mocked(translateText).mockImplementation(() => new Promise(() => {}))
})

const expenseLogs = (d: { value: { items: ReturnType<typeof makeData>['items'] } }) =>
  d.value.items.filter(isExpenseLog)
const incomeLogs = (d: { value: { items: ReturnType<typeof makeData>['items'] } }) =>
  d.value.items.filter(isIncomeLog)
const account = (d: { value: { items: ReturnType<typeof makeData>['items'] } }) =>
  d.value.items.find(isAccount)
const debt = (d: { value: { items: ReturnType<typeof makeData>['items'] } }, id: string) =>
  d.value.items.find((i) => isDebt(i) && i.id === id)

describe('useTransactions', () => {
  describe('addExp', () => {
    it('thêm expense_log vào đầu items[]', async () => {
      const { d, addExp } = setup()
      await addExp({ desc: 'Ăn trưa', amount: 50_000, cat: 'an' })
      const exp = expenseLogs(d)[0]
      expect(exp.name).toBe('Ăn trưa')
      expect(exp.amount).toBe(50_000)
      expect(exp.cat).toBe('an')
      expect(exp.pay_method).toBe('cash')
      expect(exp.due_date).toBe('2026-03-29')
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
      const { addExp } = useTransactions(d, push, toast, mockTStr())
      await addExp({ desc: 'X', amount: 10_000, cat: 'x' })
      expect(toast).toHaveBeenCalledWith('toast.expAddedErr', 'err')
    })

    it('thanh toán bằng Visa → tăng amount thẻ', async () => {
      const { d, addExp } = setup({
        items: [...makeData().items, { ...VISA1, amount: 5_000_000 }],
      })
      await addExp({ desc: 'Mua sắm', amount: 200_000, cat: 'mua', payMethod: 'visa1' })
      const card = debt(d, 'visa1')
      expect(card && isDebt(card) ? card.amount : 0).toBe(5_200_000)
    })

    it('expense Visa không ảnh hưởng thẻ khác', async () => {
      const { d, addExp } = setup({
        items: [
          ...makeData().items,
          { ...VISA1, amount: 5_000_000 },
          mkLoan('visa2', 'Visa 2', 3_000_000),
        ],
      })
      await addExp({ desc: 'Mua', amount: 100_000, cat: 'mua', payMethod: 'visa1' })
      const visa2 = debt(d, 'visa2')
      expect(visa2 && isDebt(visa2) ? visa2.amount : 0).toBe(3_000_000)
    })

    it('payMethod cash → không thay đổi amount thẻ', async () => {
      const { d, addExp } = setup({
        items: [...makeData().items, { ...VISA1, amount: 5_000_000 }],
      })
      await addExp({ desc: 'Ăn', amount: 50_000, cat: 'an', payMethod: 'cash' })
      const card = debt(d, 'visa1')
      expect(card && isDebt(card) ? card.amount : 0).toBe(5_000_000)
    })
  })

  describe('addInc', () => {
    it('thêm income_log vào đầu items[]', async () => {
      const { d, addInc } = setup()
      await addInc({ desc: 'Lương', amount: 1_000_000, cat: 'luong' })
      const inc = incomeLogs(d)[0]
      expect(inc.name).toBe('Lương')
      expect(inc.amount).toBe(1_000_000)
      expect(inc.cat).toBe('luong')
    })

    it('tăng cash balance sau khi thêm income', async () => {
      const { d, addInc } = setup()
      const before = account(d)?.amount ?? 0
      await addInc({ desc: 'Lương', amount: 1_000_000, cat: 'luong' })
      expect(account(d)?.amount).toBe(before + 1_000_000)
    })

    it('toast thành công', async () => {
      const { toast, addInc } = setup()
      await addInc({ desc: 'Lương', amount: 500_000, cat: 'luong' })
      expect(toast).toHaveBeenCalledWith('toast.incAdded')
    })
  })

  describe('deleteTx', () => {
    it('xoá income → giảm cash balance', async () => {
      const { d, addInc, deleteTx } = setup()
      const before = account(d)?.amount ?? 0
      await addInc({ desc: 'Thưởng', amount: 500_000, cat: 'thuong' })
      const incId = incomeLogs(d)[0].id
      await deleteTx({ id: incId, type: 'inc' })
      expect(incomeLogs(d)).toHaveLength(0)
      expect(account(d)?.amount).toBe(before)
    })

    it('xoá expense tiền mặt → xoá khỏi danh sách', async () => {
      const { d, addExp, deleteTx } = setup()
      await addExp({ desc: 'Ăn', amount: 30_000, cat: 'an' })
      const expId = expenseLogs(d)[0].id
      await deleteTx({ id: expId, type: 'exp' })
      expect(expenseLogs(d)).toHaveLength(0)
    })

    it('xoá expense Visa → giảm amount thẻ', async () => {
      const { d, addExp, deleteTx } = setup({
        items: [...makeData().items, { ...VISA1, amount: 5_000_000 }],
      })
      await addExp({ desc: 'Mua', amount: 200_000, cat: 'mua', payMethod: 'visa1' })
      const expId = expenseLogs(d)[0].id
      await deleteTx({ id: expId, type: 'exp' })
      const card = debt(d, 'visa1')
      expect(card && isDebt(card) ? card.amount : 0).toBe(5_000_000)
    })

    it('toast thành công khi xoá', async () => {
      const { d, toast, addExp, deleteTx } = setup()
      await addExp({ desc: 'X', amount: 10_000, cat: 'x' })
      await deleteTx({ id: expenseLogs(d)[0].id, type: 'exp' })
      expect(toast).toHaveBeenLastCalledWith('toast.txDeleted')
    })
  })

  describe('handlePopupSaveTx', () => {
    it('cập nhật expense theo _buf', async () => {
      const { d, addExp, handlePopupSaveTx } = setup()
      await addExp({ desc: 'Cũ', amount: 50_000, cat: 'an' })
      const expId = expenseLogs(d)[0].id
      await handlePopupSaveTx({
        id: expId,
        type: 'exp',
        _buf: { name: 'Mới', date: '2026-03-29', amt: 80_000, cat: 'cafe' },
      })
      const exp = expenseLogs(d)[0]
      expect(exp.name).toBe('Mới')
      expect(exp.amount).toBe(80_000)
      expect(exp.cat).toBe('cafe')
    })

    it('cập nhật income → điều chỉnh cash balance theo diff', async () => {
      const { d, addInc, handlePopupSaveTx } = setup()
      const before = account(d)?.amount ?? 0
      await addInc({ desc: 'Lương', amount: 500_000, cat: 'luong' })
      const incId = incomeLogs(d)[0].id
      await handlePopupSaveTx({
        id: incId,
        type: 'inc',
        _buf: { name: 'Lương mới', date: '2026-03-29', amt: 700_000, cat: 'luong' },
      })
      expect(account(d)?.amount).toBe(before + 700_000)
    })
  })

  describe('backgroundTranslate stale check', () => {
    it('không ghi đè nameI18n khi name đã thay đổi sau edit', async () => {
      let resolveOld!: (v: Partial<Record<string, string>>) => void
      vi.mocked(translateToAll)
        .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
        .mockImplementation(() => new Promise(() => {}))

      const { d, addExp, handlePopupSaveTx } = setup()
      await addExp({ desc: 'Mua cơm', amount: 50_000, cat: 'an' })
      const expId = expenseLogs(d)[0].id

      await handlePopupSaveTx({
        id: expId,
        type: 'exp',
        _buf: { name: 'Buy lunch', date: '2026-03-29', amt: 50_000, cat: 'an' },
      })
      expect(expenseLogs(d)[0].name).toBe('Buy lunch')

      resolveOld({ vi: 'Mua cơm', en: 'Buy rice', ja: '食べ物' })
      await Promise.resolve()
      await Promise.resolve()

      expect(expenseLogs(d)[0].name).toBe('Buy lunch')
      const i18n = expenseLogs(d)[0].nameI18n
      expect(i18n?.vi).not.toBe('Mua cơm')
      expect(i18n?.en).not.toBe('Buy rice')
    })
  })
})
