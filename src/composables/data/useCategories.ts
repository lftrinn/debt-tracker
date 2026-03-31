import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Category icon mapping — maps category keys to Lucide icon names and i18n labels.
 * Used in AddTransaction, TransactionList, DetailPopup for consistent category display.
 */

export interface Category {
  key: string
  icon: string
  label: string
}

const EXPENSE_ICONS: Record<string, string> = {
  an: 'utensils',
  cafe: 'coffee',
  mua: 'shopping-cart',
  dilai: 'bus',
  yte: 'pill',
  giaitri: 'gamepad-2',
  hd: 'lightbulb',
  khac: 'package',
  thanhToan: 'credit-card',
}

const INCOME_ICONS: Record<string, string> = {
  luong: 'briefcase',
  freelance: 'laptop',
  thuong: 'gift',
  hoantien: 'undo',
  dautu: 'bar-chart-3',
  khac_thu: 'coins',
}

// Legacy emoji → new key mapping (for backward compatibility with existing data)
const emojiToKey: Record<string, string> = {
  '🍜': 'an', '☕': 'cafe', '🛒': 'mua', '🚌': 'dilai',
  '💊': 'yte', '🎮': 'giaitri', '💡': 'hd', '📦': 'khac',
  '💼': 'luong', '💻': 'freelance', '🎁': 'thuong',
  '↩️': 'hoantien', '📈': 'dautu', '💰': 'khac_thu',
}

/**
 * Cung cấp danh sách danh mục chi tiêu/thu nhập và hàm resolve từ key hoặc emoji legacy.
 * Dùng trong AddTransaction, TransactionList, DetailPopup để hiển thị icon và nhãn nhất quán.
 * @returns expenseCategories, incomeCategories, emojiToKey, resolveCat
 */
export function useCategories() {
  const { t } = useI18n()

  const expenseCategories = computed<Category[]>(() =>
    Object.keys(EXPENSE_ICONS).map((key) => ({
      key,
      icon: EXPENSE_ICONS[key],
      label: t(`categories.expense.${key}`),
    }))
  )

  const incomeCategories = computed<Category[]>(() =>
    Object.keys(INCOME_ICONS).map((key) => ({
      key,
      icon: INCOME_ICONS[key],
      label: t(`categories.income.${key}`),
    }))
  )

  /**
   * Resolve a category value (new key or legacy emoji) to { icon, label, key }.
   * Returns a fallback for unknown categories.
   */
  function resolveCat(val: string | undefined | null): Category {
    if (!val) return { icon: 'package', label: '?', key: 'unknown' }
    if (EXPENSE_ICONS[val]) return { key: val, icon: EXPENSE_ICONS[val], label: t(`categories.expense.${val}`) }
    if (INCOME_ICONS[val]) return { key: val, icon: INCOME_ICONS[val], label: t(`categories.income.${val}`) }
    const mapped = emojiToKey[val]
    if (mapped) {
      if (EXPENSE_ICONS[mapped]) return { key: mapped, icon: EXPENSE_ICONS[mapped], label: t(`categories.expense.${mapped}`) }
      if (INCOME_ICONS[mapped]) return { key: mapped, icon: INCOME_ICONS[mapped], label: t(`categories.income.${mapped}`) }
    }
    return { icon: 'package', label: val, key: val }
  }

  return {
    expenseCategories,
    incomeCategories,
    emojiToKey,
    resolveCat,
  }
}
