import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, UpcomingItem } from '@/types/data'
import { i18n } from '../../i18n'
import { useFormatters } from '../ui/useFormatters'
import { useItems } from './useItems'

/**
 * Tổng hợp danh sách các khoản thanh toán sắp đến hạn.
 * Sources:
 *   - fixed_expense items có `due_date` (kỳ cụ thể, không phải template)
 *   - one_time_expense items
 *   - debt items có `minimum_payment` + `due_date` (phát sinh "<name> minimum")
 * Cap 30 ngày trễ, cắt 10 items, sort ngày tăng dần.
 */
export function useUpcoming(d: Ref<AppData>): {
  upcomingLabel: ComputedRef<string>
  upcoming: ComputedRef<UpcomingItem[]>
} {
  const { dDiff } = useFormatters()
  const { fixedExpenses, oneTimeExpenses, debts, paidKeys } = useItems(d)

  const upcomingLabel = computed((): string => {
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    const locale = (i18n.global.locale as { value: string }).value
    if (locale === 'ja') return m + '月/' + y
    if (locale === 'en') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return months[now.getMonth()] + '/' + y
    }
    return 'T' + m + '/' + y
  })

  const upcoming = computed((): UpcomingItem[] => {
    const paid = paidKeys.value
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const items: UpcomingItem[] = []

    /** Helper · build UpcomingItem từ thông tin chung. */
    function makeItem(opts: {
      itemId: string
      itemName: string
      dateStr: string
      amount: number
      source: UpcomingItem['source']
      category?: string | null
      isLastPeriod?: boolean
      nameI18n?: UpcomingItem['nameI18n']
      nameI18nMeta?: UpcomingItem['nameI18nMeta']
    }): UpcomingItem | null {
      const diff = dDiff(opts.dateStr)
      const key = opts.dateStr + ':' + opts.itemName
      const isPaid = paid.has(key)
      if (isPaid && opts.dateStr < todayStr) return null
      if (!isPaid && diff < -30) return null
      const d2 = new Date(opts.dateStr)
      const overdueDays = opts.dateStr < todayStr ? Math.abs(diff) : 0
      return {
        _key: key,
        day: String(d2.getDate()).padStart(2, '0'),
        mo: String(d2.getMonth() + 1).padStart(2, '0'),
        name: opts.itemName,
        nameI18n: opts.nameI18n,
        nameI18nMeta: opts.nameI18nMeta,
        sub: overdueDays > 0
          ? i18n.global.t('upcoming.overdueDays', { n: overdueDays })
          : opts.category === 'debt_minimum' ? i18n.global.t('upcoming.minPayLabel') : null,
        amt: opts.amount,
        paid: isPaid,
        urg: isPaid ? 'ok' : overdueDays > 0 ? 'overdue' : diff <= 5 ? 'urgent' : diff <= 10 ? 'soon' : 'ok',
        _date: opts.dateStr,
        source: opts.source,
        _id: opts.itemId,
        _category: opts.category ?? null,
        _isLastPeriod: opts.isLastPeriod ?? false,
        overdueDays,
      }
    }

    // Fixed expense: chỉ kỳ cụ thể (có due_date), không phải template recurring
    for (const fe of fixedExpenses.value) {
      if (!fe.due_date) continue
      const ui = makeItem({
        itemId: fe.id,
        itemName: fe.name,
        dateStr: fe.due_date,
        amount: fe.amount,
        source: 'fixed_expense',
        category: fe.cat,
        nameI18n: fe.nameI18n,
        nameI18nMeta: fe.nameI18nMeta,
      })
      if (ui) items.push(ui)
    }

    // One-time expense
    for (const ote of oneTimeExpenses.value) {
      const ui = makeItem({
        itemId: ote.id,
        itemName: ote.name,
        dateStr: ote.due_date,
        amount: ote.amount,
        source: 'one_time_expense',
        category: ote.cat,
        nameI18n: ote.nameI18n,
        nameI18nMeta: ote.nameI18nMeta,
      })
      if (ui) items.push(ui)
    }

    // Debt minimum payments (phát sinh từ debt items)
    for (const dt of debts.value) {
      if (!dt.due_date || !dt.minimum_payment) continue
      const obName = dt.name + ' minimum'
      const ui = makeItem({
        itemId: dt.id,
        itemName: obName,
        dateStr: dt.due_date,
        amount: dt.minimum_payment,
        source: 'debt_minimum',
        category: 'debt_minimum',
        nameI18n: dt.nameI18n,
        nameI18nMeta: dt.nameI18nMeta,
      })
      if (ui) items.push(ui)
    }

    return items.sort((a, b) => a._date.localeCompare(b._date)).slice(0, 10)
  })

  return { upcomingLabel, upcoming }
}
