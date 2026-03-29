import { createI18n } from 'vue-i18n'
import vi from './locales/vi'
import en from './locales/en'
import ja from './locales/ja'

export type Locale = 'vi' | 'en' | 'ja'
export const LOCALES: Locale[] = ['vi', 'en', 'ja']

const savedLocale = (localStorage.getItem('dt_lang') || 'vi') as Locale

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'vi',
  messages: { vi, en, ja },
})

export function setLocale(locale: Locale): void {
  ;(i18n.global.locale as { value: Locale }).value = locale
  localStorage.setItem('dt_lang', locale)
}
