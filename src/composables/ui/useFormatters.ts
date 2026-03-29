/**
 * Các tiện ích định dạng số tiền VND và ngày tháng theo chuẩn Việt Nam.
 * Dùng chung xuyên suốt ứng dụng — không chứa state, an toàn khi gọi nhiều lần.
 * @returns fN, fS, fV, fDate, tStr, isTM, isT, dDiff
 */
export function useFormatters() {
  /** Format number with vi-VN locale separators */
  const fN = (n: number | null | undefined): string =>
    (n || 0).toLocaleString('vi-VN')

  /** Format to short notation: 1_500_000 → '1.5M', 1_500 → '2K' */
  const fS = (n: number | null | undefined): string => {
    const v = Math.abs(n || 0)
    if (v >= 1000000000) {
      const b = v / 1000000000
      return (b % 1 === 0 ? String(b) : b.toFixed(1).replace(/\.0$/, '')) + 'B'
    }
    if (v >= 1000000) {
      const m = v / 1000000
      return (m % 1 === 0 ? String(m) : m.toFixed(1).replace(/\.0$/, '')) + 'M'
    }
    return v >= 1000
      ? (v / 1000).toFixed(0) + 'K'
      : String(v)
  }

  /** Format with ₫ prefix and absolute value */
  const fV = (n: number | null | undefined): string => '₫' + fN(Math.abs(n || 0))

  /**
   * Format ISO date string theo locale hiện tại.
   * @param ds - Chuỗi ngày ISO 'YYYY-MM-DD'
   * @param lang - Locale code ('vi'|'en'|'ja'). Mặc định 'vi'.
   */
  const fDate = (ds: string, lang?: string): string => {
    const d = new Date(ds)
    if (lang === 'en') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (lang === 'ja') return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  /** Return today as 'YYYY-MM-DD' (local time) */
  const tStr = (): string => {
    const n = new Date()
    return (
      n.getFullYear() +
      '-' +
      String(n.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(n.getDate()).padStart(2, '0')
    )
  }

  /** True if date string is in the current month */
  const isTM = (dt: string): boolean => dt.startsWith(tStr().slice(0, 7))

  /** True if date string is today */
  const isT = (dt: string): boolean => dt === tStr()

  /**
   * Days between today (local) and target date string 'YYYY-MM-DD'.
   * Positive = future, negative = past, 0 = today.
   */
  const dDiff = (s: string): number => {
    const [y, m, d] = s.split('-').map(Number)
    const target = new Date(y, m - 1, d)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.round((target.getTime() - today.getTime()) / 86400000)
  }

  return { fN, fS, fV, fDate, tStr, isTM, isT, dDiff }
}
