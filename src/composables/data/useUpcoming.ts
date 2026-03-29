import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData, UpcomingItem } from '@/types/data'
import { useFormatters } from '../ui/useFormatters'

export function useUpcoming(d: Ref<AppData>): {
  upcomingLabel: ComputedRef<string>
  upcoming: ComputedRef<UpcomingItem[]>
} {
  const { dDiff } = useFormatters()

  const upcomingLabel = computed((): string => {
    const now = new Date()
    return 'T' + String(now.getMonth() + 1) + '/' + now.getFullYear()
  })

  const upcoming = computed((): UpcomingItem[] => {
    const plans = d.value.monthly_plans || {}
    const paid = new Set(d.value.paid_obligations || [])
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const months = [0, 1, 2].map((i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return dt.toISOString().slice(0, 7)
    })
    const items: UpcomingItem[] = []

    months.forEach((mo) => {
      const plan = plans[mo]
      if (!plan?.obligations) return
      plan.obligations.forEach((ob) => {
        if (ob.monthly) return
        const dateStr = ob.date || ob['date ']
        if (!dateStr) return
        const diff = dDiff(dateStr)
        const key = dateStr + ':' + ob.name
        const isPaid = paid.has(key)
        if (isPaid && dateStr < todayStr) return
        if (!isPaid && diff < -30) return
        const d2 = new Date(dateStr)
        const overdueDays = dateStr < todayStr ? Math.abs(diff) : 0
        items.push({
          _key: key,
          day: String(d2.getDate()).padStart(2, '0'),
          mo: String(d2.getMonth() + 1).padStart(2, '0'),
          name: ob.name,
          sub: overdueDays > 0
            ? `Chậm ${overdueDays} ngày`
            : ob.category === 'debt_minimum' ? 'Thanh toán tối thiểu' : null,
          amt: ob.amount,
          paid: isPaid,
          urg: isPaid ? 'ok' : overdueDays > 0 ? 'overdue' : diff <= 5 ? 'urgent' : diff <= 10 ? 'soon' : 'ok',
          _date: dateStr,
          source: 'monthly_plan',
          _category: ob.category || null,
          _isLastPeriod: ob.category === 'installment' && (ob.name || '').includes('kỳ cuối'),
          _mo: mo,
          overdueDays,
        })
      })
    })

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
        sub: overdueDays > 0 ? `Chậm ${overdueDays} ngày` : null,
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
