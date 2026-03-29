import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { AppData } from '@/types/data'

export interface DailyLimitResult {
  actualPayDate: (year: number, month: number, nominalDay: number) => Date
  dToSalary: ComputedRef<number>
  afterSalary: ComputedRef<boolean>
  dayLimit: ComputedRef<number>
}

/**
 * Pay date, salary timing, and daily spending limit computations.
 */
export function useDailyLimit(d: Ref<AppData>): DailyLimitResult {
  /** Adjust pay date for weekends: Sat → Fri (−1), Sun → Mon (+1) */
  function actualPayDate(year: number, month: number, nominalDay: number): Date {
    const dt = new Date(year, month, nominalDay)
    const dow = dt.getDay()
    if (dow === 6) dt.setDate(dt.getDate() - 1)
    if (dow === 0) dt.setDate(dt.getDate() + 1)
    return dt
  }

  const dToSalary = computed((): number => {
    const now = new Date()
    const pd = d.value.income?.pay_date || 5
    let t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    if (t <= now) t = actualPayDate(now.getFullYear(), now.getMonth() + 1, pd)
    return Math.ceil((t.getTime() - now.getTime()) / 86400000)
  })

  const afterSalary = computed((): boolean => {
    const now = new Date()
    const pd = d.value.income?.pay_date || 5
    const t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    return now >= t
  })

  const dayLimit = computed((): number => {
    if (d.value.custom_daily_limit > 0) return d.value.custom_daily_limit
    const dl = d.value.rules?.daily_limit
    return afterSalary.value ? dl?.after_salary || 100000 : dl?.until_salary || 70000
  })

  return { actualPayDate, dToSalary, afterSalary, dayLimit }
}
