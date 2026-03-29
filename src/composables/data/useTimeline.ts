import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, Milestone } from '@/types/data'
import { useFormatters } from '../ui/useFormatters'

/**
 * Xây dựng danh sách mốc tiến độ trả nợ từ dữ liệu payoff_timeline.
 * Ưu tiên dùng milestones nếu có, fallback sang projected_debt_by_month.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @returns milestones — danh sách mốc với trạng thái done/active/future
 */
export function useTimeline(d: Ref<AppData>): { milestones: ComputedRef<Milestone[]> } {
  const { fS } = useFormatters()

  /**
   * Danh sách mốc trả nợ với trạng thái so với tháng hiện tại.
   * Tra debtMap để hiển thị tổng nợ tương ứng với từng milestone tháng.
   */
  const milestones = computed((): Milestone[] => {
    const now = new Date().toISOString().slice(0, 7)
    const raw = d.value.payoff_timeline?.milestones || []
    const debtMap: Record<string, number> = {}
    ;(d.value.payoff_timeline?.projected_debt_by_month || []).forEach((p) => {
      debtMap[p.month] = p.total_debt
    })

    if (raw.length) {
      return raw.map((m): Milestone => ({
        month: m.month,
        ev: m.event || (m.month === '2026-11' ? '🏆 THOÁT NỢ HOÀN TOÀN' : m.month),
        debt: debtMap[m.month] ?? null,
        st: m.month < now ? 'done' : m.month === now ? 'active' : 'future',
      }))
    }

    return (d.value.payoff_timeline?.projected_debt_by_month || []).map((p): Milestone => ({
      month: p.month,
      ev: p.total_debt === 0 ? '🏆 Thoát nợ hoàn toàn' : 'Nợ: ₫' + fS(p.total_debt),
      debt: p.total_debt,
      st: p.month < now ? 'done' : p.month === now ? 'active' : 'future',
    }))
  })

  return { milestones }
}
