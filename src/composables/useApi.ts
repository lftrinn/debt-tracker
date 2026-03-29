import { ref } from 'vue'
import type { AppData, SyncStatus } from '@/types/data'

const BASE = 'https://api.jsonbin.io/v3'

/**
 * JSONBin API composable
 * Manages connection, read/write, and sync state
 */
export function useApi() {
  const apiKey = ref(localStorage.getItem('dt_k') || '')
  const binId = ref(localStorage.getItem('dt_b') || '')
  const isConfigured = ref(!!(apiKey.value && binId.value))

  const syncSt = ref<SyncStatus>('synced')
  const syncMsg = ref('Đã đồng bộ')
  const syncTime = ref('')
  const syncing = ref(false)

  const fmtTime = (): string =>
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  const H = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    'X-Master-Key': apiKey.value,
  })

  async function readBin(): Promise<AppData> {
    const r = await fetch(`${BASE}/b/${binId.value}/latest`, { headers: H() })
    if (!r.ok) throw new Error('Lỗi đọc dữ liệu')
    return (await r.json()).record as AppData
  }

  async function writeBin(data: AppData): Promise<void> {
    const r = await fetch(`${BASE}/b/${binId.value}`, {
      method: 'PUT',
      headers: H(),
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error('Lỗi ghi dữ liệu')
  }

  async function createBin(data: AppData, key: string): Promise<string> {
    const r = await fetch(`${BASE}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': key,
        'X-Bin-Name': 'debt-tracker-quang',
        'X-Bin-Private': 'true',
      },
      body: JSON.stringify(data),
    })
    if (!r.ok) {
      const e = await r.json()
      throw new Error(e.message || 'API Key không hợp lệ')
    }
    return (await r.json()).metadata.id as string
  }

  async function push(data: AppData): Promise<void> {
    syncing.value = true
    syncSt.value = 'syncing'
    syncMsg.value = 'Đang đồng bộ'
    syncTime.value = ''
    try {
      await writeBin(data)
      syncSt.value = 'synced'
      syncMsg.value = 'Đã đồng bộ'
      syncTime.value = fmtTime()
    } catch {
      syncSt.value = 'error'
      syncMsg.value = 'Lỗi'
      syncTime.value = fmtTime()
    } finally {
      syncing.value = false
    }
  }

  async function pull(): Promise<AppData> {
    syncSt.value = 'syncing'
    syncMsg.value = 'Đang tải'
    syncTime.value = ''
    const data = await readBin()
    syncSt.value = 'synced'
    syncMsg.value = 'Đã đồng bộ'
    syncTime.value = fmtTime()
    return data
  }

  function saveCredentials(key: string, id: string): void {
    apiKey.value = key
    binId.value = id
    localStorage.setItem('dt_k', key)
    localStorage.setItem('dt_b', id)
    isConfigured.value = true
  }

  function clearCredentials(): void {
    localStorage.removeItem('dt_k')
    localStorage.removeItem('dt_b')
    apiKey.value = ''
    binId.value = ''
    isConfigured.value = false
  }

  return {
    apiKey,
    binId,
    isConfigured,
    syncSt,
    syncMsg,
    syncTime,
    syncing,
    readBin,
    writeBin,
    createBin,
    push,
    pull,
    saveCredentials,
    clearCredentials,
  }
}
