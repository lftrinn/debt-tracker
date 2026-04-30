/**
 * useTheme — toggle giữa dark mode và light mode.
 *
 * Dark mode (mặc định): ink/paper sâu, vàng kim làm accent.
 * Light mode: nền trà giấy ấm, mực đen, vàng cổ.
 *
 * Persist trong localStorage key 'dt_theme'.
 * Side effect: bật/tắt class 'light' trên <body> để CSS scope (xem styles.css).
 *
 * Singleton — gọi useTheme() bất kỳ đâu đều dùng chung state.
 */

import { ref, watch, type Ref } from 'vue'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'dt_theme'

function load(): Theme {
  if (typeof localStorage === 'undefined') return 'dark'
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' ? 'light' : 'dark'
}

const theme = ref<Theme>(load())

/** Apply class to body khi state thay đổi (side effect ở module level chạy 1 lần). */
if (typeof document !== 'undefined') {
  // Áp dụng ngay lúc khởi tạo
  document.body.classList.toggle('light', theme.value === 'light')

  watch(theme, (t) => {
    document.body.classList.toggle('light', t === 'light')
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, t)
    }
  })
}

export function useTheme() {
  function setTheme(t: Theme): void {
    theme.value = t
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: theme as Readonly<Ref<Theme>>,
    setTheme,
    toggleTheme,
  }
}
