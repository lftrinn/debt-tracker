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
  /** Trạng thái bản dịch: 'manual' = user tự nhập, 'auto' = đã dịch tự động */
  descI18nMeta?: Partial<Record<'vi' | 'en' | 'ja', 'auto' | 'manual'>>
  /** Ghi chú tùy chọn */
  note?: string
  /** Giờ cụ thể (HH:mm) */
  time?: string
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
  /** Trạng thái bản dịch: 'manual' = user tự nhập, 'auto' = đã dịch tự động */
  descI18nMeta?: Partial<Record<'vi' | 'en' | 'ja', 'auto' | 'manual'>>
  /** Ghi chú tùy chọn */
  note?: string
  /** Giờ cụ thể (HH:mm) */
  time?: string
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
  /** Trạng thái bản dịch: 'manual' = user tự nhập, 'auto' = đã dịch tự động */
  nameI18nMeta?: Partial<Record<'vi' | 'en' | 'ja', 'auto' | 'manual'>>
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
  /** Trạng thái bản dịch: 'manual' = user tự nhập, 'auto' = đã dịch tự động */
  nameI18nMeta?: Partial<Record<'vi' | 'en' | 'ja', 'auto' | 'manual'>>
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

// ═══ V2 SCHEMA · Unified items[] + meta (Phase 11) ═══════════════════════

/**
 * Discriminator type cho mọi entity trong items[]. Switch theo `type` để hiểu
 * fields nào meaningful cho item đó.
 */
export type ItemType =
  | 'account'             // Tài khoản (current cash balance, e.g. vcb_checking)
  | 'income'              // Recurring income source (salary plan)
  | 'fixed_expense'       // Recurring expense plan (rent, utilities)
  | 'one_time_expense'    // Specific upcoming expense (tuition, party)
  | 'debt'                // Credit card or loan
  | 'hidden_installment'  // BNPL/subscription bên trong debt (children)
  | 'rule'                // Operational rule (must_not, buffer, etc.)
  | 'risk'                // Risk warning
  | 'milestone'           // Target date for clearing debt
  | 'expense_log'         // [A1] Recorded expense transaction (tx history)
  | 'income_log'          // [A1] Recorded income transaction

/**
 * Unified item shape · "All entries share one object shape".
 * Fields not relevant cho a given type are null.
 */
export interface Item {
  id: string
  type: ItemType
  name: string
  issuer: string | null
  account_last_4: string | null
  amount: number | null
  credit_limit: number | null
  available_credit: number | null
  minimum_payment: number | null
  apr: number | null
  monthly_rate: number | null
  per_period: number | null
  periods_remaining: number | null
  frequency: 'monthly' | 'one_time' | 'weekly' | 'yearly' | null
  due_day_of_month: number | null
  statement_day_of_month: number | null
  due_date: string | null
  ends_on: string | null
  as_of: string | null
  priority_score: number | null
  non_cancellable: boolean | null
  severity: 'low' | 'medium' | 'high' | null
  note: string | null
  children: Item[]

  // Phase 11 extensions for transaction logs (expense_log/income_log)
  cat?: string | null
  pay_method?: string | null
  currency?: string | null
  time?: string | null
  /** [B2] Reference đến debt id khi item là expense_log của payment */
  ref_id?: string | null

  // Preserve i18n design fields (Phase 0+ design additions)
  nameLang?: 'vi' | 'en' | 'ja'
  nameI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
  nameI18nMeta?: Partial<Record<'vi' | 'en' | 'ja', 'auto' | 'manual'>>
  noteI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
}

/**
 * App-level metadata. [C1] daily_limit di chuyển từ rules sang meta.
 */
export interface Meta {
  owner: string
  currency: 'VND' | 'USD' | 'JPY'
  generated_at: string
  as_of_month: string
  strategy: string
  strategy_note: string
  debt_free_target: string
  schema_note: string

  // [C1] daily_limit ở meta thay vì rules
  daily_limit: { until_salary: number; after_salary: number }
  custom_daily_limit: number
  extra_paid: number
}

// ─── Root app data schema (Phase 11 hybrid: v2 fields + derived legacy views) ─

/**
 * AppData v2 = { meta, items[] } trên disk (JSONBin serialization).
 * Trong memory cũng giữ legacy fields (expenses, debts, etc.) như DERIVED views,
 * tự động sync sau pull/push qua useV2Adapter để composables không phải refactor.
 */
export interface AppData {
  // V2 source-of-truth fields (Phase 11)
  meta?: Meta
  items?: Item[]

  // Legacy derived views (populated by applyV2ToLegacy after pull)
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
  /** Số expense dùng thẻ này trong tháng hiện tại */
  thisMonthSpentCount: number
  /** Số paid_obligations khớp thẻ này trong tháng hiện tại */
  thisMonthPaymentCount: number
}

export interface UpcomingItem {
  _key: string
  day: string
  mo: string
  /** Tên gốc (ngôn ngữ gốc) — dùng để matching/lookup, KHÔNG dùng để hiển thị trực tiếp */
  name: string
  /** Bản dịch name — component tự localize khi render */
  nameI18n?: Partial<Record<'vi' | 'en' | 'ja', string>>
  /** Trạng thái bản dịch: 'manual' = user tự nhập, 'auto' = đã dịch tự động */
  nameI18nMeta?: Partial<Record<'vi' | 'en' | 'ja', 'auto' | 'manual'>>
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
