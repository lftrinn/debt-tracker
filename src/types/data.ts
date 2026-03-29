// ─── Primitive data types (stored in JSONBin) ─────────────────────────────

export interface CreditCard {
  id: string
  name: string
  credit_limit: number
  balance: number
  interest_rate_annual: number
  minimum_payment: number
  min_due_date?: string
  /** Ngôn ngữ gốc của tên thẻ */
  nameLang?: 'vi' | 'en' | 'ja'
  /** Bản dịch name sang các ngôn ngữ khác */
  nameI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

export interface SmallLoan {
  id: string
  name: string
  remaining_balance: number
  /** Ngôn ngữ gốc của tên khoản vay */
  nameLang?: 'vi' | 'en' | 'ja'
  /** Bản dịch name sang các ngôn ngữ khác */
  nameI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

export interface Expense {
  id: number
  desc: string
  amount: number
  cat: string
  date: string
  payMethod?: string
  /** Đơn vị tiền của giao dịch — nếu không có, mặc định là base currency của app */
  currency?: string
  /** Internal tag linking an expense to a paid obligation. Format: "ob:<key>" */
  _obTag?: string
  /** Ngôn ngữ gốc khi user nhập desc */
  descLang?: 'vi' | 'en' | 'ja'
  /** Bản dịch desc sang các ngôn ngữ khác — fallback về desc nếu không có */
  descI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

export interface Income {
  id: number
  desc: string
  amount: number
  cat: string
  date: string
  /** Đơn vị tiền của khoản thu — nếu không có, mặc định là base currency của app */
  currency?: string
  /** Ngôn ngữ gốc khi user nhập desc */
  descLang?: 'vi' | 'en' | 'ja'
  /** Bản dịch desc sang các ngôn ngữ khác — fallback về desc nếu không có */
  descI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

export interface Obligation {
  name: string
  amount: number
  category?: string | null
  monthly?: boolean
  /** Normal date field */
  date?: string
  /** Legacy field with trailing space — kept for backward-compat with existing data */
  'date '?: string
  /** Ngôn ngữ gốc của tên obligation */
  nameLang?: 'vi' | 'en' | 'ja'
  /** Bản dịch name sang các ngôn ngữ khác */
  nameI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

export interface OneTimeExpense {
  id: number
  name: string
  date: string
  amount: number
  /** Ngôn ngữ gốc của tên khoản chi */
  nameLang?: 'vi' | 'en' | 'ja'
  /** Bản dịch name sang các ngôn ngữ khác */
  nameI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

export interface MonthlyPlan {
  obligations: Obligation[]
}

/** Một quy tắc trong must_not / must_do — hỗ trợ cả dạng string cũ và object mới có i18n */
export interface RuleItem {
  text: string
  /** Ngôn ngữ gốc của text */
  textLang?: 'vi' | 'en' | 'ja'
  /** Bản dịch text sang các ngôn ngữ khác */
  textI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

// ─── Root app data schema (shape of the JSONBin record) ───────────────────

export interface AppData {
  expenses: Expense[]
  incomes: Income[]
  extra_paid: number
  custom_daily_limit: number
  current_cash: {
    balance: number
    reserved: number
    as_of: string
  }
  debts: {
    credit_cards: CreditCard[]
    small_loans: SmallLoan[]
    summary?: { total: number }
  }
  income: {
    monthly_net: number
    pay_date: number
  }
  rules: {
    daily_limit: { until_salary: number; after_salary: number }
    must_not: Array<string | RuleItem>
    must_do?: Array<string | RuleItem>
  }
  payoff_timeline: {
    projected_debt_by_month: Array<{ month: string; total_debt: number }>
    milestones?: Array<{
      month: string
      event?: string
      /** Bản dịch event sang các ngôn ngữ khác */
      eventI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
    }>
  }
  fixed_expenses?: Record<string, unknown>
  monthly_plans?: Record<string, MonthlyPlan>
  one_time_expenses?: OneTimeExpense[]
  paid_obligations?: string[]
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
}

export interface UpcomingItem {
  _key: string
  day: string
  mo: string
  /** Tên gốc (ngôn ngữ gốc) — dùng để matching/lookup, KHÔNG dùng để hiển thị trực tiếp */
  name: string
  /** Bản dịch name — component tự localize khi render */
  nameI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
  sub: string | null
  amt: number
  paid: boolean
  urg: 'ok' | 'overdue' | 'urgent' | 'soon'
  _date: string
  source: 'monthly_plan' | 'one_time'
  _id?: number
  _mo?: string
  _category?: string | null
  _isLastPeriod?: boolean
  overdueDays: number
}

export interface Milestone {
  month: string
  ev: string
  debt: number | null
  st: 'done' | 'active' | 'future'
}

export interface TransactionItem extends Expense {
  type: 'exp' | 'inc'
}

// ─── Utility types ────────────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'syncing' | 'error'
export type LimitStatus = 'safe' | 'warn' | 'over'
export type TrendDirection = 'up' | 'down' | 'neutral'
export type UrgencyLevel = 'ok' | 'overdue' | 'urgent' | 'soon' | 'normal'

/** Result of matching an obligation name to a debt (credit card or small loan) */
export type DebtRef = { type: 'cc' | 'sl'; id: string }
