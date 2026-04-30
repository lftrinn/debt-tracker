/**
 * useDisplayMode — quản lý lớp tên kép (display_name vs real_name).
 *
 * Mode 'tutien' (mặc định): hiển thị tên đạo hiệu (vd. "Hắc Sát Tà Vương").
 * Mode 'real': hiển thị tên gốc kế toán (vd. "VISA · 8821").
 *
 * Persist trong localStorage key 'dt_display_mode'.
 * Singleton pattern theo module level — mọi lần gọi useDisplayMode() cùng state.
 */

import { ref, computed, type Ref } from 'vue'

export type DisplayMode = 'real' | 'tutien'

const STORAGE_KEY = 'dt_display_mode'

function load(): DisplayMode {
  if (typeof localStorage === 'undefined') return 'tutien'
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'real' ? 'real' : 'tutien'
}

const mode = ref<DisplayMode>(load())

/** Tiện gọi từ template: <span :class="{ tutien: useTutien }"> */
const useTutien = computed(() => mode.value === 'tutien')

export interface NameLike {
  display_name?: string
  real_name?: string
  /** Fallback nếu cả hai đều thiếu */
  name?: string
}

/**
 * Resolve tên hiển thị theo mode hiện tại.
 * - tutien: display_name → real_name → name
 * - real:   real_name → name → display_name
 */
function dn(item: NameLike | undefined | null): string {
  if (!item) return ''
  if (mode.value === 'tutien') {
    return item.display_name ?? item.real_name ?? item.name ?? ''
  }
  return item.real_name ?? item.name ?? item.display_name ?? ''
}

export function useDisplayMode() {
  function setMode(m: DisplayMode): void {
    mode.value = m
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, m)
    }
  }

  function toggleMode(): void {
    setMode(mode.value === 'tutien' ? 'real' : 'tutien')
  }

  return {
    mode: mode as Readonly<Ref<DisplayMode>>,
    useTutien,
    setMode,
    toggleMode,
    dn,
  }
}
