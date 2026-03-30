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
// Throttle + daily-once cho sendDailyStatus
const STATUS_THROTTLE_KEY = 'dt_status_last_sent'
const STATUS_DATE_KEY = 'dt_status_sent_date'
// Throttle 30s cho cash/debt update notifications
const CASH_UPDATE_THROTTLE_KEY = 'dt_cash_update_sent'
const DEBT_UPDATE_THROTTLE_KEY = 'dt_debt_update_sent'
// Toggle bật/tắt status notification (mặc định TẮT)
const PUSH_STATUS_ENABLED_KEY = 'dt_push_status_enabled'

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

// Singleton reactive refs để share state giữa các lần gọi composable
const pushStatus = ref<PushStatus>('unknown')
const pushStatusEnabled = ref<boolean>(
  localStorage.getItem(PUSH_STATUS_ENABLED_KEY) === 'true'
)

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
 * Quản lý Web Push Notification qua Cloudflare Worker.
 * - registerServiceWorker() — đăng ký SW khi app khởi động
 * - enablePushNotifications() — gọi từ user gesture (button click)
 * - notifyOverLimit() — gửi push qua Worker khi chi tiêu vượt hạn mức
 * - sendDailyStatus() — gửi trạng thái với throttle 5 phút
 * - sendDailyStatusOnAppReady() — gửi trạng thái 1 lần/ngày khi app sẵn sàng
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
   * Re-gửi subscription lên Worker với locale mới khi user đổi ngôn ngữ.
   * Worker sẽ upsert record, cập nhật locale cho thiết bị này.
   */
  async function updateLocale(): Promise<void> {
    if (!('serviceWorker' in navigator)) return
    if (pushStatus.value !== 'granted') return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await sendSubscriptionToServer(sub)
    } catch {
      // silent
    }
  }

  /** Bật/tắt status notification (persistent daily-limit badge). */
  function togglePushStatus(): void {
    pushStatusEnabled.value = !pushStatusEnabled.value
    localStorage.setItem(PUSH_STATUS_ENABLED_KEY, String(pushStatusEnabled.value))
  }

  /**
   * Gửi push notification qua Worker khi chi tiêu vượt hạn mức.
   * Dùng chung localStorage deduplication key với useNotifications.
   * Mỗi level (80%, 100%) chỉ gửi 1 lần/ngày.
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

    const { fCurr } = useCurrency()
    const spent = fCurr(todaySpent)
    const limit = fCurr(dayLimit)
    const pctRounded = Math.round(pct * 100)

    const payloads =
      level >= 100
        ? buildAllLocalePayloads('notification.title', 'notification.over', { spent, limit })
        : buildAllLocalePayloads('notification.title', 'notification.warn', {
            spent,
            limit,
            pct: pctRounded,
          })

    try {
      await fetch(`${workerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads }),
      })
    } catch {
      // silent — push sẽ đến khi kết nối khôi phục
    }
  }

  /**
   * Gửi push "trạng thái hạn mức" với tag cố định để thay thế notification cũ trên iOS.
   * Có throttle 5 phút và check setting bật/tắt.
   * Gọi sau mỗi lần todaySpent thay đổi.
   */
  async function sendDailyStatus(todaySpent: number, dayLimit: number): Promise<void> {
    if (dayLimit <= 0) return
    if (pushStatus.value !== 'granted') return
    if (!pushStatusEnabled.value) return

    // Throttle: không gửi quá 1 lần mỗi 5 phút
    const lastSent = parseInt(localStorage.getItem(STATUS_THROTTLE_KEY) || '0', 10)
    if (Date.now() - lastSent < 5 * 60 * 1000) return
    localStorage.setItem(STATUS_THROTTLE_KEY, String(Date.now()))

    const workerUrl = getWorkerUrl()
    if (!workerUrl) return

    const { fCurr } = useCurrency()
    const spent = fCurr(todaySpent)
    const limit = fCurr(dayLimit)
    const pct = Math.round((todaySpent / dayLimit) * 100)

    const payloads = buildAllLocalePayloads(
      'notification.status.title',
      'notification.status.body',
      { spent, limit, pct }
    )

    try {
      await fetch(`${workerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads, tag: 'daily-limit-status' }),
      })
    } catch {
      // silent — không crash khi offline
    }
  }

  /**
   * Gửi push khi tiền mặt khả dụng thay đổi.
   * Tag 'cash-update' để replace notification cũ. Throttle 30 giây.
   */
  async function sendCashUpdate(availCash: number, todaySpent: number): Promise<void> {
    if (pushStatus.value !== 'granted') return
    if (!pushStatusEnabled.value) return

    const lastSent = parseInt(localStorage.getItem(CASH_UPDATE_THROTTLE_KEY) || '0', 10)
    if (Date.now() - lastSent < 30 * 1000) return
    localStorage.setItem(CASH_UPDATE_THROTTLE_KEY, String(Date.now()))

    const workerUrl = getWorkerUrl()
    if (!workerUrl) return

    const { fCurr } = useCurrency()
    const payloads = buildAllLocalePayloads(
      'notification.cashUpdate.title',
      'notification.cashUpdate.body',
      { cash: fCurr(availCash), spent: fCurr(todaySpent) }
    )

    try {
      await fetch(`${workerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads, tag: 'cash-update' }),
      })
    } catch {
      // silent
    }
  }

  /**
   * Gửi push khi tổng nợ thay đổi.
   * Tag 'debt-update' để replace notification cũ. Throttle 30 giây.
   */
  async function sendDebtUpdate(totalDebt: number): Promise<void> {
    if (pushStatus.value !== 'granted') return
    if (!pushStatusEnabled.value) return

    const lastSent = parseInt(localStorage.getItem(DEBT_UPDATE_THROTTLE_KEY) || '0', 10)
    if (Date.now() - lastSent < 30 * 1000) return
    localStorage.setItem(DEBT_UPDATE_THROTTLE_KEY, String(Date.now()))

    const workerUrl = getWorkerUrl()
    if (!workerUrl) return

    const { fCurrFull } = useCurrency()
    const payloads = buildAllLocalePayloads(
      'notification.debtUpdate.title',
      'notification.debtUpdate.body',
      { debt: fCurrFull(totalDebt) }
    )

    try {
      await fetch(`${workerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads, tag: 'debt-update' }),
      })
    } catch {
      // silent
    }
  }

  /**
   * Gửi trạng thái khi app sẵn sàng — chỉ 1 lần/ngày.
   * Dùng localStorage key dt_status_sent_date để track ngày đã gửi.
   */
  async function sendDailyStatusOnAppReady(todaySpent: number, dayLimit: number): Promise<void> {
    if (localStorage.getItem(STATUS_DATE_KEY) === todayStr()) return
    localStorage.setItem(STATUS_DATE_KEY, todayStr())
    // Reset throttle để gửi được ngay trong ngày mới
    localStorage.removeItem(STATUS_THROTTLE_KEY)
    await sendDailyStatus(todaySpent, dayLimit)
  }

  return {
    pushStatus,
    pushStatusEnabled,
    checkPushStatus,
    registerServiceWorker,
    getWorkerUrl,
    setWorkerUrl,
    enablePushNotifications,
    updateLocale,
    togglePushStatus,
    notifyOverLimit,
    sendDailyStatus,
    sendDailyStatusOnAppReady,
    sendCashUpdate,
    sendDebtUpdate,
  }
}
