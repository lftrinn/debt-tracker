import { ref } from 'vue'
import { i18n } from '../../i18n'
import { useCurrency } from '../api/useCurrency'

const VAPID_PUBLIC_KEY = 'BE1CoUCSw3FJXmx5_ixw1nAY7Wlm3H15VLGVQG4XTL_n2qeFPOl4PTGnSsB6fjv8MbmGUqqIwOzZBmZMIAz2iVU'
const DEFAULT_WORKER_URL = 'https://debt-tracker-push.tl-dellroyal.workers.dev'
const PUSH_SUB_KEY = 'dt_push_sub'
const WORKER_URL_KEY = 'dt_push_worker_url'
// Chia sẻ localStorage keys với useNotifications để tránh notify trùng
const NOTIF_DATE_KEY = 'dt_notif_date'
const NOTIF_LEVELS_KEY = 'dt_notif_levels'

export type PushStatus = 'unknown' | 'granted' | 'denied' | 'unsupported'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getNotifiedLevels(): Set<number> {
  const date = localStorage.getItem(NOTIF_DATE_KEY)
  if (date !== todayStr()) return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIF_LEVELS_KEY) || '[]') as number[])
  } catch {
    return new Set()
  }
}

function markNotified(level: number): void {
  const today = todayStr()
  const stored = localStorage.getItem(NOTIF_DATE_KEY)
  const levels = stored === today ? getNotifiedLevels() : new Set<number>()
  levels.add(level)
  localStorage.setItem(NOTIF_DATE_KEY, today)
  localStorage.setItem(NOTIF_LEVELS_KEY, JSON.stringify([...levels]))
}

function urlBase64ToUint8Array(b64url: string): Uint8Array {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// Singleton reactive ref để share state giữa các lần gọi composable
const pushStatus = ref<PushStatus>('unknown')

/**
 * Quản lý Web Push Notification qua Cloudflare Worker.
 * - registerServiceWorker() — đăng ký SW khi app khởi động
 * - enablePushNotifications() — gọi từ user gesture (button click)
 * - notifyOverLimit() — gửi push qua Worker khi chi tiêu vượt hạn mức và page ẩn
 */
export function usePushNotifications() {
  function checkPushStatus(): void {
    if (
      !('Notification' in window) ||
      !('PushManager' in window) ||
      !('serviceWorker' in navigator)
    ) {
      pushStatus.value = 'unsupported'
      return
    }
    if (Notification.permission === 'granted') {
      pushStatus.value = 'granted'
    } else if (Notification.permission === 'denied') {
      pushStatus.value = 'denied'
    } else {
      pushStatus.value = 'unknown'
    }
  }

  async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    try {
      const swUrl = import.meta.env.BASE_URL + 'sw.js'
      const reg = await navigator.serviceWorker.register(swUrl, {
        scope: import.meta.env.BASE_URL,
      })
      return reg
    } catch (err) {
      console.error('[Push] SW registration failed:', err)
      return null
    }
  }

  function getWorkerUrl(): string {
    return localStorage.getItem(WORKER_URL_KEY) || DEFAULT_WORKER_URL
  }

  function setWorkerUrl(url: string): void {
    const trimmed = url.trim().replace(/\/$/, '')
    if (trimmed) {
      localStorage.setItem(WORKER_URL_KEY, trimmed)
    } else {
      localStorage.removeItem(WORKER_URL_KEY)
    }
  }

  async function subscribePush(): Promise<PushSubscription | null> {
    if (!('PushManager' in window)) return null
    try {
      const reg = await navigator.serviceWorker.ready
      // Reuse existing subscription nếu đã có
      const existing = await reg.pushManager.getSubscription()
      if (existing) return existing
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })
    } catch (err) {
      console.error('[Push] Subscribe failed:', err)
      return null
    }
  }

  async function sendSubscriptionToServer(sub: PushSubscription): Promise<boolean> {
    const workerUrl = getWorkerUrl()
    if (!workerUrl) return false
    try {
      const res = await fetch(`${workerUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      return res.ok
    } catch {
      return false
    }
  }

  /**
   * Kích hoạt push notification. PHẢI gọi từ user gesture (button click).
   * - Xin quyền Notification
   * - Subscribe PushManager với VAPID key
   * - Gửi subscription lên Cloudflare Worker
   */
  async function enablePushNotifications(): Promise<'granted' | 'denied' | 'error'> {
    if (!('Notification' in window) || !('PushManager' in window)) {
      pushStatus.value = 'unsupported'
      return 'error'
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      pushStatus.value = 'denied'
      return 'denied'
    }

    // Đảm bảo SW đã được đăng ký
    const reg = await registerServiceWorker()
    if (!reg) return 'error'

    const sub = await subscribePush()
    if (!sub) return 'error'

    localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(sub.toJSON()))
    await sendSubscriptionToServer(sub)
    pushStatus.value = 'granted'
    return 'granted'
  }

  /**
   * Gửi push notification qua Worker khi chi tiêu vượt hạn mức.
   * Chỉ gọi khi document.visibilityState === 'hidden'.
   * Dùng chung localStorage deduplication key với useNotifications.
   */
  async function notifyOverLimit(todaySpent: number, dayLimit: number): Promise<void> {
    if (dayLimit <= 0) return

    const pct = todaySpent / dayLimit
    const notified = getNotifiedLevels()

    let level: number | null = null
    if (pct >= 1 && !notified.has(100)) {
      level = 100
      markNotified(100)
      markNotified(80)
    } else if (pct >= 0.8 && !notified.has(80)) {
      level = 80
      markNotified(80)
    }
    if (level === null) return

    const workerUrl = getWorkerUrl()
    if (!workerUrl) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (i18n.global as any).t as (key: string, values?: Record<string, unknown>) => string
    const { fCurr } = useCurrency()
    const spent = fCurr(todaySpent)
    const limit = fCurr(dayLimit)

    const title = t('notification.title')
    const body =
      level >= 100
        ? t('notification.over', { spent, limit })
        : t('notification.warn', { spent, limit, pct: Math.round(pct * 100) })

    try {
      await fetch(`${workerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
    } catch {
      // silent — push sẽ đến khi kết nối khôi phục
    }
  }

  return {
    pushStatus,
    checkPushStatus,
    registerServiceWorker,
    getWorkerUrl,
    setWorkerUrl,
    enablePushNotifications,
    notifyOverLimit,
  }
}
