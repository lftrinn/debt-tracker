import { ref, watch } from 'vue'

const LS_KEY = 'dt_progress_mode'

/** Kiểu hiển thị thanh tiến độ thẻ tín dụng.
 * 'used'   = % đã sử dụng hạn mức (100% = hết hạn mức = xấu)
 * 'repaid' = % đã trả được (100% = hết nợ = tốt) — mặc định
 */
export type ProgressMode = 'used' | 'repaid'

const progressMode = ref<ProgressMode>(
  (localStorage.getItem(LS_KEY) as ProgressMode) || 'repaid'
)

watch(progressMode, (v) => localStorage.setItem(LS_KEY, v))

/**
 * Cài đặt hiển thị liên quan đến DebtOverview.
 * Singleton — tất cả component dùng chung cùng ref.
 */
export function useDebtSettings() {
  function setProgressMode(mode: ProgressMode) {
    progressMode.value = mode
  }

  return { progressMode, setProgressMode }
}
