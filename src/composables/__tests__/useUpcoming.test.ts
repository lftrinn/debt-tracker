import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useUpcoming } from '../useUpcoming'
import { makeData } from './helpers'

describe('useUpcoming', () => {
  afterEach(() => vi.useRealTimers())

  // ─── upcomingLabel ────────────────────────────────────────────────────

  describe('upcomingLabel', () => {
    it('trả về nhãn tháng hiện tại', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData())
      const { upcomingLabel } = useUpcoming(d)
      expect(upcomingLabel.value).toBe('T3/2026')
    })

    it('tháng 12', () => {
      vi.setSystemTime(new Date('2026-12-01T12:00:00'))
      const d = ref(makeData())
      const { upcomingLabel } = useUpcoming(d)
      expect(upcomingLabel.value).toBe('T12/2026')
    })
  })

  // ─── upcoming — nguồn one_time ────────────────────────────────────────

  describe('upcoming từ one_time_expenses', () => {
    it('không có expenses → mảng rỗng', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData())
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })

    it('expense trong tương lai → xuất hiện', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Trả nợ', date: '2026-03-10', amount: 300_000 }],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(1)
      expect(upcoming.value[0].name).toBe('Trả nợ')
      expect(upcoming.value[0].amt).toBe(300_000)
      expect(upcoming.value[0].source).toBe('one_time')
    })

    it('expense đã paid trong quá khứ → bỏ qua', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Trả nợ', date: '2026-03-05', amount: 300_000 }],
        paid_obligations: ['2026-03-05:Trả nợ'],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })

    it('expense chưa paid quá hạn > 30 ngày → bỏ qua', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Cũ', date: '2026-01-01', amount: 100_000 }],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })

    it('expense chưa paid quá hạn ≤ 30 ngày → vẫn hiển thị', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Trễ', date: '2026-03-05', amount: 100_000 }],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(1)
      expect(upcoming.value[0].urg).toBe('overdue')
      expect(upcoming.value[0].overdueDays).toBe(5)
    })
  })

  // ─── upcoming — urgency ───────────────────────────────────────────────

  describe('urgency', () => {
    it('còn 3 ngày (≤ 5) → urgent', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Sắp đến', date: '2026-03-06', amount: 100_000 }],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].urg).toBe('urgent')
    })

    it('còn 8 ngày (≤ 10) → soon', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Sắp tới', date: '2026-03-11', amount: 100_000 }],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].urg).toBe('soon')
    })

    it('còn 15 ngày → ok', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Xa', date: '2026-03-18', amount: 100_000 }],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].urg).toBe('ok')
    })

    it('đã paid và chưa đến hạn → ok', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [{ id: 1, name: 'Đã trả', date: '2026-03-10', amount: 100_000 }],
        paid_obligations: ['2026-03-10:Đã trả'],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].paid).toBe(true)
      expect(upcoming.value[0].urg).toBe('ok')
    })
  })

  // ─── upcoming — monthly_plan ──────────────────────────────────────────

  describe('upcoming từ monthly_plans', () => {
    it('obligation trong monthly_plan → xuất hiện', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        monthly_plans: {
          '2026-03': {
            obligations: [{ name: 'Visa 1 min', amount: 500_000, date: '2026-03-15', category: 'debt_minimum' }],
          },
        },
      }))
      const { upcoming } = useUpcoming(d)
      const item = upcoming.value.find((x) => x.name === 'Visa 1 min')
      expect(item).toBeDefined()
      expect(item?.source).toBe('monthly_plan')
      expect(item?.sub).toBe('Thanh toán tối thiểu')
    })

    it('obligation monthly = true → bỏ qua', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        monthly_plans: {
          '2026-03': {
            obligations: [{ name: 'Thuê nhà', amount: 2_000_000, date: '2026-03-05', monthly: true }],
          },
        },
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })

    it('obligation không có date → bỏ qua', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        monthly_plans: {
          '2026-03': {
            obligations: [{ name: 'Không có ngày', amount: 100_000 }],
          },
        },
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })
  })

  // ─── sắp xếp ──────────────────────────────────────────────────────────

  describe('sort', () => {
    it('sắp xếp theo ngày tăng dần', () => {
      vi.setSystemTime(new Date('2026-03-01T12:00:00'))
      const d = ref(makeData({
        one_time_expenses: [
          { id: 1, name: 'Muộn', date: '2026-03-20', amount: 100_000 },
          { id: 2, name: 'Sớm', date: '2026-03-05', amount: 200_000 },
          { id: 3, name: 'Giữa', date: '2026-03-10', amount: 150_000 },
        ],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].name).toBe('Sớm')
      expect(upcoming.value[1].name).toBe('Giữa')
      expect(upcoming.value[2].name).toBe('Muộn')
    })

    it('giới hạn 10 items', () => {
      vi.setSystemTime(new Date('2026-03-01T12:00:00'))
      const expenses = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        date: `2026-03-${String(i + 2).padStart(2, '0')}`,
        amount: 100_000,
      }))
      const d = ref(makeData({ one_time_expenses: expenses }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(10)
    })
  })
})
