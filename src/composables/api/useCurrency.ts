import { ref } from 'vue'

export type Currency = 'VND' | 'USD' | 'JPY'
export type JpyNotation = 'standard' | 'kanji'

export const CURRENCIES: Currency[] = ['VND', 'USD', 'JPY']

const CACHE_TTL = 4 * 60 * 60 * 1000 // 4 giờ — tránh gọi API liên tục

// State singleton ở module level — chia sẻ giữa tất cả lần gọi useCurrency()
const displayCurrency = ref<Currency>(
  (localStorage.getItem('dt_currency_display') as Currency | null) ?? 'VND'
)
/** Base currency = đơn vị tiền lưu trong data (mặc định cho giao dịch mới) */
const baseCurrency = ref<Currency>(
  (localStorage.getItem('dt_currency_base') as Currency | null) ?? 'VND'
)
const jpyNotation = ref<JpyNotation>(
  (localStorage.getItem('dt_jpy_notation') as JpyNotation | null) ?? 'standard'
)
const rates = ref<Record<string, number>>({})
const ratesLoading = ref(false)
const ratesError = ref(false)

/**
 * Tải tỷ giá hối đoái từ API công cộng (gốc VND).
 * Kết quả được cache 4 giờ trong localStorage để tránh gọi API liên tục.
 */
async function fetchRates(): Promise<void> {
  const now = Date.now()
  const cached = localStorage.getItem('dt_fx_rates')
  const cachedTs = Number(localStorage.getItem('dt_fx_rates_ts') ?? '0')
  if (cached && now - cachedTs < CACHE_TTL) {
    try { rates.value = JSON.parse(cached) as Record<string, number> } catch { /* ignore */ }
    return
  }
  ratesLoading.value = true
  ratesError.value = false
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/vnd.json'
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json() as { vnd?: Record<string, number> }
    const r = data.vnd ?? {}
    rates.value = r
    localStorage.setItem('dt_fx_rates', JSON.stringify(r))
    localStorage.setItem('dt_fx_rates_ts', String(now))
  } catch {
    ratesError.value = true
  } finally {
    ratesLoading.value = false
  }
}

/**
 * Quy đổi số tiền VND sang USD hoặc JPY theo tỷ giá hiện tại.
 * rates.value.usd = "1 VND = X USD" → amount_vnd * rate = amount_foreign.
 * Trả về giá trị gốc nếu chưa có tỷ giá.
 */
function convert(amountVnd: number, to: 'USD' | 'JPY'): number {
  const key = to.toLowerCase()
  const rate = rates.value[key]
  return rate ? amountVnd * rate : amountVnd
}

/**
 * Chuyển số tiền từ currency bất kỳ về VND.
 * Vì rates['usd'] = (1 VND / 1 USD) → 1 USD = 1/rates['usd'] VND.
 * Trả về amount gốc nếu chưa có tỷ giá (fallback an toàn).
 */
function toVnd(amount: number, from: Currency): number {
  if (from === 'VND') return amount
  const rate = rates.value[from.toLowerCase()]
  return rate ? amount / rate : amount
}

/**
 * Chuyển đổi số tiền giữa 2 currencies bất kỳ, pivot qua VND.
 * Ví dụ: USD → JPY = USD → VND → JPY.
 * Trả về amount gốc nếu rates chưa load.
 */
function convertBetween(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount
  const asVnd = toVnd(amount, from)
  if (to === 'VND') return asVnd
  return convert(asVnd, to)
}

/**
 * Định dạng ngắn theo native currency — không quy đổi sang displayCurrency.
 * Dùng khi cần hiển thị số tiền đúng đơn vị gốc của giao dịch.
 * @param amount - Số tiền tính theo txCur
 * @param txCur - Đơn vị tiền cần format
 */
function fCurrNative(amount: number | null | undefined, txCur: Currency): string {
  const v = Math.abs(amount || 0)
  if (txCur === 'VND') {
    if (v >= 1_000_000_000) return '₫' + (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
    if (v >= 1_000_000) return '₫' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (v >= 1_000) return '₫' + Math.round(v / 1_000) + 'K'
    return '₫' + Math.round(v)
  }
  if (txCur === 'JPY') {
    if (jpyNotation.value === 'kanji') {
      if (v >= 100_000_000) return '¥' + (v / 100_000_000).toFixed(1).replace(/\.0$/, '') + '億'
      if (v >= 10_000) return '¥' + (v / 10_000).toFixed(1).replace(/\.0$/, '') + '万'
      return '¥' + Math.round(v).toLocaleString('ja-JP')
    }
    if (v >= 1_000_000_000) return '¥' + (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
    if (v >= 1_000_000) return '¥' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (v >= 1_000) return '¥' + Math.round(v / 1_000) + 'K'
    return '¥' + Math.round(v).toLocaleString('ja-JP')
  }
  // USD
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return '$' + v.toFixed(2)
}

/**
 * Format số tiền (tính theo txCurrency) để hiển thị theo displayCurrency.
 * Nếu txCurrency === displayCurrency → format trực tiếp (không qua VND).
 * Nếu khác → chuyển sang VND rồi fCurr sẽ quy đổi tiếp sang displayCurrency.
 * @param amount - Số tiền tính theo txCur
 * @param txCur - Đơn vị tiền của giao dịch
 */
function fCurrFor(amount: number | null | undefined, txCur: Currency): string {
  if (!txCur || txCur === displayCurrency.value) {
    return fCurrNative(amount, txCur || displayCurrency.value)
  }
  // Chuyển txCur → VND → displayCurrency qua fCurr
  const asVnd = toVnd(amount || 0, txCur)
  return fCurr(asVnd)
}

/**
 * Định dạng ngắn với ký hiệu tiền tệ: ₫500K, $15.23, ¥1.5万.
 * Nhận vào amountVnd (đơn vị VND), tự quy đổi sang displayCurrency.
 * Nếu chưa có tỷ giá thì fallback hiển thị VND.
 * @param amountVnd - Số tiền tính theo VND
 */
function fCurr(amountVnd: number | null | undefined): string {
  const v = Math.abs(amountVnd || 0)
  const cur = displayCurrency.value
  if (cur === 'VND' || !rates.value.usd) {
    if (v >= 1_000_000_000) return '₫' + (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
    if (v >= 1_000_000) return '₫' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (v >= 1_000) return '₫' + Math.round(v / 1_000) + 'K'
    return '₫' + Math.round(v)
  }
  if (cur === 'JPY') {
    const jpy = convert(v, 'JPY')
    if (jpyNotation.value === 'kanji') {
      if (jpy >= 100_000_000) return '¥' + (jpy / 100_000_000).toFixed(1).replace(/\.0$/, '') + '億'
      if (jpy >= 10_000) return '¥' + (jpy / 10_000).toFixed(1).replace(/\.0$/, '') + '万'
      return '¥' + Math.round(jpy).toLocaleString('ja-JP')
    }
    if (jpy >= 1_000_000_000) return '¥' + (jpy / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
    if (jpy >= 1_000_000) return '¥' + (jpy / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (jpy >= 1_000) return '¥' + Math.round(jpy / 1_000) + 'K'
    return '¥' + Math.round(jpy).toLocaleString('ja-JP')
  }
  // USD
  const usd = convert(v, 'USD')
  if (usd >= 1_000_000) return '$' + (usd / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (usd >= 1_000) return '$' + (usd / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return '$' + usd.toFixed(2)
}

/**
 * Định dạng đầy đủ với ký hiệu tiền tệ: ₫34,946,713 / $1,363.42 / ¥209,680.
 * Dùng cho các nơi cần hiển thị con số chính xác, không rút gọn.
 * @param amountVnd - Số tiền tính theo VND
 */
function fCurrFull(amountVnd: number | null | undefined): string {
  const v = Math.abs(amountVnd || 0)
  const cur = displayCurrency.value
  if (cur === 'VND' || !rates.value.usd) return '₫' + v.toLocaleString('vi-VN')
  if (cur === 'JPY') {
    const jpy = convert(v, 'JPY')
    return '¥' + Math.round(jpy).toLocaleString('ja-JP')
  }
  const usd = convert(v, 'USD')
  return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Composable quản lý hiển thị đa tiền tệ (VND/USD/JPY).
 * Singleton — state chia sẻ toàn app, persist qua localStorage.
 * @returns Hàm format tiền, tỷ giá, convert helpers, và setters
 */
export function useCurrency() {
  return {
    displayCurrency,
    baseCurrency,
    jpyNotation,
    ratesLoading,
    ratesError,
    fetchRates,
    fCurr,
    fCurrFull,
    fCurrNative,
    fCurrFor,
    toVnd,
    convertBetween,
    setDisplayCurrency(c: Currency): void {
      displayCurrency.value = c
      localStorage.setItem('dt_currency_display', c)
    },
    setBaseCurrency(c: Currency): void {
      baseCurrency.value = c
      localStorage.setItem('dt_currency_base', c)
    },
    setJpyNotation(n: JpyNotation): void {
      jpyNotation.value = n
      localStorage.setItem('dt_jpy_notation', n)
    },
  }
}
