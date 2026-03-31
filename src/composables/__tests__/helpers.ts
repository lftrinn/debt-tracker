import { vi } from 'vitest'
import type { AppData } from '@/types/data'

/** Build a minimal valid AppData for tests. Override any field as needed. */
export function makeData(overrides: Partial<AppData> = {}): AppData {
  return {
    expenses: [],
    incomes: [],
    extra_paid: 0,
    custom_daily_limit: 0,
    current_cash: { balance: 1_000_000, reserved: 0, as_of: '2026-03-01' },
    debts: { credit_cards: [], small_loans: [] },
    income: { monthly_net: 22_923_000, pay_date: 5 },
    rules: { daily_limit: { until_salary: 70_000, after_salary: 100_000 }, must_not: [] },
    payoff_timeline: { projected_debt_by_month: [] },
    ...overrides,
  }
}

/** A credit card stub for tests */
export const VISA1 = {
  id: 'visa1',
  name: 'Visa 1',
  credit_limit: 10_000_000,
  balance: 5_000_000,
  interest_rate_annual: 0.328,
  minimum_payment: 500_000,
  min_due_date: '2026-04-15',
}

export const VISA2 = {
  id: 'visa2',
  name: 'Visa 2',
  credit_limit: 20_000_000,
  balance: 8_000_000,
  interest_rate_annual: 0.358,
  minimum_payment: 800_000,
}

/** Mock pushData that always succeeds */
export const mockPush = () => vi.fn().mockResolvedValue(true)
/** Mock toast spy */
export const mockToast = () => vi.fn()
/** Mock tStr returning a fixed date */
export const mockTStr = (date = '2026-03-29') => () => date
/** Mock findDebtId returning null */
export const mockFindDebtId = () => vi.fn().mockReturnValue(null)
