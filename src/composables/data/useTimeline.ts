import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, Milestone } from '@/types/data'
import { i18n } from '../../i18n'
import { useCurrency } from '../api/useCurrency'
import { getLocalized } from './useI18nData'
import { useItems } from './useItems'

/**
 * Xây milestones từ milestone items + meta.projected_debt_by_month.
 */
export function useTimeline(d: Ref<AppData>): { milestones: ComputedRef<Milestone[]> } {
  const { fCurr } = useCurrency()
  const { milestones: milestoneItems } = useItems(d)

  const milestones = computed((): Milestone[] => {
    const locale = (i18n.global.locale as { value: string }).value
    const now = new Date().toISOString().slice(0, 7)
    const projected = d.value.meta?.projected_debt_by_month ?? []
    const debtMap: Record<string, number> = {}
    for (const p of projected) debtMap[p.month] = p.total_debt

    if (milestoneItems.value.length) {
      return milestoneItems.value.map((m): Milestone => {
        const month = m.due_date ? m.due_date.slice(0, 7) : ''
        return {
          month,
          ev: getLocalized({ name: m.name, nameI18n: m.nameI18n }, 'name', locale) || i18n.global.t('timeline.fullyDebtFree'),
          debt: debtMap[month] ?? null,
          st: month < now ? 'done' : month === now ? 'active' : 'future',
        }
      })
    }

    return projected.map((p): Milestone => ({
      month: p.month,
      ev: p.total_debt === 0 ? i18n.global.t('timeline.fullyDebtFree') : i18n.global.t('timeline.debtLabel') + ' ' + fCurr(p.total_debt),
      debt: p.total_debt,
      st: p.month < now ? 'done' : p.month === now ? 'active' : 'future',
    }))
  })

  return { milestones }
}
