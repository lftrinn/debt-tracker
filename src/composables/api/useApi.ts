import { ref } from 'vue'
import type { AppData, SyncStatus } from '@/types/data'
import { i18n } from '../../i18n'
import {
  isV2Schema,
  applyV2ToLegacy,
  syncItemsFromLegacy,
  toV2Output,
} from '../data/useV2Adapter'

const BASE = 'https://api.jsonbin.io/v3'

/**
 * Composable giao tiếp với JSONBin.io v3 API — đọc, ghi dữ liệu và quản lý trạng thái đồng bộ.
 * Credentials (API key, bin ID) được lưu trong localStorage với key dt_k và dt_b.
 * @returns apiKey, binId, isConfigured, syncSt, syncMsg, syncTime, syncing, readBin, writeBin, createBin, push, pull, saveCredentials, clearCredentials
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

  /**
   * Đọc bản ghi mới nhất từ JSONBin.
   *
   * Phase 11 reset behavior: nếu data trên JSONBin là legacy v1 schema
   * (chưa migrate sang v2), throw special error 'LEGACY_SCHEMA_RESET' để
   * caller (useAppSetup) discard + dùng seed (data trong JSON user gửi) +
   * push lên JSONBin với format v2. Logs cũ bị reset hoàn toàn.
   *
   * Nếu đã v2 → derive legacy views và dùng bình thường.
   *
   * @returns Dữ liệu ứng dụng đã parse + processed
   * @throws Error('LEGACY_SCHEMA_RESET') khi cần reset
   */
  async function readBin(): Promise<AppData> {
    const r = await fetch(`${BASE}/b/${binId.value}/latest`, { headers: H() })
    if (!r.ok) throw new Error('Lỗi đọc dữ liệu')
    const raw = (await r.json()).record as AppData
    if (isV2Schema(raw)) {
      // Already v2 → derive legacy views
      return applyV2ToLegacy(raw)
    }
    // Legacy v1 detected → caller xử lý reset
    throw new Error('LEGACY_SCHEMA_RESET')
  }

  /**
   * Ghi đè toàn bộ dữ liệu lên JSONBin · sync items[] từ legacy fields trước
   * khi serialize (Phase 11). Output JSON chỉ chứa { meta, items }.
   * @param data - Dữ liệu ứng dụng cần lưu
   */
  async function writeBin(data: AppData): Promise<void> {
    syncItemsFromLegacy(data)
    const payload = toV2Output(data)
    const r = await fetch(`${BASE}/b/${binId.value}`, {
      method: 'PUT',
      headers: H(),
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error('Lỗi ghi dữ liệu')
  }

  /**
   * Tạo bin JSONBin mới với dữ liệu khởi tạo (v2 format), trả về bin ID vừa tạo.
   * @param data - Dữ liệu ban đầu cần lưu vào bin
   * @param key - JSONBin Master Key của người dùng
   * @returns ID của bin vừa tạo
   */
  async function createBin(data: AppData, key: string): Promise<string> {
    syncItemsFromLegacy(data)
    const payload = toV2Output(data)
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

  /**
   * Đẩy dữ liệu lên JSONBin và cập nhật trạng thái đồng bộ.
   * Bắt lỗi im lặng — không throw, chỉ cập nhật syncSt sang 'error'.
   * @param data - Dữ liệu cần đẩy lên
   */
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

  /**
   * Kéo dữ liệu mới nhất từ JSONBin và cập nhật trạng thái đồng bộ.
   * Throw lỗi nếu request thất bại để caller tự xử lý.
   * @returns Dữ liệu ứng dụng mới nhất từ server
   */
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

  /**
   * Lưu API key và bin ID vào state và localStorage, đánh dấu kết nối đã được cấu hình.
   * @param key - JSONBin Master Key
   * @param id - Bin ID
   */
  function saveCredentials(key: string, id: string): void {
    apiKey.value = key
    binId.value = id
    localStorage.setItem('dt_k', key)
    localStorage.setItem('dt_b', id)
    isConfigured.value = true
  }

  /**
   * Xóa credentials khỏi localStorage và reset state về trạng thái chưa kết nối.
   */
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
