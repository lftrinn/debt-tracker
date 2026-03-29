import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useFormatters } from '../useFormatters'

describe('useFormatters', () => {
  const { fN, fS, fV, fDate, tStr, isT, isTM, dDiff } = useFormatters()

  // ─── fS (format short) ──────────────────────────────────────────────────

  describe('fS', () => {
    it('số < 1000 trả về chuỗi nguyên', () => {
      expect(fS(999)).toBe('999')
      expect(fS(0)).toBe('0')
      expect(fS(1)).toBe('1')
    })

    it('>= 1000 trả về dạng K (làm tròn)', () => {
      expect(fS(1000)).toBe('1K')
      expect(fS(1500)).toBe('2K')
      expect(fS(999000)).toBe('999K')
    })

    it('>= 1_000_000 trả về dạng M', () => {
      expect(fS(1000000)).toBe('1M')
      expect(fS(1500000)).toBe('1.5M')
      expect(fS(2000000)).toBe('2M')
      expect(fS(22923000)).toBe('22.9M')
    })

    it('>= 1_000_000_000 trả về dạng B', () => {
      expect(fS(1000000000)).toBe('1B')
      expect(fS(1500000000)).toBe('1.5B')
      expect(fS(2000000000)).toBe('2B')
    })

    it('số âm dùng Math.abs', () => {
      expect(fS(-50000)).toBe('50K')
      expect(fS(-1500000)).toBe('1.5M')
    })

    it('null/undefined trả về "0"', () => {
      expect(fS(null)).toBe('0')
      expect(fS(undefined)).toBe('0')
    })
  })

  // ─── fV (format value) ──────────────────────────────────────────────────

  describe('fV', () => {
    it('thêm ký hiệu ₫ vào đầu', () => {
      expect(fV(50000)).toMatch(/^₫/)
    })

    it('0 → "₫0"', () => {
      expect(fV(0)).toBe('₫0')
    })

    it('số âm dùng giá trị tuyệt đối', () => {
      expect(fV(-50000)).toEqual(fV(50000))
    })

    it('null/undefined → "₫0"', () => {
      expect(fV(null)).toBe('₫0')
      expect(fV(undefined)).toBe('₫0')
    })
  })

  // ─── fN (format number) ─────────────────────────────────────────────────

  describe('fN', () => {
    it('0 → "0"', () => {
      expect(fN(0)).toBe('0')
    })

    it('null/undefined → "0"', () => {
      expect(fN(null)).toBe('0')
      expect(fN(undefined)).toBe('0')
    })

    it('số lớn có dấu phân cách vi-VN (dấu chấm hoặc dấu phẩy tùy locale)', () => {
      const result = fN(1234567)
      // vi-VN dùng dấu chấm phân cách hàng nghìn: "1.234.567"
      expect(result).toContain('1')
      expect(result.length).toBeGreaterThan(7) // có dấu phân cách
    })
  })

  // ─── tStr (today string) ────────────────────────────────────────────────

  describe('tStr', () => {
    it('trả về đúng format YYYY-MM-DD', () => {
      const result = tStr()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('trả về ngày hiện tại (local time)', () => {
      const now = new Date()
      const expected =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0')
      expect(tStr()).toBe(expected)
    })

    it('tháng và ngày luôn có 2 chữ số (zero-padded)', () => {
      // mock ngày 1 tháng 1
      vi.setSystemTime(new Date('2026-01-01T10:00:00'))
      expect(tStr()).toBe('2026-01-01')
      vi.useRealTimers()
    })
  })

  // ─── isT (is today) ─────────────────────────────────────────────────────

  describe('isT', () => {
    it('tStr() → true', () => {
      expect(isT(tStr())).toBe(true)
    })

    it('ngày hôm qua → false', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const ds =
        yesterday.getFullYear() +
        '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(yesterday.getDate()).padStart(2, '0')
      expect(isT(ds)).toBe(false)
    })

    it('ngày mai → false', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const ds =
        tomorrow.getFullYear() +
        '-' +
        String(tomorrow.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(tomorrow.getDate()).padStart(2, '0')
      expect(isT(ds)).toBe(false)
    })
  })

  // ─── isTM (is this month) ───────────────────────────────────────────────

  describe('isTM', () => {
    it('ngày hôm nay → true', () => {
      expect(isTM(tStr())).toBe(true)
    })

    it('đầu tháng hiện tại → true', () => {
      const now = new Date()
      const firstDay =
        now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01'
      expect(isTM(firstDay)).toBe(true)
    })

    it('tháng trước → false', () => {
      // Tránh overflow: dùng setSystemTime cố định để tránh edge case tháng 3 ngày 29/30/31
      vi.setSystemTime(new Date('2026-03-15T12:00:00'))
      const { isTM: isTMFixed } = useFormatters()
      expect(isTMFixed('2026-02-15')).toBe(false)
      vi.useRealTimers()
    })

    it('tháng sau → false', () => {
      const next = new Date()
      next.setMonth(next.getMonth() + 1)
      const ds =
        next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0') + '-01'
      expect(isTM(ds)).toBe(false)
    })
  })

  // ─── dDiff (date diff) ──────────────────────────────────────────────────

  describe('dDiff', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-03-29T12:00:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('hôm nay → 0', () => {
      expect(dDiff('2026-03-29')).toBe(0)
    })

    it('ngày mai → 1', () => {
      expect(dDiff('2026-03-30')).toBe(1)
    })

    it('hôm qua → -1', () => {
      expect(dDiff('2026-03-28')).toBe(-1)
    })

    it('7 ngày sau → 7', () => {
      expect(dDiff('2026-04-05')).toBe(7)
    })

    it('30 ngày trước → -30', () => {
      expect(dDiff('2026-02-27')).toBe(-30)
    })

    it('không bị ảnh hưởng bởi giờ trong ngày', () => {
      // Mock lúc 23:59
      vi.setSystemTime(new Date('2026-03-29T23:59:59'))
      expect(dDiff('2026-03-29')).toBe(0)
      expect(dDiff('2026-03-30')).toBe(1)
    })
  })

  // ─── fDate ──────────────────────────────────────────────────────────────

  describe('fDate', () => {
    it('trả về chuỗi ngày theo vi-VN', () => {
      const result = fDate('2026-03-29')
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })
})
