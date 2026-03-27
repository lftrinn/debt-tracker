/**
 * Formatting utilities for Vietnamese currency and dates
 */
export function useFormatters() {
  const fN = (n) => (n || 0).toLocaleString('vi-VN')

  const fS = (n) => {
    const v = Math.abs(n || 0)
    return v >= 1000000
      ? (v / 1000000).toFixed(1) + 'M'
      : v >= 1000
        ? (v / 1000).toFixed(0) + 'K'
        : String(v)
  }

  const fV = (n) => '₫' + fN(Math.abs(n))

  const fDate = (ds) =>
    new Date(ds).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const tStr = () => new Date().toISOString().slice(0, 10)
  const isTM = (dt) => dt.startsWith(new Date().toISOString().slice(0, 7))
  const isT = (dt) => dt === tStr()
  const dDiff = (s) => Math.ceil((new Date(s) - new Date()) / 86400000)

  return { fN, fS, fV, fDate, tStr, isTM, isT, dDiff }
}
