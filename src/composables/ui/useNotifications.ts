import { i18n } from '../../i18n'
import { useCurrency } from '../api/useCurrency'

const NOTIF_DATE_KEY = 'dt_notif_date'
const NOTIF_LEVELS_KEY = 'dt_notif_levels'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getNotifiedLevels(): Set<number> {
  const date = localStorage.getItem(NOTIF_DATE_KEY)
  if (date !== todayDate()) return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIF_LEVELS_KEY) || '[]') as number[])
  } catch {
    return new Set()
  }
}

function markNotified(level: number): void {
  const today = todayDate()
  const storedDate = localStorage.getItem(NOTIF_DATE_KEY)
  const levels: Set<number> = storedDate === today ? getNotifiedLevels() : new Set()
  levels.add(level)
  localStorage.setItem(NOTIF_DATE_KEY, today)
  localStorage.setItem(NOTIF_LEVELS_KEY, JSON.stringify([...levels]))
}

/**
 * Quản lý Web Notification API để cảnh báo hạn mức chi tiêu ngày.
 * - Chỉ hiển thị notification khi tab KHÔNG visible (document.visibilityState === 'hidden')
 * - Mỗi mức (80%, 100%) chỉ notify 1 lần trong ngày (persist qua localStorage)
 * - requestPermission() nên được gọi khi khởi động app
 */
export function useNotifications() {
  /**
   * Yêu cầu quyền hiển thị notification nếu chưa được cấp.
   * Gọi trong onMounted của App.vue.
   */
  async function requestPermission(): Promise<void> {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  /**
   * Kiểm tra chi tiêu hôm nay so với hạn mức, hiển thị notification nếu vượt ngưỡng.
   * Chỉ hiển thị khi tab KHÔNG đang được xem (visibilityState === 'hidden').
   * @param todaySpent - Tổng chi tiêu hôm nay (VND)
   * @param dayLimit - Hạn mức chi tiêu mỗi ngày (VND)
   */
  function checkDailyLimit(todaySpent: number, dayLimit: number): void {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (document.visibilityState !== 'hidden') return
    if (dayLimit <= 0) return

    const pct = todaySpent / dayLimit
    const notified = getNotifiedLevels()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (i18n.global as any).t as (key: string, values?: Record<string, unknown>) => string
    const { fCurr } = useCurrency()
    const spent = fCurr(todaySpent)
    const limit = fCurr(dayLimit)

    if (pct >= 1 && !notified.has(100)) {
      // Đánh dấu cả hai mức để tránh hiển thị cảnh báo 80% dư thừa sau khi đã vượt 100%
      markNotified(100)
      markNotified(80)
      new Notification(t('notification.title'), {
        body: t('notification.over', { spent, limit }),
        icon: '/favicon.ico',
      })
    } else if (pct >= 0.8 && !notified.has(80)) {
      markNotified(80)
      new Notification(t('notification.title'), {
        body: t('notification.warn', { spent, limit, pct: Math.round(pct * 100) }),
        icon: '/favicon.ico',
      })
    }
  }

  return { requestPermission, checkDailyLimit }
}
