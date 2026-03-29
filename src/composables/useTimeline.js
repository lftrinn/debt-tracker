import { computed } from 'vue'
import { useFormatters } from './useFormatters'

/**
 * Payoff timeline milestones.
 * @param {import('vue').Ref} d - main data ref
 */
export function useTimeline(d) {
  const { fS } = useFormatters()

  const milestones = computed(() => {
    const now = new Date().toISOString().slice(0, 7)
    const raw = d.value.payoff_timeline?.milestones || []
    const debtMap = {}
    ;(d.value.payoff_timeline?.projected_debt_by_month || []).forEach((p) => {
      debtMap[p.month] = p.total_debt
    })

    if (raw.length) {
      return raw.map((m) => ({
        month: m.month,
        ev: m.event || (m.month === '2026-11' ? '🏆 THOÁT NỢ HOÀN TOÀN' : m.month),
        debt: debtMap[m.month] ?? null,
        st: m.month < now ? 'done' : m.month === now ? 'active' : 'future',
      }))
    }

    return (d.value.payoff_timeline?.projected_debt_by_month || []).map((p) => ({
      month: p.month,
      ev: p.total_debt === 0 ? '🏆 Thoát nợ hoàn toàn' : 'Nợ: ₫' + fS(p.total_debt),
      debt: p.total_debt,
      st: p.month < now ? 'done' : p.month === now ? 'active' : 'future',
    }))
  })

  return { milestones }
}
