import { ref } from 'vue'
import type { AppData, SyncStatus } from '@/types/data'
import { i18n } from '../../i18n'

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
    return new Date().toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit' })
  }

  const H = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    'X-Master-Key': apiKey.value,
  })

  /**
   * Đọc bản ghi mới nhất từ JSONBin.
   * @returns Dữ liệu ứng dụng đã parse
   */
  async function readBin(): Promise<AppData> {
    const r = await fetch(`${BASE}/b/${binId.value}/latest`, { headers: H() })
    if (!r.ok) throw new Error('Lỗi đọc dữ liệu')
    return (await r.json()).record as AppData
  }

  /**
   * Ghi đè toàn bộ dữ liệu lên JSONBin bằng PUT request.
   * @param data - Dữ liệu ứng dụng cần lưu
   */
  async function writeBin(data: AppData): Promise<void> {
    const r = await fetch(`${BASE}/b/${binId.value}`, {
      method: 'PUT',
      headers: H(),
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error('Lỗi ghi dữ liệu')
  }

  /**
   * Tạo bin JSONBin mới với dữ liệu khởi tạo, trả về bin ID vừa tạo.
   * @param data - Dữ liệu ban đầu cần lưu vào bin
   * @param key - JSONBin Master Key của người dùng
   * @returns ID của bin vừa tạo
   */
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
