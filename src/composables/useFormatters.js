/**
 * Formatting utilities for Vietnamese currency and dates
 */
export function useFormatters() {
  const fN = (n) => (n || 0).toLocaleString('vi-VN')

  const fS = (n) => {
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

  const fV = (n) => '₫' + fN(Math.abs(n))

  const fDate = (ds) =>
    new Date(ds).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const tStr = () => {
    const n = new Date()
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0')
  }
  const isTM = (dt) => dt.startsWith(tStr().slice(0, 7))
  const isT = (dt) => dt === tStr()
  const dDiff = (s) => {
    const [y, m, d] = s.split('-').map(Number)
    const target = new Date(y, m - 1, d)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.round((target - today) / 86400000)
  }

  return { fN, fS, fV, fDate, tStr, isTM, isT, dDiff }
}
