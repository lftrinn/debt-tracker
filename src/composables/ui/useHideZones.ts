import { ref } from 'vue'

export type HideZoneKey =
  | 'alert'
  | 'cash.balance' | 'cash.todaySpent' | 'cash.monthSpent'
  | 'debt.total' | 'debt.cardBal' | 'debt.minPay'
  | 'progress.origDebt' | 'progress.remaining'
  | 'upcoming.amount' | 'upcoming.shortage'
  | 'transactions'
  | 'charts.spend' | 'charts.debtLine' | 'charts.pie'
  | 'timeline.debt' | 'timeline.eventAmt'
  | 'settings.cardInfo' | 'settings.dailyLim' | 'settings.dropdown' | 'settings.cashInfo'

const HIDE_ZONE_DEFAULTS: Record<HideZoneKey, boolean> = {
  'alert': true,
  'cash.balance': true, 'cash.todaySpent': true, 'cash.monthSpent': true,
  'debt.total': true, 'debt.cardBal': true, 'debt.minPay': true,
  'progress.origDebt': true, 'progress.remaining': true,
  'upcoming.amount': true, 'upcoming.shortage': true,
  'transactions': true,
  'charts.spend': true, 'charts.debtLine': true, 'charts.pie': true,
  'timeline.debt': true, 'timeline.eventAmt': true,
  'settings.cardInfo': true, 'settings.dailyLim': true, 'settings.dropdown': true, 'settings.cashInfo': true,
}

/**
 * Quản lý chế độ ẩn số tiền nhạy cảm theo từng vùng UI (privacy mode).
 * Trạng thái được lưu vào localStorage để giữ giữa các lần load.
 * @returns hideAmounts, toggleHide, hideZones, setHideZone, hz
 */
export function useHideZones() {
  // Mặc định bật ẩn trừ khi người dùng đã tắt trước đó (giá trị '0')
  const hideAmounts = ref(localStorage.getItem('dt_hide') !== '0')

  /**
   * Bật/tắt chế độ ẩn toàn bộ số tiền và lưu trạng thái vào localStorage.
   */
  function toggleHide(): void {
    hideAmounts.value = !hideAmounts.value
    localStorage.setItem('dt_hide', hideAmounts.value ? '1' : '0')
  }

  const hideZones = ref<Record<string, boolean>>({
    ...HIDE_ZONE_DEFAULTS,
    ...JSON.parse(localStorage.getItem('dt_hz') || '{}'),
  })

  /**
   * Cập nhật trạng thái ẩn cho một vùng cụ thể và đồng bộ vào localStorage.
   * @param key - HideZoneKey xác định vùng UI
   * @param val - true để ẩn, false để hiện
   */
  function setHideZone(key: string, val: boolean): void {
    hideZones.value = { ...hideZones.value, [key]: val }
    localStorage.setItem('dt_hz', JSON.stringify(hideZones.value))
  }

  /** Returns true if amounts should be hidden for the given zone key */
  function hz(k: string): boolean {
    return hideAmounts.value && (hideZones.value[k] ?? false)
  }

  return { hideAmounts, toggleHide, hideZones, setHideZone, hz }
}
