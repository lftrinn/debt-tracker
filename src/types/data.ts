// ─── Primitive data types (stored in JSONBin) ─────────────────────────────

/** Transaction gộp chi tiêu (exp) và thu nhập (inc) — thay thế Expense + Income riêng biệt */
export interface Transaction {
  id: number
  type: 'exp' | 'inc'
  desc: string
  amount: number
  cat: string
  date: string
  payMethod?: string
  time?: string
  note?: string
}

/** Installment — kỳ trả góp (active hoặc completed) */
export interface Installment {
  id?: string
  merchant: string
  registered?: string
  total_amount?: number
  term_months?: number
  monthly_amount: number
  period_current?: string
  remaining_periods?: number
  ends?: string
  note?: string
  status?: string
  last_payment?: string
}

/** Debt gộp credit card và loan — thay thế CreditCard + SmallLoan riêng biệt */
export interface Debt {
  id: string
  type: 'credit_card' | 'loan'
  name: string
  payment_due_date: string
  upcoming_due_dates?: string[]
  // Shared fields
  account_last4?: string
  interest_rate_monthly?: number
  interest_this_period?: number
  payment_day?: number
  // Credit card fields
  credit_limit?: number
  balance?: number
  interest_rate_annual?: number
  minimum_payment?: number
  payment_due_time?: string
  installments_active?: Installment[]
  installments_completed?: Installment[]
  // Loan fields
  original_amount?: number
  term_months?: number
  monthly_payment?: number
  remaining_periods?: number
  remaining_balance?: number
  ends?: string
  contract?: string
  disbursed?: string
  created?: string
}

export interface OneTimeExpense {
  id: number
  name: string
  date: string
  amount: number
}

/** Một quy tắc trong must_not / must_do */
export interface RuleItem {
  text: string
}

// ─── Root app data schema (shape of the JSONBin record) ───────────────────

export interface AppData {
  schema_version: number
  transactions: Transaction[]
  debts: Debt[]
  extra_paid: number
  custom_daily_limit: number
  current_cash: {
    balance: number
    reserved: number
    as_of: string
  }
  income: {
    monthly_gross?: number
    monthly_net: number
    pay_date: number
    employer?: string
    contract_end?: string
  }
  rules: {
    daily_limit: { until_salary: number; after_salary: number }
    must_not: Array<string | RuleItem>
    must_do?: Array<string | RuleItem>
  }
  one_time_expenses?: OneTimeExpense[]
  paid_obligations?: string[]
  fixed_expenses?: {
    rent?: number
    claude_pro?: number
    internet?: number
    food_budget?: number
    note?: string
  }
  metadata?: {
    owner?: string
    updated_at?: string
    currency?: string
    note?: string
  }
}

// ─── Derived / computed types (returned by composables) ──────────────────

export interface DebtCard {
  id: string
  name: string
  balance: number
  limit: number
  rate: number
  min: number
  minDueDate: string
  minDaysLeft: number | null
  minPaid: boolean
  minUrg: 'ok' | 'overdue' | 'urgent' | 'soon' | 'normal'
  plannedPayment: {
    amount: number
    isMin: boolean
    name: string
    date: string
  } | null
  thisMonthSpent: number
  thisMonthPaid: boolean
  /** Số transaction dùng thẻ này trong tháng hiện tại */
  thisMonthSpentCount: number
  /** Số paid_obligations khớp thẻ này trong tháng hiện tại */
  thisMonthPaymentCount: number
}

export interface UpcomingItem {
  _key: string
  day: string
  mo: string
  name: string
  sub: string | null
  amt: number
  paid: boolean
  urg: 'ok' | 'overdue' | 'urgent' | 'soon'
  _date: string
  source: 'one_time'
  _id?: number
  overdueDays: number
}

export interface Milestone {
  month: string
  ev: string
  debt: number | null
  st: 'done' | 'active' | 'future'
}

/** TransactionItem là Transaction (đã có field type) */
export type TransactionItem = Transaction

// ─── Utility types ────────────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'syncing' | 'error'
export type LimitStatus = 'safe' | 'warn' | 'over'
export type TrendDirection = 'up' | 'down' | 'neutral'
export type UrgencyLevel = 'ok' | 'overdue' | 'urgent' | 'soon' | 'normal'

/** Result of matching an obligation name to a debt (credit card or loan) */
export type DebtRef = { type: 'cc' | 'sl'; id: string }
