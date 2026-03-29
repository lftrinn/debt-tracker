import { ref } from 'vue'
import type { Ref } from 'vue'
import type { AppData } from '@/types/data'
import type { useApi } from './useApi'
import type { ToastType } from './useToast'

export type AppState = 'loading' | 'setup' | 'ready' | 'error'

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
    } catch {
      api.syncSt.value = 'error'
      api.syncMsg.value = 'Lỗi'
      api.syncTime.value = ''
      appState.value = d.value.debts ? 'error' : 'setup'
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
      if (opts.mode === 'import') {
        try { data = JSON.parse(opts.json || '') as AppData } catch { throw new Error('JSON không hợp lệ') }
        if (!data.expenses) data.expenses = []
        if (data.extra_paid == null) data.extra_paid = 0
        if (data.custom_daily_limit == null) data.custom_daily_limit = 0
      } else if (opts.mode === 'new') {
        data = {
          expenses: [], incomes: [], extra_paid: 0, custom_daily_limit: opts.limit || 0,
          debts: { summary: { total: opts.debt || 0 }, credit_cards: [], small_loans: [] },
          income: { monthly_net: 22923000, pay_date: 5 },
          rules: { daily_limit: { until_salary: 70000, after_salary: 100000 }, must_not: [] },
          current_cash: { balance: 0, reserved: 0, as_of: '' },
          payoff_timeline: { projected_debt_by_month: [] },
        }
      } else {
        // existing
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
    if (!confirm('Đăng xuất? Dữ liệu vẫn còn trên JSONBin.')) return
    api.clearCredentials()
    appState.value = 'setup'
  }

  return { loading, sErr, pushData, pullData, handleSetup, reconnect, hardReload, logout }
}
