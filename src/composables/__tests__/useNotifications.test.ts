import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock('@/i18n', () => ({
  i18n: {
    global: {
      t: (key: string, values?: Record<string, unknown>) => {
        if (!values) return key
        return Object.entries(values).reduce(
          (s, [k, v]) => s.replace(`{${k}}`, String(v)),
          key,
        )
      },
    },
  },
}))

vi.mock('@/composables/api/useCurrency', () => ({
  useCurrency: () => ({
    fCurr: (v: number) => `${v}đ`,
  }),
}))

// ─── Helper: reset localStorage giữa các test ─────────────────────────────

beforeEach(() => {
  localStorage.clear()
})

// ─── Helper: đặt visibilityState ──────────────────────────────────────────

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

// ─── Helper: mock Notification constructor ────────────────────────────────

function mockNotification(permission: NotificationPermission = 'granted') {
  const instances: Array<{ title: string; options?: NotificationOptions }> = []
  class FakeNotification {
    constructor(title: string, options?: NotificationOptions) {
      instances.push({ title, options })
    }
    static permission = permission
  }
  vi.stubGlobal('Notification', FakeNotification)
  return instances
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useNotifications', () => {
  describe('requestPermission', () => {
    it('gọi Notification.requestPermission khi permission là default', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('granted')
      class FakeNotification {
        static permission: NotificationPermission = 'default'
        static requestPermission = requestPermissionMock
      }
      vi.stubGlobal('Notification', FakeNotification)

      const { useNotifications } = await import('../ui/useNotifications')
      const { requestPermission } = useNotifications()
      await requestPermission()

      expect(requestPermissionMock).toHaveBeenCalledOnce()
    })

    it('không gọi requestPermission khi đã granted', async () => {
      const requestPermissionMock = vi.fn()
      class FakeNotification {
        static permission: NotificationPermission = 'granted'
        static requestPermission = requestPermissionMock
      }
      vi.stubGlobal('Notification', FakeNotification)

      const { useNotifications } = await import('../ui/useNotifications')
      const { requestPermission } = useNotifications()
      await requestPermission()

      expect(requestPermissionMock).not.toHaveBeenCalled()
    })
  })

  describe('checkDailyLimit', () => {
    it('không hiển thị notification khi tab đang visible', async () => {
      setVisibility('visible')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(90_000, 100_000) // 90% — sẽ trigger nếu tab hidden

      expect(shown).toHaveLength(0)
    })

    it('không hiển thị notification khi permission chưa granted', async () => {
      setVisibility('hidden')
      const shown = mockNotification('denied')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(90_000, 100_000)

      expect(shown).toHaveLength(0)
    })

    it('không hiển thị notification khi dayLimit = 0', async () => {
      setVisibility('hidden')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(50_000, 0)

      expect(shown).toHaveLength(0)
    })

    it('hiển thị warn notification khi đạt 80% và tab hidden', async () => {
      setVisibility('hidden')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(80_000, 100_000) // đúng 80%

      expect(shown).toHaveLength(1)
      expect(shown[0].title).toBe('notification.title')
      expect(shown[0].options?.body).toContain('notification.warn')
    })

    it('hiển thị over notification khi vượt 100% và tab hidden', async () => {
      setVisibility('hidden')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(110_000, 100_000) // 110%

      expect(shown).toHaveLength(1)
      expect(shown[0].options?.body).toContain('notification.over')
    })

    it('mỗi mức chỉ notify 1 lần trong ngày — warn không lặp lại', async () => {
      setVisibility('hidden')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(85_000, 100_000) // lần 1: warn
      checkDailyLimit(88_000, 100_000) // lần 2: không notify lại

      expect(shown).toHaveLength(1)
    })

    it('mỗi mức chỉ notify 1 lần trong ngày — over không lặp lại', async () => {
      setVisibility('hidden')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(100_000, 100_000) // lần 1: over
      checkDailyLimit(120_000, 100_000) // lần 2: không notify lại

      expect(shown).toHaveLength(1)
    })

    it('khi vượt 100% trực tiếp → chỉ hiển thị over, không hiển thị warn sau đó', async () => {
      setVisibility('hidden')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(110_000, 100_000) // vượt 100%, cũng mark 80 đã notify
      checkDailyLimit(115_000, 100_000) // vẫn còn 100% — không notify thêm

      expect(shown).toHaveLength(1)
      expect(shown[0].options?.body).toContain('notification.over')
    })

    it('không hiển thị notification khi chi tiêu dưới 80%', async () => {
      setVisibility('hidden')
      const shown = mockNotification('granted')

      const { useNotifications } = await import('../ui/useNotifications')
      const { checkDailyLimit } = useNotifications()
      checkDailyLimit(70_000, 100_000) // 70%

      expect(shown).toHaveLength(0)
    })
  })
})
