import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, UpcomingItem } from '@/types/data'
import { i18n } from '../../i18n'
import { useFormatters } from '../ui/useFormatters'

/**
 * Tổng hợp danh sách các khoản thanh toán sắp đến hạn từ one_time_expenses.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @returns upcomingLabel (nhãn tháng hiện tại), upcoming (danh sách tối đa 10 khoản sắp đến)
 */
export function useUpcoming(d: Ref<AppData>): {
  upcomingLabel: ComputedRef<string>
  upcoming: ComputedRef<UpcomingItem[]>
} {
  const { dDiff } = useFormatters()

  /** Nhãn hiển thị tháng/năm hiện tại theo locale. */
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

  /**
   * Danh sách khoản thanh toán sắp đến từ one_time_expenses,
   * bao gồm cả đã quá hạn trong vòng 30 ngày.
   */
  const upcoming = computed((): UpcomingItem[] => {
    const paid = new Set(d.value.paid_obligations || [])
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const items: UpcomingItem[] = []

    ;(d.value.one_time_expenses || []).forEach((ev) => {
      const diff = dDiff(ev.date)
      const key = ev.date + ':' + ev.name
      const isPaid = paid.has(key)
      if (isPaid && ev.date < todayStr) return
      if (!isPaid && diff < -30) return
      const d2 = new Date(ev.date)
      const overdueDays = ev.date < todayStr ? Math.abs(diff) : 0
      items.push({
        _key: key,
        day: String(d2.getDate()).padStart(2, '0'),
        mo: String(d2.getMonth() + 1).padStart(2, '0'),
        name: ev.name,
        sub: overdueDays > 0 ? i18n.global.t('upcoming.overdueDays', { n: overdueDays }) : null,
        amt: ev.amount,
        paid: isPaid,
        urg: isPaid ? 'ok' : overdueDays > 0 ? 'overdue' : diff <= 5 ? 'urgent' : diff <= 10 ? 'soon' : 'ok',
        _date: ev.date,
        source: 'one_time',
        _id: ev.id,
        overdueDays,
      })
    })

    return items.sort((a, b) => a._date.localeCompare(b._date)).slice(0, 10)
  })

  return { upcomingLabel, upcoming }
}
