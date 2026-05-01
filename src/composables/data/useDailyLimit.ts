import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData } from '@/types/data'
import { useItems } from './useItems'

export interface DailyLimitResult {
  actualPayDate: (year: number, month: number, nominalDay: number) => Date
  dToSalary: ComputedRef<number>
  afterSalary: ComputedRef<boolean>
  dayLimit: ComputedRef<number>
}

/**
 * Tính ngày lương thực tế, số ngày còn đến lương, và hạn mức chi tiêu theo ngày.
 * - Pay date đến từ income recurring item (`due_day_of_month`)
 * - Daily limit từ `meta.daily_limit` + `meta.custom_daily_limit`
 */
export function useDailyLimit(d: Ref<AppData>): DailyLimitResult {
  const { primaryIncome } = useItems(d)

  /** Ngày lương rơi T7 → lùi T6 / CN → đẩy T2. */
  function actualPayDate(year: number, month: number, nominalDay: number): Date {
    const dt = new Date(year, month, nominalDay)
    const dow = dt.getDay()
    if (dow === 6) dt.setDate(dt.getDate() - 1)
    if (dow === 0) dt.setDate(dt.getDate() + 1)
    return dt
  }

  const dToSalary = computed((): number => {
    const now = new Date()
    const pd = primaryIncome.value?.due_day_of_month ?? 5
    let t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    if (t <= now) t = actualPayDate(now.getFullYear(), now.getMonth() + 1, pd)
    return Math.ceil((t.getTime() - now.getTime()) / 86400000)
  })

  const afterSalary = computed((): boolean => {
    const now = new Date()
    const pd = primaryIncome.value?.due_day_of_month ?? 5
    const t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    return now >= t
  })

  const dayLimit = computed((): number => {
    const meta = d.value.meta
    if (!meta) return 0
    if (meta.custom_daily_limit > 0) return meta.custom_daily_limit
    const dl = meta.daily_limit
    return afterSalary.value ? dl?.after_salary || 100000 : dl?.until_salary || 70000
  })

  return { actualPayDate, dToSalary, afterSalary, dayLimit }
}
