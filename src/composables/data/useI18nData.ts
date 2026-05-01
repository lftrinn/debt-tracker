/**
 * Helper lấy text đã được bản địa hoá từ record có descI18n, nameI18n, eventI18n hoặc textI18n.
 * Fallback về trường gốc nếu chưa có bản dịch cho locale hiện tại.
 */

import { i18n } from '../../i18n'
import type { AppLang } from '../api/useTranslation'

/** Kiểu tối thiểu cho bất kỳ record có thể có bản dịch */
export interface LocalizableRecord {
  desc?: string
  descI18n?: Partial<Record<AppLang, string>>
  name?: string
  nameI18n?: Partial<Record<AppLang, string>>
  event?: string
  eventI18n?: Partial<Record<AppLang, string>>
  text?: string
  textI18n?: Partial<Record<AppLang, string>>
}

/** Legacy rule shape (chuỗi hoặc object có textI18n). */
export interface LegacyRuleText {
  text: string
  textLang?: AppLang
  textI18n?: Partial<Record<AppLang, string>>
}

/**
 * Trả về text đã bản địa hoá cho field chỉ định.
 * @param item - Record chứa field gốc và bản dịch (nếu có)
 * @param field - 'desc', 'name', 'event' hoặc 'text'
 * @param locale - Locale cần lấy; mặc định dùng locale hiện tại của app
 * @returns Bản dịch nếu có, fallback về giá trị gốc
 */
export function getLocalized(
  item: LocalizableRecord,
  field: 'desc' | 'name' | 'event' | 'text',
  locale?: string,
): string {
  const lang = (locale ?? (i18n.global.locale as { value: string }).value) as AppLang
  if (field === 'desc') return item.descI18n?.[lang] ?? item.desc ?? ''
  if (field === 'event') return item.eventI18n?.[lang] ?? item.event ?? ''
  if (field === 'text') return item.textI18n?.[lang] ?? item.text ?? ''
  return item.nameI18n?.[lang] ?? item.name ?? ''
}

/**
 * Trả về text đã bản địa hoá từ một rule item.
 */
export function getRuleText(
  rule: string | LegacyRuleText,
  locale?: string,
): string {
  if (typeof rule === 'string') return rule
  return getLocalized({ text: rule.text, textI18n: rule.textI18n }, 'text', locale)
}
