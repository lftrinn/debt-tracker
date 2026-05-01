import { describe, it, expect, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { mkOneTimeExpense, mkFixedExpense, mkPaymentRecord } from '@/types/data'
import { useUpcoming } from '../data/useUpcoming'
import { makeData } from './helpers'

describe('useUpcoming', () => {
  afterEach(() => vi.useRealTimers())

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

  describe('upcoming từ one_time_expense', () => {
    it('không có expense → mảng rỗng', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData())
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })

    it('expense trong tương lai → xuất hiện', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [mkOneTimeExpense('ote_1', 'Trả nợ', { amount: 300_000, due_date: '2026-03-10' })],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(1)
      expect(upcoming.value[0].name).toBe('Trả nợ')
      expect(upcoming.value[0].amt).toBe(300_000)
      expect(upcoming.value[0].source).toBe('one_time_expense')
    })

    it('expense đã paid trong quá khứ → bỏ qua', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({
        items: [
          mkOneTimeExpense('ote_1', 'Trả nợ', { amount: 300_000, due_date: '2026-03-05' }),
          mkPaymentRecord('pay_1', 'Trả nợ', {
            amount: 300_000, due_date: '2026-03-05',
            key: '2026-03-05:Trả nợ', ref_id: 'ote_1', ref_type: 'one_time_expense',
          }),
        ],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })

    it('expense chưa paid quá hạn > 30 ngày → bỏ qua', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({
        items: [mkOneTimeExpense('ote_1', 'Cũ', { amount: 100_000, due_date: '2026-01-01' })],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })

    it('expense chưa paid quá hạn ≤ 30 ngày → vẫn hiển thị', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00'))
      const d = ref(makeData({
        items: [mkOneTimeExpense('ote_1', 'Trễ', { amount: 100_000, due_date: '2026-03-05' })],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(1)
      expect(upcoming.value[0].urg).toBe('overdue')
      expect(upcoming.value[0].overdueDays).toBe(5)
    })
  })

  describe('urgency', () => {
    it('còn 3 ngày (≤ 5) → urgent', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [mkOneTimeExpense('ote_1', 'Sắp đến', { amount: 100_000, due_date: '2026-03-06' })],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].urg).toBe('urgent')
    })

    it('còn 8 ngày (≤ 10) → soon', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [mkOneTimeExpense('ote_1', 'Sắp tới', { amount: 100_000, due_date: '2026-03-11' })],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].urg).toBe('soon')
    })

    it('còn 15 ngày → ok', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [mkOneTimeExpense('ote_1', 'Xa', { amount: 100_000, due_date: '2026-03-18' })],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].urg).toBe('ok')
    })

    it('đã paid và chưa đến hạn → ok', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [
          mkOneTimeExpense('ote_1', 'Đã trả', { amount: 100_000, due_date: '2026-03-10' }),
          mkPaymentRecord('pay_1', 'Đã trả', {
            amount: 100_000, due_date: '2026-03-10',
            key: '2026-03-10:Đã trả', ref_id: 'ote_1', ref_type: 'one_time_expense',
          }),
        ],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].paid).toBe(true)
      expect(upcoming.value[0].urg).toBe('ok')
    })
  })

  describe('upcoming từ fixed_expense', () => {
    it('fixed_expense có due_date → xuất hiện', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [
          mkFixedExpense('fe_1', 'Visa 1 min', {
            amount: 500_000, per_period: 500_000, frequency: 'monthly',
            due_date: '2026-03-15', cat: 'debt_minimum',
          }),
        ],
      }))
      const { upcoming } = useUpcoming(d)
      const item = upcoming.value.find((x) => x.name === 'Visa 1 min')
      expect(item).toBeDefined()
      expect(item?.source).toBe('fixed_expense')
    })

    it('fixed_expense không có due_date → bỏ qua', () => {
      vi.setSystemTime(new Date('2026-03-03T12:00:00'))
      const d = ref(makeData({
        items: [
          mkFixedExpense('fe_1', 'Thuê nhà', {
            amount: 2_000_000, per_period: 2_000_000, frequency: 'monthly',
            due_day_of_month: 5,
          }),
        ],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(0)
    })
  })

  describe('sort', () => {
    it('sắp xếp theo ngày tăng dần', () => {
      vi.setSystemTime(new Date('2026-03-01T12:00:00'))
      const d = ref(makeData({
        items: [
          mkOneTimeExpense('a', 'Muộn', { amount: 100_000, due_date: '2026-03-20' }),
          mkOneTimeExpense('b', 'Sớm', { amount: 200_000, due_date: '2026-03-05' }),
          mkOneTimeExpense('c', 'Giữa', { amount: 150_000, due_date: '2026-03-10' }),
        ],
      }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value[0].name).toBe('Sớm')
      expect(upcoming.value[1].name).toBe('Giữa')
      expect(upcoming.value[2].name).toBe('Muộn')
    })

    it('giới hạn 10 items', () => {
      vi.setSystemTime(new Date('2026-03-01T12:00:00'))
      const items = Array.from({ length: 15 }, (_, i) =>
        mkOneTimeExpense('ote_' + (i + 1), 'Item ' + (i + 1), {
          amount: 100_000,
          due_date: `2026-03-${String(i + 2).padStart(2, '0')}`,
        })
      )
      const d = ref(makeData({ items }))
      const { upcoming } = useUpcoming(d)
      expect(upcoming.value).toHaveLength(10)
    })
  })
})
