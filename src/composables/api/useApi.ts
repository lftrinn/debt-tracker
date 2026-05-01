import { ref } from 'vue'
import type { AppData, SyncStatus } from '@/types/data'
import { i18n } from '../../i18n'

const BASE = 'https://api.jsonbin.io/v3'

/** Detect data có shape v2 (`{meta, items[]}`). */
function isV2Schema(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  return Array.isArray(obj.items) && typeof obj.meta === 'object' && obj.meta !== null
}

/**
 * JSONBin v3 API wrapper. Schema v2 native — không còn adapter layer.
 * Đọc/ghi trực tiếp `{meta, items}`. Nếu pull về data v1 → throw 'LEGACY_SCHEMA_RESET'
 * để caller reset bằng seed v2.
 */
export function useApi() {
  const apiKey = ref(localStorage.getItem('dt_k') || '')
  const binId = ref(localStorage.getItem('dt_b') || '')
  const isConfigured = ref(!!(apiKey.value && binId.value))

  const syncSt = ref<SyncStatus>('synced')
  const syncMsg = ref('sync.done')
  const syncTime = ref('')
  const syncing = ref(false)

  const fmtTime = (): string => {
    const locale = (i18n.global.locale as { value: string }).value
    const bcp = locale === 'en' ? 'en-US' : locale === 'ja' ? 'ja-JP' : 'vi-VN'
    return new Date().toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const H = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    'X-Master-Key': apiKey.value,
  })

  async function readBin(): Promise<AppData> {
    const r = await fetch(`${BASE}/b/${binId.value}/latest`, { headers: H() })
    if (!r.ok) throw new Error('Lỗi đọc dữ liệu')
    const raw = (await r.json()).record as unknown
    if (!isV2Schema(raw)) throw new Error('LEGACY_SCHEMA_RESET')
    return raw as AppData
  }

  async function writeBin(data: AppData): Promise<void> {
    const payload = { meta: data.meta, items: data.items }
    const r = await fetch(`${BASE}/b/${binId.value}`, {
      method: 'PUT',
      headers: H(),
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error('Lỗi ghi dữ liệu')
  }

  async function createBin(data: AppData, key: string): Promise<string> {
    const payload = { meta: data.meta, items: data.items }
    const r = await fetch(`${BASE}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': key,
        'X-Bin-Name': 'debt-tracker-quang',
        'X-Bin-Private': 'true',
      },
      body: JSON.stringify(payload),
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
    syncMsg.value = 'sync.syncing'
    syncTime.value = ''
    try {
      await writeBin(data)
      syncSt.value = 'synced'
      syncMsg.value = 'sync.done'
      syncTime.value = fmtTime()
    } catch {
      syncSt.value = 'error'
      syncMsg.value = 'sync.error'
      syncTime.value = fmtTime()
    } finally {
      syncing.value = false
    }
  }

  async function pull(): Promise<AppData> {
    syncSt.value = 'syncing'
    syncMsg.value = 'sync.loading'
    syncTime.value = ''
    const data = await readBin()
    syncSt.value = 'synced'
    syncMsg.value = 'sync.done'
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
