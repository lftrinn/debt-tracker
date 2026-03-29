/**
 * Dịch tự động mô tả giao dịch dùng MyMemory API (miễn phí, không cần API key).
 * Rate limit: ~10,000 ký tự/ngày. Thất bại im lặng — không throw, trả về null.
 */

export type AppLang = 'vi' | 'en' | 'ja'
export const ALL_LANGS: AppLang[] = ['vi', 'en', 'ja']

const TRANSLATE_API = 'https://api.mymemory.translated.net/get'

/**
 * Dịch một đoạn text từ ngôn ngữ nguồn sang ngôn ngữ đích.
 * Trả về null nếu API thất bại hoặc không có kết quả hợp lệ.
 */
export async function translateText(
  text: string,
  from: AppLang,
  to: AppLang,
): Promise<string | null> {
  if (!text.trim() || from === to) return text
  try {
    const url = `${TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText as string
    }
    return null
  } catch {
    return null
  }
}

/**
 * Dịch text sang tất cả ngôn ngữ còn lại trong ALL_LANGS.
 * Trả về object với ngôn ngữ nguồn đã được điền sẵn, các ngôn ngữ khác nếu dịch thành công.
 * Các bản dịch thất bại sẽ bị bỏ qua — caller dùng fallback về text gốc.
 */
export async function translateToAll(
  text: string,
  sourceLang: AppLang,
): Promise<Partial<Record<AppLang, string>>> {
  const result: Partial<Record<AppLang, string>> = { [sourceLang]: text }
  const others = ALL_LANGS.filter((l) => l !== sourceLang)
  // Tuần tự để tránh rate limiting của API
  for (const lang of others) {
    const translated = await translateText(text, sourceLang, lang)
    if (translated) result[lang] = translated
  }
  return result
}
