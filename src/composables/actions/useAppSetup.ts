import { ref } from 'vue'
import type { Ref } from 'vue'
import type { AppData } from '@/types/data'
import type { useApi } from '../api/useApi'
import type { ToastType } from '../ui/useToast'

export type AppState = 'loading' | 'setup' | 'ready' | 'error'

/**
 * Lifecycle: setup credentials, pull/push data, 3 setup mode (new / import / existing).
 */
export function useAppSetup(
  d: Ref<AppData>,
  appState: Ref<AppState>,
  api: ReturnType<typeof useApi>,
  toast: (msg: string, type?: ToastType) => void,
  onAfterPull: () => void,
) {
  const loading = ref(false)
  const sErr = ref('')

  async function pushData(): Promise<boolean> {
    try {
      await api.push(d.value)
      return true
    } catch {
      return false
    }
  }

  async function pullData(): Promise<void> {
    try {
      d.value = await api.pull()
      appState.value = 'ready'
      onAfterPull()
    } catch (e) {
      if ((e as Error).message === 'LEGACY_SCHEMA_RESET') {
        // JSONBin có data v1 cũ → push seed (v2) ngay → reset history
        appState.value = 'ready'
        toast('toast.schemaReset', 'ok')
        await pushData()
        onAfterPull()
        return
      }
      api.syncSt.value = 'error'
      api.syncMsg.value = 'sync.error'
      api.syncTime.value = ''
      appState.value = (d.value.items?.length ?? 0) > 0 ? 'error' : 'setup'
    }
  }

  async function handleSetup(opts: {
    mode: 'new' | 'import' | 'existing'
    key?: string
    binId?: string
    json?: string
    debt?: number
    limit?: number
  }): Promise<void> {
    loading.value = true
    sErr.value = ''
    try {
      let data: AppData
      const today = new Date().toISOString().slice(0, 10)
      if (opts.mode === 'import') {
        try {
          const parsed = JSON.parse(opts.json || '') as Partial<AppData>
          if (!parsed.meta || !Array.isArray(parsed.items)) throw new Error('JSON v2 không hợp lệ — cần { meta, items }')
          data = parsed as AppData
        } catch {
          throw new Error('JSON không hợp lệ')
        }
      } else if (opts.mode === 'new') {
        data = {
          meta: {
            owner: '',
            currency: 'VND',
            generated_at: today,
            as_of_month: today.slice(0, 7),
            strategy: 'avalanche_modified',
            strategy_note: '',
            debt_free_target: '',
            schema_note: 'v2 unified items',
            daily_limit: { until_salary: 70000, after_salary: 100000 },
            custom_daily_limit: opts.limit || 0,
            extra_paid: 0,
            projected_debt_by_month: [],
            debt_summary_total: opts.debt || 0,
          },
          items: [],
        }
      } else {
        api.saveCredentials(opts.key || '', opts.binId || '')
        await pullData()
        return
      }
      const id = await api.createBin(data, opts.key || '')
      api.saveCredentials(opts.key || '', id)
      d.value = data
      appState.value = 'ready'
    } catch (e) {
      sErr.value = (e as Error).message || 'Lỗi kết nối'
    } finally {
      loading.value = false
    }
  }

  async function reconnect({ key, binId }: { key: string; binId: string }): Promise<void> {
    if (!key || !binId) return
    loading.value = true
    sErr.value = ''
    try {
      api.saveCredentials(key, binId)
      await pullData()
    } catch (e) {
      sErr.value = (e as Error).message || 'Lỗi kết nối'
      appState.value = 'error'
    } finally {
      loading.value = false
    }
  }

  function hardReload(): void {
    const url = new URL(window.location.href)
    url.searchParams.set('v', String(Date.now()))
    window.location.replace(url.toString())
  }

  function logout(): void {
    api.clearCredentials()
    appState.value = 'setup'
  }

  return { loading, sErr, pushData, pullData, handleSetup, reconnect, hardReload, logout }
}
