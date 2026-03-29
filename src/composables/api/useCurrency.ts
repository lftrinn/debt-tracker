import { ref } from 'vue'

export type Currency = 'VND' | 'USD' | 'JPY'
export type JpyNotation = 'standard' | 'kanji'

export const CURRENCIES: Currency[] = ['VND', 'USD', 'JPY']

const CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours

// Module-level singleton state (shared across all useCurrency() calls)
const displayCurrency = ref<Currency>(
  (localStorage.getItem('dt_currency_display') as Currency | null) ?? 'VND'
)
const jpyNotation = ref<JpyNotation>(
  (localStorage.getItem('dt_jpy_notation') as JpyNotation | null) ?? 'standard'
)
const rates = ref<Record<string, number>>({})
const ratesLoading = ref(false)
const ratesError = ref(false)

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

function convert(amountVnd: number, to: 'USD' | 'JPY'): number {
  const key = to.toLowerCase()
  const rate = rates.value[key]
  return rate ? amountVnd * rate : amountVnd
}

/** Short format with currency symbol: ₫500K, $15.23, ¥1.5万 */
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

/** Full format with currency symbol: ₫34,946,713 / $1,363.42 / ¥209,680 */
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

export function useCurrency() {
  return {
    displayCurrency,
    jpyNotation,
    ratesLoading,
    ratesError,
    fetchRates,
    fCurr,
    fCurrFull,
    setDisplayCurrency(c: Currency): void {
      displayCurrency.value = c
      localStorage.setItem('dt_currency_display', c)
    },
    setJpyNotation(n: JpyNotation): void {
      jpyNotation.value = n
      localStorage.setItem('dt_jpy_notation', n)
    },
  }
}
