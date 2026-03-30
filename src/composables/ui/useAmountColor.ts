import { useCurrency } from '../api/useCurrency'

export type AmountType = 'expense' | 'income'

// Income: vàng xanh đậm → teal rất đậm
const INCOME_COLORS = [
  '#b8e600', // L1 — vàng xanh đậm (chục nghìn VND / <$100 / <¥10K)
  '#66cc44', // L2 — xanh lá trung (trăm nghìn / $100-$999 / ¥10K-¥99K)
  '#33b866', // L3 — xanh lá đậm (triệu / $1K-$9K / ¥100K-¥999K)
  '#00aa88', // L4 — teal đậm (chục triệu / $10K-$99K / ¥1M-¥9M)
  '#008866', // L5 — teal rất đậm (trăm triệu+ / $100K+ / ¥10M+)
]

// Expense: cam đậm → đỏ rất đậm
const EXPENSE_COLORS = [
  '#ff8844', // L1 — cam đậm (chục nghìn VND)
  '#ff5533', // L2 — cam đỏ (trăm nghìn)
  '#ee3333', // L3 — đỏ (triệu)
  '#cc1144', // L4 — đỏ đậm (chục triệu)
  '#aa0033', // L5 — đỏ rất đậm (trăm triệu+)
]

function vndLevel(v: number): number {
  if (v < 100_000) return 0         // < 100K → L1
  if (v < 1_000_000) return 1       // 100K–999K → L2
  if (v < 10_000_000) return 2      // 1M–9.9M → L3
  if (v < 100_000_000) return 3     // 10M–99M → L4
  return 4                           // 100M+ → L5
}

function usdLevel(v: number): number {
  if (v < 100) return 0              // <$100 → L1
  if (v < 1_000) return 1           // $100–$999 → L2
  if (v < 10_000) return 2          // $1K–$9.9K → L3
  if (v < 100_000) return 3         // $10K–$99K → L4
  return 4                           // $100K+ → L5
}

function jpyLevel(v: number): number {
  if (v < 10_000) return 0          // <¥10K → L1
  if (v < 100_000) return 1         // ¥10K–¥99K → L2
  if (v < 1_000_000) return 2       // ¥100K–¥999K → L3
  if (v < 10_000_000) return 3      // ¥1M–¥9.9M → L4
  return 4                           // ¥10M+ → L5
}

/**
 * Trả về màu CSS cho số tiền dựa trên mức độ (magnitude).
 * Income: yellow → teal (theo gradient progress bar).
 * Expense: cam nhạt → đỏ đậm.
 * Scale tự động theo displayCurrency (VND / USD / JPY).
 */
export function useAmountColor() {
  const { displayCurrency, ratesLoading, ratesError, convertBetween } = useCurrency()

  function amountColor(amountVnd: number | null | undefined, type: AmountType): string {
    const v = Math.abs(amountVnd || 0)
    const cur = displayCurrency.value
    let level: number

    if (cur === 'VND' || ratesLoading.value || ratesError.value) {
      level = vndLevel(v)
    } else {
      const converted = convertBetween(v, 'VND', cur)
      level = cur === 'USD' ? usdLevel(converted) : jpyLevel(converted)
    }

    return type === 'income' ? INCOME_COLORS[level] : EXPENSE_COLORS[level]
  }

  return { amountColor }
}
