/**
 * Category icon mapping — maps category keys to Lucide icon names and Vietnamese labels.
 * Used in AddTransaction, TransactionList, DetailPopup for consistent category display.
 */

export interface Category {
  key: string
  icon: string
  label: string
}

export function useCategories() {
  const expenseCategories: Category[] = [
    { key: 'an', icon: 'utensils', label: 'Ăn' },
    { key: 'cafe', icon: 'coffee', label: 'Cafe' },
    { key: 'mua', icon: 'shopping-cart', label: 'Mua' },
    { key: 'dilai', icon: 'bus', label: 'Đi lại' },
    { key: 'yte', icon: 'pill', label: 'Y tế' },
    { key: 'giaitri', icon: 'gamepad-2', label: 'Giải trí' },
    { key: 'hd', icon: 'lightbulb', label: 'HĐ' },
    { key: 'khac', icon: 'package', label: 'Khác' },
    { key: 'thanhToan', icon: 'credit-card', label: 'Thanh toán nợ' },
  ]

  const incomeCategories: Category[] = [
    { key: 'luong', icon: 'briefcase', label: 'Lương' },
    { key: 'freelance', icon: 'laptop', label: 'Freelance' },
    { key: 'thuong', icon: 'gift', label: 'Thưởng' },
    { key: 'hoantien', icon: 'undo', label: 'Hoàn tiền' },
    { key: 'dautu', icon: 'bar-chart-3', label: 'Đầu tư' },
    { key: 'khac_thu', icon: 'coins', label: 'Khác' },
  ]

  // Map from key → { icon, label }
  const catMap: Record<string, Category> = {}
  expenseCategories.forEach(c => { catMap[c.key] = c })
  incomeCategories.forEach(c => { catMap[c.key] = c })

  // Legacy emoji → new key mapping (for backward compatibility with existing data)
  const emojiToKey: Record<string, string> = {
    '🍜': 'an', '☕': 'cafe', '🛒': 'mua', '🚌': 'dilai',
    '💊': 'yte', '🎮': 'giaitri', '💡': 'hd', '📦': 'khac',
    '💼': 'luong', '💻': 'freelance', '🎁': 'thuong',
    '↩️': 'hoantien', '📈': 'dautu', '💰': 'khac_thu',
  }

  /**
   * Resolve a category value (new key or legacy emoji) to { icon, label, key }.
   * Returns a fallback for unknown categories.
   */
  function resolveCat(val: string | undefined | null): Category {
    if (!val) return { icon: 'package', label: '?', key: 'unknown' }
    if (catMap[val]) return catMap[val]
    const mapped = emojiToKey[val]
    if (mapped && catMap[mapped]) return catMap[mapped]
    return { icon: 'package', label: val, key: val }
  }

  return {
    expenseCategories,
    incomeCategories,
    catMap,
    emojiToKey,
    resolveCat,
  }
}
