import { vi } from 'vitest'
import {
  type AppData,
  type Item,
  type DebtItem,
  mkAccount,
  mkIncomeRecurring,
  mkDebt,
} from '@/types/data'

/**
 * Build a minimal valid v2 AppData for tests. Override `items` array and/or merge meta fields.
 * Returns a fresh `{ meta, items }` object — no legacy fields.
 */
export function makeData(opts: { items?: Item[]; meta?: Partial<AppData['meta']> } = {}): AppData {
  const baseItems: Item[] = [
    mkAccount('cash', 'Cash', { amount: 1_000_000, as_of: '2026-03-01' }),
    mkIncomeRecurring('salary', 'Salary', {
      amount: 22_923_000,
      per_period: 22_923_000,
      frequency: 'monthly',
      due_day_of_month: 5,
    }),
  ]
  return {
    meta: {
      owner: 'Test',
      currency: 'VND',
      generated_at: '2026-03-01',
      as_of_month: '2026-03',
      strategy: 'avalanche_modified',
      strategy_note: '',
      debt_free_target: '',
      schema_note: 'v2 test fixture',
      daily_limit: { until_salary: 70_000, after_salary: 100_000 },
      custom_daily_limit: 0,
      extra_paid: 0,
      projected_debt_by_month: [],
      debt_summary_total: 0,
      ...(opts.meta ?? {}),
    },
    items: opts.items ?? baseItems,
  }
}

/** A credit card stub for tests (v2 DebtItem). */
export const VISA1: DebtItem = mkDebt('visa1', 'Visa 1', {
  amount: 5_000_000,
  credit_limit: 10_000_000,
  available_credit: 5_000_000,
  apr: 0.328,
  monthly_rate: 0.328 / 12,
  minimum_payment: 500_000,
  due_date: '2026-04-15',
})

export const VISA2: DebtItem = mkDebt('visa2', 'Visa 2', {
  amount: 8_000_000,
  credit_limit: 20_000_000,
  available_credit: 12_000_000,
  apr: 0.358,
  monthly_rate: 0.358 / 12,
  minimum_payment: 800_000,
})

/** Build a small loan DebtItem for tests. */
export function mkLoan(id: string, name: string, balance: number): DebtItem {
  return mkDebt(id, name, { amount: balance, credit_limit: null })
}

export const mockPush = () => vi.fn().mockResolvedValue(true)
export const mockToast = () => vi.fn()
export const mockTStr = (date = '2026-03-29') => () => date
export const mockFindDebtId = () => vi.fn().mockReturnValue(null)
