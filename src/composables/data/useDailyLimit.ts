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
 * Tính toán ngày lương thực tế, số ngày còn đến lương, và hạn mức chi tiêu theo ngày.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @returns actualPayDate, dToSalary, afterSalary, dayLimit
 */
export function useDailyLimit(d: Ref<AppData>): DailyLimitResult {
  /**
   * Tính ngày lương thực tế: nếu ngày danh nghĩa rơi vào thứ Bảy thì lùi về thứ Sáu,
   * nếu rơi vào Chủ Nhật thì đẩy lên thứ Hai — phù hợp lịch ngân hàng.
   * @param year - Năm
   * @param month - Tháng (0-indexed, theo Date.getMonth())
   * @param nominalDay - Ngày danh nghĩa trong tháng
   */
  function actualPayDate(year: number, month: number, nominalDay: number): Date {
    const dt = new Date(year, month, nominalDay)
    const dow = dt.getDay()
    if (dow === 6) dt.setDate(dt.getDate() - 1)
    if (dow === 0) dt.setDate(dt.getDate() + 1)
    return dt
  }

  /** Số ngày (làm tròn lên) còn lại đến ngày lương tiếp theo. */
  const dToSalary = computed((): number => {
    const now = new Date()
    const pd = d.value.income?.pay_date || 5
    let t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    if (t <= now) t = actualPayDate(now.getFullYear(), now.getMonth() + 1, pd)
    return Math.ceil((t.getTime() - now.getTime()) / 86400000)
  })

  /** True nếu hiện tại đã qua ngày lương trong tháng này (đã nhận lương). */
  const afterSalary = computed((): boolean => {
    const now = new Date()
    const pd = d.value.income?.pay_date || 5
    const t = actualPayDate(now.getFullYear(), now.getMonth(), pd)
    return now >= t
  })

  /**
   * Hạn mức chi tiêu mỗi ngày: dùng custom_daily_limit nếu được đặt,
   * nếu không tự động chọn giữa after_salary và until_salary tùy thời điểm trong tháng.
   */
  const dayLimit = computed((): number => {
    if (d.value.custom_daily_limit > 0) return d.value.custom_daily_limit
    const dl = d.value.rules?.daily_limit
    return afterSalary.value ? dl?.after_salary || 100000 : dl?.until_salary || 70000
  })

  return { actualPayDate, dToSalary, afterSalary, dayLimit }
}
