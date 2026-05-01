import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { mkIncomeRecurring, mkAccount } from '@/types/data'
import { useDailyLimit } from '../data/useDailyLimit'
import { makeData } from './helpers'

const baseItems = (payDay: number) => [
  mkAccount('cash', 'Cash', { amount: 1_000_000, as_of: '2026-03-01' }),
  mkIncomeRecurring('salary', 'Salary', {
    amount: 22_923_000, per_period: 22_923_000, frequency: 'monthly', due_day_of_month: payDay,
  }),
]

describe('useDailyLimit', () => {
  afterEach(() => vi.useRealTimers())

  describe('actualPayDate', () => {
    it('ngày thường → trả về nguyên ngày đó', () => {
      const d = ref(makeData())
      const { actualPayDate } = useDailyLimit(d)
      const result = actualPayDate(2026, 2, 5)
      expect(result.getDate()).toBe(5)
      expect(result.getMonth()).toBe(2)
    })

    it('Thứ Bảy → lùi về Thứ Sáu', () => {
      const d = ref(makeData())
      const { actualPayDate } = useDailyLimit(d)
      const result = actualPayDate(2026, 4, 2)
      expect(result.getDay()).toBe(5)
      expect(result.getDate()).toBe(1)
    })

    it('Chủ Nhật → tiến lên Thứ Hai', () => {
      const d = ref(makeData())
      const { actualPayDate } = useDailyLimit(d)
      const result = actualPayDate(2026, 3, 5)
      expect(result.getDay()).toBe(1)
      expect(result.getDate()).toBe(6)
    })
  })

  describe('afterSalary', () => {
    it('trước ngày lương → false', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ items: baseItems(5) }))
      const { afterSalary } = useDailyLimit(d)
      expect(afterSalary.value).toBe(false)
    })

    it('sau ngày lương → true', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({ items: baseItems(5) }))
      const { afterSalary } = useDailyLimit(d)
      expect(afterSalary.value).toBe(true)
    })

    it('đúng ngày lương → true', () => {
      vi.setSystemTime(new Date('2026-03-05T08:00:00'))
      const d = ref(makeData({ items: baseItems(5) }))
      const { afterSalary } = useDailyLimit(d)
      expect(afterSalary.value).toBe(true)
    })
  })

  describe('dayLimit', () => {
    it('trước lương → dùng until_salary (70_000)', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ items: baseItems(5) }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(70_000)
    })

    it('sau lương → dùng after_salary (100_000)', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({ items: baseItems(5) }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(100_000)
    })

    it('custom_daily_limit > 0 → luôn dùng custom', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ items: baseItems(5), meta: { custom_daily_limit: 150_000 } }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(150_000)
    })

    it('custom_daily_limit = 0 → dùng meta.daily_limit', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ items: baseItems(5), meta: { custom_daily_limit: 0 } }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(70_000)
    })

    it('phản ứng khi meta thay đổi từ custom → 0', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ items: baseItems(5), meta: { custom_daily_limit: 200_000 } }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(200_000)
      d.value = { ...d.value, meta: { ...d.value.meta, custom_daily_limit: 0 } }
      expect(dayLimit.value).toBe(70_000)
    })
  })

  describe('dToSalary', () => {
    it('2 ngày trước pay date → dToSalary = 2', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ items: baseItems(5) }))
      const { dToSalary } = useDailyLimit(d)
      expect(dToSalary.value).toBe(2)
    })

    it('sau pay date → nhảy sang tháng sau', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({ items: baseItems(5) }))
      const { dToSalary } = useDailyLimit(d)
      expect(dToSalary.value).toBeGreaterThan(0)
      expect(dToSalary.value).toBeLessThan(30)
    })
  })
})
