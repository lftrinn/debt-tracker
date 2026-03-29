import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useDailyLimit } from '../useDailyLimit'
import { makeData } from './helpers'

describe('useDailyLimit', () => {
  afterEach(() => vi.useRealTimers())

  // ─── actualPayDate ────────────────────────────────────────────────────

  describe('actualPayDate', () => {
    it('ngày thường → trả về nguyên ngày đó', () => {
      const d = ref(makeData())
      const { actualPayDate } = useDailyLimit(d)
      // 2026-03-05 là thứ Năm
      const result = actualPayDate(2026, 2, 5) // month 2 = March (0-indexed)
      expect(result.getDate()).toBe(5)
      expect(result.getMonth()).toBe(2)
    })

    it('Thứ Bảy → lùi về Thứ Sáu (-1 ngày)', () => {
      const d = ref(makeData())
      const { actualPayDate } = useDailyLimit(d)
      // 2026-05-02 là thứ Bảy
      const result = actualPayDate(2026, 4, 2)
      expect(result.getDay()).toBe(5) // Friday
      expect(result.getDate()).toBe(1)
    })

    it('Chủ Nhật → tiến lên Thứ Hai (+1 ngày)', () => {
      const d = ref(makeData())
      const { actualPayDate } = useDailyLimit(d)
      // 2026-04-05 là Chủ Nhật
      const result = actualPayDate(2026, 3, 5)
      expect(result.getDay()).toBe(1) // Monday
      expect(result.getDate()).toBe(6)
    })
  })

  // ─── afterSalary ──────────────────────────────────────────────────────

  describe('afterSalary', () => {
    it('trước ngày lương → false', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ income: { monthly_net: 22_923_000, pay_date: 5 } }))
      const { afterSalary } = useDailyLimit(d)
      expect(afterSalary.value).toBe(false)
    })

    it('sau ngày lương → true', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({ income: { monthly_net: 22_923_000, pay_date: 5 } }))
      const { afterSalary } = useDailyLimit(d)
      expect(afterSalary.value).toBe(true)
    })

    it('đúng ngày lương → true', () => {
      vi.setSystemTime(new Date('2026-03-05T08:00:00'))
      const d = ref(makeData({ income: { monthly_net: 22_923_000, pay_date: 5 } }))
      const { afterSalary } = useDailyLimit(d)
      expect(afterSalary.value).toBe(true)
    })
  })

  // ─── dayLimit ─────────────────────────────────────────────────────────

  describe('dayLimit', () => {
    it('trước lương → dùng until_salary (70_000)', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData())
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(70_000)
    })

    it('sau lương → dùng after_salary (100_000)', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData())
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(100_000)
    })

    it('custom_daily_limit > 0 → luôn dùng custom', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ custom_daily_limit: 150_000 }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(150_000)
    })

    it('custom_daily_limit = 0 → dùng rules', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ custom_daily_limit: 0 }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(70_000)
    })

    it('phản ứng khi d thay đổi từ custom → 0', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ custom_daily_limit: 200_000 }))
      const { dayLimit } = useDailyLimit(d)
      expect(dayLimit.value).toBe(200_000)
      d.value = { ...d.value, custom_daily_limit: 0 }
      expect(dayLimit.value).toBe(70_000)
    })
  })

  // ─── dToSalary ────────────────────────────────────────────────────────

  describe('dToSalary', () => {
    it('2 ngày trước pay date → dToSalary = 2', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({ income: { monthly_net: 22_923_000, pay_date: 5 } }))
      const { dToSalary } = useDailyLimit(d)
      expect(dToSalary.value).toBe(2)
    })

    it('sau pay date → nhảy sang tháng sau', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({ income: { monthly_net: 22_923_000, pay_date: 5 } }))
      const { dToSalary } = useDailyLimit(d)
      // Next pay is April 5 (Sunday → Monday April 6)
      // March 10 → April 6 = 27 days
      expect(dToSalary.value).toBeGreaterThan(0)
      expect(dToSalary.value).toBeLessThan(30)
    })
  })
})
