import { ref } from 'vue'
import { i18n } from '../../i18n'
import type { UpcomingItem } from '@/types/data'

const VAPID_PUBLIC_KEY = 'BE1CoUCSw3FJXmx5_ixw1nAY7Wlm3H15VLGVQG4XTL_n2qeFPOl4PTGnSsB6fjv8MbmGUqqIwOzZBmZMIAz2iVU'
const DEFAULT_WORKER_URL = 'https://debt-tracker-push.tl-dellroyal.workers.dev'
const PUSH_SUB_KEY = 'dt_push_sub'
const WORKER_URL_KEY = 'dt_push_worker_url'
// Deduplication: mỗi loại notification chỉ gửi 1 lần/ngày
const DUE_DATE_KEY = 'dt_due_notif_date'
const PAYDAY_DATE_KEY = 'dt_payday_notif_date'

export type PushStatus = 'unknown' | 'granted' | 'denied' | 'unsupported'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
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
 * Build payload cho tất cả 3 locale.
 * Worker sẽ chọn đúng locale tương ứng với từng thiết bị khi gửi push.
 */
function buildAllLocalePayloads(
  titleKey: string,
  bodyKey: string,
  values: Record<string, unknown>
): Record<string, { title: string; body: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tFn = (i18n.global as any).t as (
    key: string,
    named: Record<string, unknown>,
    opts: { locale: string }
  ) => string
  const locales = ['vi', 'en', 'ja']
  return Object.fromEntries(
    locales.map((l) => [
      l,
      {
        title: tFn(titleKey, {}, { locale: l }),
        body: tFn(bodyKey, values, { locale: l }),
      },
    ])
  )
}

/**
 * Lấy tên khoản theo locale từ UpcomingItem.
 */
function getItemName(item: UpcomingItem, locale: string): string {
  return item.nameI18n?.[locale as 'vi' | 'en' | 'ja'] ?? item.name
}

/**
 * Quản lý Web Push Notification qua Cloudflare Worker.
 * - registerServiceWorker() — đăng ký SW khi app khởi động
 * - enablePushNotifications() — gọi từ user gesture (button click)
 * - sendDueNotification() — gửi notification các khoản đến hạn hôm nay (1 lần/ngày)
 * - sendPaydayNotification() — gửi notification nhắc ngày lương (1 lần/ngày)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locale = ((i18n.global as any).locale?.value ?? 'vi') as string
    try {
      const res = await fetch(`${workerUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sub.toJSON(), locale }),
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
   * - Gửi subscription (kèm locale) lên Cloudflare Worker
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
   * Gửi notification các khoản thanh toán đến hạn hôm nay.
   * Chỉ gửi khi có ít nhất 1 khoản chưa thanh toán đến hạn hôm nay.
   * Deduplication: chỉ gửi 1 lần/ngày (localStorage dt_due_notif_date).
   * Tag: 'debt-tracker-due'
   */
  async function sendDueNotification(upcomingItems: UpcomingItem[]): Promise<void> {
    if (pushStatus.value !== 'granted') return
    if (localStorage.getItem(DUE_DATE_KEY) === todayStr()) return

    const today = todayStr()
    const dueItems = upcomingItems.filter((item) => item._date === today && !item.paid)
    if (dueItems.length === 0) return

    localStorage.setItem(DUE_DATE_KEY, today)

    const workerUrl = getWorkerUrl()
    if (!workerUrl) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tFn = (i18n.global as any).t as (
      key: string,
      named: Record<string, unknown>,
      opts: { locale: string }
    ) => string

    const first = dueItems[0]
    const extra = dueItems.length - 1
    const locales = ['vi', 'en', 'ja']
    const payloads = Object.fromEntries(
      locales.map((l) => {
        const name = getItemName(first, l)
        const bodyKey = extra > 0 ? 'notification.due.multiple' : 'notification.due.single'
        const values = extra > 0 ? { name, count: extra } : { name }
        return [
          l,
          {
            title: tFn('notification.due.title', {}, { locale: l }),
            body: tFn(bodyKey, values, { locale: l }),
          },
        ]
      })
    )

    try {
      await fetch(`${workerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads, tag: 'debt-tracker-due' }),
      })
    } catch {
      // silent — không crash khi offline
    }
  }

  /**
   * Gửi notification nhắc nhận lương khi đến ngày pay_date.
   * Deduplication: chỉ gửi 1 lần/ngày (localStorage dt_payday_notif_date).
   * Tag: 'debt-tracker-payday'
   */
  async function sendPaydayNotification(payDate: number): Promise<void> {
    if (pushStatus.value !== 'granted') return
    if (localStorage.getItem(PAYDAY_DATE_KEY) === todayStr()) return

    const today = new Date()
    if (today.getDate() !== payDate) return

    localStorage.setItem(PAYDAY_DATE_KEY, todayStr())

    const workerUrl = getWorkerUrl()
    if (!workerUrl) return

    const payloads = buildAllLocalePayloads('notification.due.title', 'notification.payday.body', {})

    try {
      await fetch(`${workerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads, tag: 'debt-tracker-payday' }),
      })
    } catch {
      // silent — không crash khi offline
    }
  }

  return {
    pushStatus,
    checkPushStatus,
    registerServiceWorker,
    getWorkerUrl,
    setWorkerUrl,
    enablePushNotifications,
    sendDueNotification,
    sendPaydayNotification,
  }
}
