import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import {
  type AppData,
  type Item,
  mkAccount,
  mkExpenseLog,
  mkIncomeRecurring,
  mkOneTimeExpense,
  mkPaymentRecord,
} from '@/types/data'
import { useCashData } from '../data/useCashData'
import { useDailyLimit } from '../data/useDailyLimit'
import { makeData } from './helpers'

function setup(items?: Item[], metaOverride?: Partial<AppData['meta']>) {
  const d = ref(makeData({ items, meta: metaOverride }))
  const { dayLimit, actualPayDate } = useDailyLimit(d)
  const cash = useCashData(d, dayLimit, actualPayDate)
  return { d, dayLimit, ...cash }
}

const account = (asOf: string, balance = 1_000_000, reserved = 0) =>
  mkAccount('cash', 'Cash', { amount: balance, reserved, as_of: asOf })

const salary = (payDay: number) =>
  mkIncomeRecurring('salary', 'Salary', {
    amount: 22_923_000, per_period: 22_923_000, frequency: 'monthly', due_day_of_month: payDay,
  })

describe('useCashData', () => {
  afterEach(() => vi.useRealTimers())

  describe('spentSinceSnapshot', () => {
    it('không có expense_log → 0', () => {
      const { spentSinceSnapshot } = setup([account('2026-03-01'), salary(5)])
      expect(spentSinceSnapshot.value).toBe(0)
    })

    it('tính expense tiền mặt sau as_of', () => {
      const { spentSinceSnapshot } = setup([
        account('2026-03-20'),
        salary(5),
        mkExpenseLog('tx_e_1', 'Ăn', { amount: 50_000, cat: 'an', due_date: '2026-03-25', pay_method: 'cash' }),
        mkExpenseLog('tx_e_2', 'Cafe', { amount: 30_000, cat: 'cafe', due_date: '2026-03-22' }),
      ])
      expect(spentSinceSnapshot.value).toBe(80_000)
    })

    it('bỏ qua expense trước as_of', () => {
      const { spentSinceSnapshot } = setup([
        account('2026-03-20'),
        salary(5),
        mkExpenseLog('tx_e_1', 'Cũ', { amount: 100_000, cat: 'an', due_date: '2026-03-19' }),
        mkExpenseLog('tx_e_2', 'Mới', { amount: 50_000, cat: 'an', due_date: '2026-03-21' }),
      ])
      expect(spentSinceSnapshot.value).toBe(50_000)
    })

    it('bỏ qua expense_log có ref_id (payment đã thanh toán)', () => {
      const { spentSinceSnapshot } = setup([
        account('2026-03-01'),
        salary(5),
        mkExpenseLog('tx_e_1', 'Ăn', { amount: 50_000, cat: 'an', due_date: '2026-03-10' }),
        mkExpenseLog('tx_e_2', 'Trả nợ', { amount: 500_000, cat: 'thanhToan', due_date: '2026-03-10', ref_id: 'ob:key' }),
      ])
      expect(spentSinceSnapshot.value).toBe(50_000)
    })

    it('bỏ qua expense thanh toán qua thẻ', () => {
      const { spentSinceSnapshot } = setup([
        account('2026-03-01'),
        salary(5),
        mkExpenseLog('tx_e_1', 'Ăn', { amount: 50_000, cat: 'an', due_date: '2026-03-10', pay_method: 'cash' }),
        mkExpenseLog('tx_e_2', 'Mua', { amount: 200_000, cat: 'mua', due_date: '2026-03-10', pay_method: 'visa1' }),
      ])
      expect(spentSinceSnapshot.value).toBe(50_000)
    })

    it('trả về 0 nếu account không có as_of', () => {
      const d = ref(makeData({
        items: [
          account(''),
          mkExpenseLog('tx_e_1', 'x', { amount: 100_000, cat: 'an', due_date: '2026-03-10' }),
        ],
      }))
      const dl = computed(() => 70_000)
      const { spentSinceSnapshot } = useCashData(d, dl, () => new Date())
      expect(spentSinceSnapshot.value).toBe(0)
    })
  })

  describe('availCash', () => {
    it('amount - reserved - spentSinceSnapshot', () => {
      const { availCash } = setup([
        account('2026-03-01', 1_000_000, 200_000),
        salary(5),
        mkExpenseLog('tx_e_1', 'Ăn', { amount: 50_000, cat: 'an', due_date: '2026-03-10' }),
      ])
      expect(availCash.value).toBe(750_000)
    })

    it('không có reserved → amount - spent', () => {
      const { availCash } = setup([account('2026-03-01', 500_000), salary(5)])
      expect(availCash.value).toBe(500_000)
    })

    it('trả về 0 nếu không có account', () => {
      const d = ref(makeData({ items: [salary(5)] }))
      const dl = computed(() => 70_000)
      const { availCash } = useCashData(d, dl, () => new Date())
      expect(availCash.value).toBe(0)
    })
  })

  describe('cashDaysLeft', () => {
    it('dayLimit = 0 → null', () => {
      const d = ref(makeData({
        items: [account('2026-03-01')],
        meta: { daily_limit: { until_salary: 0, after_salary: 0 }, custom_daily_limit: 0 },
      }))
      const dl = computed(() => 0)
      const { cashDaysLeft } = useCashData(d, dl, () => new Date())
      expect(cashDaysLeft.value).toBeNull()
    })

    it('cash đủ → tính số ngày đúng', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { cashDaysLeft } = setup(
        [account('2026-03-03', 700_000), salary(5)],
        { custom_daily_limit: 100_000 },
      )
      expect(cashDaysLeft.value).toBe(7)
    })

    it('cash sau khi trừ obligations ≤ 0 → 0', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { cashDaysLeft } = setup(
        [
          account('2026-03-03', 100_000),
          salary(25),
          mkOneTimeExpense('ote_1', 'Trả thẻ', { amount: 200_000, due_date: '2026-03-10' }),
        ],
        { custom_daily_limit: 100_000 },
      )
      expect(cashDaysLeft.value).toBe(0)
    })
  })

  describe('unpaidObsToPayday', () => {
    it('không có obligations → 0', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { unpaidObsToPayday } = setup([account('2026-03-01'), salary(5)])
      expect(unpaidObsToPayday.value).toBe(0)
    })

    it('tính one_time_expense chưa thanh toán trước pay date', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { unpaidObsToPayday } = setup([
        account('2026-03-01'),
        salary(25),
        mkOneTimeExpense('ote_1', 'Trả nợ', { amount: 300_000, due_date: '2026-03-10' }),
        mkOneTimeExpense('ote_2', 'Sau lương', { amount: 500_000, due_date: '2026-03-28' }),
      ])
      expect(unpaidObsToPayday.value).toBe(300_000)
    })

    it('bỏ qua obligations đã có payment_record', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { unpaidObsToPayday } = setup([
        account('2026-03-01'),
        salary(25),
        mkOneTimeExpense('ote_1', 'Trả nợ', { amount: 300_000, due_date: '2026-03-10' }),
        mkPaymentRecord('pay_1', 'Trả nợ', {
          amount: 300_000, due_date: '2026-03-10',
          key: '2026-03-10:Trả nợ', ref_id: 'ote_1', ref_type: 'one_time_expense',
        }),
      ])
      expect(unpaidObsToPayday.value).toBe(0)
    })
  })
})
