/**
 * Helper lấy text đã được bản địa hoá từ record có descI18n hoặc nameI18n.
 * Fallback về trường gốc (desc / name) nếu chưa có bản dịch cho locale hiện tại.
 */

import { i18n } from '../../i18n'
import type { AppLang } from '../api/useTranslation'

/** Kiểu tối thiểu cho bất kỳ record có thể có bản dịch */
export interface LocalizableRecord {
  desc?: string
  descI18n?: Partial<Record<AppLang, string>>
  name?: string
  nameI18n?: Partial<Record<AppLang, string>>
}

/**
 * Trả về text đã bản địa hoá cho field chỉ định.
 * @param item - Record chứa field gốc và bản dịch (nếu có)
 * @param field - 'desc' hoặc 'name'
 * @param locale - Locale cần lấy; mặc định dùng locale hiện tại của app
 * @returns Bản dịch nếu có, fallback về giá trị gốc
 */
export function getLocalized(
  item: LocalizableRecord,
  field: 'desc' | 'name',
  locale?: string,
): string {
  const lang = (locale ?? (i18n.global.locale as { value: string }).value) as AppLang
  if (field === 'desc') {
    return item.descI18n?.[lang] ?? item.desc ?? ''
  }
  return item.nameI18n?.[lang] ?? item.name ?? ''
}
