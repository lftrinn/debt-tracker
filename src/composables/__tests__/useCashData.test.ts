import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import type { AppData } from '@/types/data'
import { useCashData } from '../data/useCashData'
import { useDailyLimit } from '../data/useDailyLimit'
import { makeData } from './helpers'

/** Helper: build useCashData wired to a real useDailyLimit */
function setup(dataOverrides = {}) {
  const d = ref(makeData(dataOverrides))
  const { dayLimit, actualPayDate } = useDailyLimit(d)
  const cash = useCashData(d, dayLimit, actualPayDate)
  return { d, dayLimit, ...cash }
}

describe('useCashData', () => {
  afterEach(() => vi.useRealTimers())

  // ─── spentSinceSnapshot ───────────────────────────────────────────────

  describe('spentSinceSnapshot', () => {
    it('không có transactions → 0', () => {
      const { spentSinceSnapshot } = setup()
      expect(spentSinceSnapshot.value).toBe(0)
    })

    it('tính transaction tiền mặt sau as_of', () => {
      const { spentSinceSnapshot } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-20' },
        transactions: [
          { id: 1, type: 'exp', desc: 'Ăn', amount: 50_000, cat: 'an', date: '2026-03-25', payMethod: 'cash' },
          { id: 2, type: 'exp', desc: 'Cafe', amount: 30_000, cat: 'cafe', date: '2026-03-22' }, // no payMethod → cash
        ],
      })
      expect(spentSinceSnapshot.value).toBe(80_000)
    })

    it('bỏ qua transaction trước as_of', () => {
      const { spentSinceSnapshot } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-20' },
        transactions: [
          { id: 1, type: 'exp', desc: 'Cũ', amount: 100_000, cat: 'an', date: '2026-03-19' }, // trước as_of
          { id: 2, type: 'exp', desc: 'Mới', amount: 50_000, cat: 'an', date: '2026-03-21' },
        ],
      })
      expect(spentSinceSnapshot.value).toBe(50_000)
    })

    it('bỏ qua transaction thanh toán qua Visa', () => {
      const { spentSinceSnapshot } = setup({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
        transactions: [
          { id: 1, type: 'exp', desc: 'Ăn', amount: 50_000, cat: 'an', date: '2026-03-10', payMethod: 'cash' },
          { id: 2, type: 'exp', desc: 'Mua Visa', amount: 200_000, cat: 'mua', date: '2026-03-10', payMethod: 'visa1' },
        ],
      })
      expect(spentSinceSnapshot.value).toBe(50_000)
    })

    it('trả về 0 nếu không có as_of', () => {
      const d = ref(makeData({
        current_cash: { balance: 1_000_000, reserved: 0, as_of: '' },
        transactions: [{ id: 1, type: 'exp', desc: 'x', amount: 100_000, cat: 'an', date: '2026-03-10' }],
      }))
      const dl = computed(() => 70_000)
      const { spentSinceSnapshot } = useCashData(d, dl, () => new Date())
      expect(spentSinceSnapshot.value).toBe(0)
    })
  })

  // ─── availCash ────────────────────────────────────────────────────────

  describe('availCash', () => {
    it('balance - reserved - spentSinceSnapshot', () => {
      const { availCash } = setup({
        current_cash: { balance: 1_000_000, reserved: 200_000, as_of: '2026-03-01' },
        transactions: [{ id: 1, type: 'exp', desc: 'Ăn', amount: 50_000, cat: 'an', date: '2026-03-10' }],
      })
      expect(availCash.value).toBe(750_000)
    })

    it('không có reserved → balance - spent', () => {
      const { availCash } = setup({
        current_cash: { balance: 500_000, reserved: 0, as_of: '2026-03-01' },
      })
      expect(availCash.value).toBe(500_000)
    })

    it('trả về 0 nếu current_cash null', () => {
      const d = ref({
        ...makeData(),
        current_cash: null as unknown as AppData['current_cash'],
      })
      const dl = computed(() => 70_000)
      const { availCash } = useCashData(d, dl, () => new Date())
      expect(availCash.value).toBe(0)
    })
  })

  // ─── cashDaysLeft ─────────────────────────────────────────────────────

  describe('cashDaysLeft', () => {
    it('dayLimit = 0 → null', () => {
      const d = ref(makeData({ custom_daily_limit: 0, rules: { daily_limit: { until_salary: 0, after_salary: 0 }, must_not: [] } }))
      const dl = computed(() => 0)
      const { cashDaysLeft } = useCashData(d, dl, () => new Date())
      expect(cashDaysLeft.value).toBeNull()
    })

    it('cash đủ → tính số ngày đúng', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { cashDaysLeft } = setup({
        current_cash: { balance: 700_000, reserved: 0, as_of: '2026-03-03' },
        custom_daily_limit: 100_000,
      })
      // availCash = 700_000, dayLimit = 100_000 → floor(700_000/100_000) = 7
      expect(cashDaysLeft.value).toBe(7)
    })

    it('cash sau khi trừ obligations ≤ 0 → 0', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { cashDaysLeft } = setup({
        current_cash: { balance: 100_000, reserved: 0, as_of: '2026-03-03' },
        custom_daily_limit: 100_000,
        income: { monthly_net: 22_923_000, pay_date: 25 },
        one_time_expenses: [{ id: 1, name: 'Trả thẻ', date: '2026-03-10', amount: 200_000 }],
      })
      expect(cashDaysLeft.value).toBe(0)
    })
  })

  // ─── unpaidObsToPayday ────────────────────────────────────────────────

  describe('unpaidObsToPayday', () => {
    it('không có obligations → 0', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { unpaidObsToPayday } = setup()
      expect(unpaidObsToPayday.value).toBe(0)
    })

    it('tính one_time_expenses chưa thanh toán trước pay date', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { unpaidObsToPayday } = setup({
        income: { monthly_net: 22_923_000, pay_date: 25 },
        one_time_expenses: [
          { id: 1, name: 'Trả nợ', date: '2026-03-10', amount: 300_000 },   // trước pay date
          { id: 2, name: 'Sau lương', date: '2026-03-28', amount: 500_000 }, // sau pay date → không tính
        ],
      })
      expect(unpaidObsToPayday.value).toBe(300_000)
    })

    it('bỏ qua obligations đã paid', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const { unpaidObsToPayday } = setup({
        income: { monthly_net: 22_923_000, pay_date: 25 },
        one_time_expenses: [{ id: 1, name: 'Trả nợ', date: '2026-03-10', amount: 300_000 }],
        paid_obligations: ['2026-03-10:Trả nợ'],
      })
      expect(unpaidObsToPayday.value).toBe(0)
    })
  })
})
