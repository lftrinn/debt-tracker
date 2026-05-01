// ═══════════════════════════════════════════════════════════════════════════
// Schema v2 (canonical) — { meta, items[] } trên disk + in memory.
//
// Mọi entity là 1 phần tử của items[], phân biệt qua `type` (discriminated
// union). Dùng type guards (isAccount, isDebt, ...) để narrow Item → subtype
// cụ thể trước khi truy cập field.
// ═══════════════════════════════════════════════════════════════════════════

export type AppLang = 'vi' | 'en' | 'ja'

/** Bản dịch + meta nguồn cho mọi field tự do của user (name, note, ...). */
export type I18nMap = Partial<Record<AppLang, string>>
export type I18nMetaMap = Partial<Record<AppLang, 'auto' | 'manual'>>

/** Field shared bởi mọi item — id duy nhất + tên (có thể đa ngôn ngữ). */
export interface ItemBase {
  id: string
  name: string
  /** Ngôn ngữ gốc khi user nhập name */
  nameLang?: AppLang
  /** Bản dịch name sang các ngôn ngữ khác */
  nameI18n?: I18nMap
  /** Trạng thái bản dịch: 'manual' = user nhập, 'auto' = dịch tự động */
  nameI18nMeta?: I18nMetaMap
  /** Ghi chú dạng plain text (gốc) */
  note?: string | null
  /** Bản dịch ghi chú */
  noteI18n?: I18nMap
}

// ─── Subtype interfaces ──────────────────────────────────────────────────────

/** Tài khoản tiền mặt (current cash balance, e.g. VCB checking). */
export interface AccountItem extends ItemBase {
  type: 'account'
  amount: number
  as_of: string
  issuer?: string | null
  account_last_4?: string | null
  /** Tiền dự trữ (không tính vào availCash) */
  reserved?: number | null
}

/** Nguồn thu định kỳ (lương). */
export interface IncomeRecurringItem extends ItemBase {
  type: 'income'
  amount: number
  per_period: number
  frequency: 'monthly' | 'weekly' | 'yearly'
  due_day_of_month: number
  /** Ngày cụ thể của kỳ đang xét, optional */
  due_date?: string | null
  as_of?: string | null
  issuer?: string | null
}

/** Chi định kỳ (rent, utilities, ...). */
export interface FixedExpenseItem extends ItemBase {
  type: 'fixed_expense'
  amount: number
  per_period: number
  frequency: 'monthly' | 'one_time' | 'weekly' | 'yearly'
  /** Ngày cụ thể của kỳ này (nếu là instance đã spawn) */
  due_date?: string | null
  /** Ngày trong tháng (nếu là template recurring) */
  due_day_of_month?: number | null
  cat?: string | null
}

/** Chi 1 lần xác định (học phí, sinh nhật, ...). */
export interface OneTimeExpenseItem extends ItemBase {
  type: 'one_time_expense'
  amount: number
  due_date: string
  frequency: 'one_time'
  due_day_of_month?: number | null
  cat?: string | null
}

/** Thẻ tín dụng hoặc khoản vay. credit_limit !== null ⇒ thẻ tín dụng. */
export interface DebtItem extends ItemBase {
  type: 'debt'
  amount: number
  credit_limit: number | null
  available_credit: number | null
  minimum_payment: number
  apr: number
  monthly_rate: number
  frequency: 'monthly'
  due_date?: string | null
  due_day_of_month?: number | null
  statement_day_of_month?: number | null
  as_of?: string | null
  issuer?: string | null
  account_last_4?: string | null
  /** Loan-only: số kỳ đã spawn còn lại (HD Saison, Shopee installments) */
  per_period?: number | null
  periods_remaining?: number | null
  ends_on?: string | null
  /** Ưu tiên trả nợ (cao = ưu tiên). 0 = baseline. */
  priority_score?: number | null
  severity?: 'low' | 'medium' | 'high' | null
  children: HiddenInstallmentItem[]
}

/** BNPL/subscription installment lồng trong DebtItem.children[]. */
export interface HiddenInstallmentItem extends ItemBase {
  type: 'hidden_installment'
  amount: number
  per_period: number
  periods_remaining: number
  frequency: 'monthly' | 'weekly'
  due_day_of_month: number
  statement_day_of_month?: number | null
  ends_on?: string | null
  as_of?: string | null
  issuer?: string | null
  /** Cannot cancel (Claude.ai subscription, etc.) */
  non_cancellable?: boolean | null
}

/** Quy tắc vận hành (must_not / must_do). */
export interface RuleEntryItem extends ItemBase {
  type: 'rule'
  severity: 'low' | 'medium' | 'high'
  /** Buffer floor amount, optional */
  amount?: number | null
}

/** Cảnh báo rủi ro. */
export interface RiskItem extends ItemBase {
  type: 'risk'
  severity: 'low' | 'medium' | 'high'
  amount?: number | null
  credit_limit?: number | null
  available_credit?: number | null
  as_of?: string | null
  issuer?: string | null
  account_last_4?: string | null
  non_cancellable?: boolean | null
  priority_score?: number | null
}

/** Mốc trên lộ đồ phi thăng (debt cleared, etc.). */
export interface MilestoneItem extends ItemBase {
  type: 'milestone'
  due_date: string
}

/** Giao dịch chi đã xảy ra (lịch sử). */
export interface ExpenseLogItem extends ItemBase {
  type: 'expense_log'
  amount: number
  cat: string
  /** Ngày giao dịch (YYYY-MM-DD). Dùng `due_date` để đồng nhất với items khác. */
  due_date: string
  pay_method?: string | null
  currency?: string | null
  time?: string | null
  /** Liên kết tới fixed_expense / one_time_expense / debt — khi log này là payment. */
  ref_id?: string | null
}

/** Giao dịch thu đã xảy ra (lịch sử). */
export interface IncomeLogItem extends ItemBase {
  type: 'income_log'
  amount: number
  cat: string
  due_date: string
  currency?: string | null
  time?: string | null
}

/**
 * Bản ghi thanh toán nghĩa vụ (thay thế `paid_obligations: string[]` legacy).
 * Mỗi lần user mark paid 1 obligation/upcoming → tạo 1 PaymentRecord.
 *
 * - `ref_id` trỏ về DebtItem.id hoặc OneTimeExpenseItem.id hoặc FixedExpenseItem.id
 * - `key` lưu format `"YYYY-MM-DD:Name"` legacy để match với obligation cụ thể
 *   trong cùng tháng (do FixedExpense template recurring không có id riêng cho
 *   từng kỳ, ta dùng ngày + tên làm dedup key)
 * - Khi un-mark → xoá PaymentRecord tương ứng
 */
export interface PaymentRecordItem extends ItemBase {
  type: 'payment_record'
  amount: number
  due_date: string
  /** Dedup key: `"YYYY-MM-DD:ObligationName"` */
  key: string
  /** ID của entity được thanh toán: debt id / one_time_expense id / fixed_expense id (nullable cho payment ngoài plan) */
  ref_id: string | null
  /** Loại entity được thanh toán */
  ref_type: 'debt' | 'one_time_expense' | 'fixed_expense' | null
}

// ─── Discriminated union + ItemType ──────────────────────────────────────────

export type Item =
  | AccountItem
  | IncomeRecurringItem
  | FixedExpenseItem
  | OneTimeExpenseItem
  | DebtItem
  | HiddenInstallmentItem
  | RuleEntryItem
  | RiskItem
  | MilestoneItem
  | ExpenseLogItem
  | IncomeLogItem
  | PaymentRecordItem

export type ItemType = Item['type']

// ─── Type guards (use these, never raw `i.type === 'x'` casts) ────────────────

export const isAccount = (i: Item): i is AccountItem => i.type === 'account'
export const isIncomeRecurring = (i: Item): i is IncomeRecurringItem => i.type === 'income'
export const isFixedExpense = (i: Item): i is FixedExpenseItem => i.type === 'fixed_expense'
export const isOneTimeExpense = (i: Item): i is OneTimeExpenseItem => i.type === 'one_time_expense'
export const isDebt = (i: Item): i is DebtItem => i.type === 'debt'
/** Debt với credit_limit !== null = thẻ tín dụng. */
export const isCreditCard = (i: Item): i is DebtItem & { credit_limit: number } =>
  i.type === 'debt' && i.credit_limit != null
/** Debt với credit_limit == null = small loan / installment loan. */
export const isSmallLoan = (i: Item): i is DebtItem & { credit_limit: null } =>
  i.type === 'debt' && i.credit_limit == null
export const isHiddenInstallment = (i: Item): i is HiddenInstallmentItem => i.type === 'hidden_installment'
export const isRule = (i: Item): i is RuleEntryItem => i.type === 'rule'
export const isRisk = (i: Item): i is RiskItem => i.type === 'risk'
export const isMilestone = (i: Item): i is MilestoneItem => i.type === 'milestone'
export const isExpenseLog = (i: Item): i is ExpenseLogItem => i.type === 'expense_log'
export const isIncomeLog = (i: Item): i is IncomeLogItem => i.type === 'income_log'
export const isPaymentRecord = (i: Item): i is PaymentRecordItem => i.type === 'payment_record'

// ─── Factory functions (per-type, returns subtype) ────────────────────────────

export function mkAccount(id: string, name: string, init?: Partial<Omit<AccountItem, 'id' | 'type' | 'name'>>): AccountItem {
  return { id, type: 'account', name, amount: 0, as_of: '', ...init }
}
export function mkIncomeRecurring(id: string, name: string, init?: Partial<Omit<IncomeRecurringItem, 'id' | 'type' | 'name'>>): IncomeRecurringItem {
  return { id, type: 'income', name, amount: 0, per_period: 0, frequency: 'monthly', due_day_of_month: 1, ...init }
}
export function mkFixedExpense(id: string, name: string, init?: Partial<Omit<FixedExpenseItem, 'id' | 'type' | 'name'>>): FixedExpenseItem {
  return { id, type: 'fixed_expense', name, amount: 0, per_period: 0, frequency: 'monthly', ...init }
}
export function mkOneTimeExpense(id: string, name: string, init?: Partial<Omit<OneTimeExpenseItem, 'id' | 'type' | 'name'>>): OneTimeExpenseItem {
  return { id, type: 'one_time_expense', name, amount: 0, due_date: '', frequency: 'one_time', ...init }
}
export function mkDebt(id: string, name: string, init?: Partial<Omit<DebtItem, 'id' | 'type' | 'name' | 'children'>> & { children?: HiddenInstallmentItem[] }): DebtItem {
  return {
    id, type: 'debt', name,
    amount: 0, credit_limit: null, available_credit: null,
    minimum_payment: 0, apr: 0, monthly_rate: 0,
    frequency: 'monthly', children: [],
    ...init,
  }
}
export function mkHiddenInstallment(id: string, name: string, init?: Partial<Omit<HiddenInstallmentItem, 'id' | 'type' | 'name'>>): HiddenInstallmentItem {
  return { id, type: 'hidden_installment', name, amount: 0, per_period: 0, periods_remaining: 0, frequency: 'monthly', due_day_of_month: 1, ...init }
}
export function mkRule(id: string, name: string, init?: Partial<Omit<RuleEntryItem, 'id' | 'type' | 'name'>>): RuleEntryItem {
  return { id, type: 'rule', name, severity: 'medium', ...init }
}
export function mkRisk(id: string, name: string, init?: Partial<Omit<RiskItem, 'id' | 'type' | 'name'>>): RiskItem {
  return { id, type: 'risk', name, severity: 'medium', ...init }
}
export function mkMilestone(id: string, name: string, init?: Partial<Omit<MilestoneItem, 'id' | 'type' | 'name'>>): MilestoneItem {
  return { id, type: 'milestone', name, due_date: '', ...init }
}
export function mkExpenseLog(id: string, name: string, init?: Partial<Omit<ExpenseLogItem, 'id' | 'type' | 'name'>>): ExpenseLogItem {
  return { id, type: 'expense_log', name, amount: 0, cat: 'khac', due_date: '', ...init }
}
export function mkIncomeLog(id: string, name: string, init?: Partial<Omit<IncomeLogItem, 'id' | 'type' | 'name'>>): IncomeLogItem {
  return { id, type: 'income_log', name, amount: 0, cat: 'khac_thu', due_date: '', ...init }
}
export function mkPaymentRecord(id: string, name: string, init?: Partial<Omit<PaymentRecordItem, 'id' | 'type' | 'name'>>): PaymentRecordItem {
  return { id, type: 'payment_record', name, amount: 0, due_date: '', key: '', ref_id: null, ref_type: null, ...init }
}

// ─── Meta ───────────────────────────────────────────────────────────────────

/**
 * Metadata cấp app. Phase 1 promote `projected_debt_by_month` + `debt_summary_total`
 * từ stash hack thành typed fields. `paid_obligations` đã chuyển sang
 * PaymentRecordItem (Phase 3).
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

  daily_limit: { until_salary: number; after_salary: number }
  custom_daily_limit: number
  extra_paid: number

  /** Snapshot dự đoán nợ tổng theo tháng (đầu vào projection, không derive được). */
  projected_debt_by_month: Array<{ month: string; total_debt: number }>
  /** Tổng nợ ban đầu — dùng làm mốc tính repayPct. */
  debt_summary_total: number
}

// ─── AppData root ────────────────────────────────────────────────────────────

/**
 * Root data structure. Phase 4 cleanup đã xoá các legacy derived view —
 * mọi reader/writer thao tác trực tiếp trên `items[]` qua `useItems()` helper.
 */
export interface AppData {
  meta: Meta
  items: Item[]
}

// ─── Derived / computed types (UI shapes, NOT stored) ─────────────────────────

/** Shape DebtItem được enrich cho EnemyRow + DebtCards UI. */
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
  thisMonthSpentCount: number
  thisMonthPaymentCount: number
}

export interface UpcomingItem {
  _key: string
  day: string
  mo: string
  /** Tên gốc (ngôn ngữ gốc) — dùng để matching/lookup, KHÔNG dùng để hiển thị trực tiếp */
  name: string
  nameI18n?: I18nMap
  nameI18nMeta?: I18nMetaMap
  sub: string | null
  amt: number
  paid: boolean
  urg: 'ok' | 'overdue' | 'urgent' | 'soon'
  _date: string
  source: 'fixed_expense' | 'one_time_expense' | 'debt_minimum'
  /** ID của Item gốc trong items[] (Item.id) */
  _id: string
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

/** Transaction view (gộp expense_log + income_log) cho TransactionList. */
export interface TransactionItem {
  id: string
  type: 'exp' | 'inc'
  desc: string
  amount: number
  cat: string
  date: string
  pay_method?: string | null
  currency?: string | null
  time?: string | null
  note?: string | null
  ref_id?: string | null
  /** Phục vụ i18n dịch desc */
  descLang?: AppLang
  descI18n?: I18nMap
  descI18nMeta?: I18nMetaMap
}

// ─── Utility types ────────────────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'syncing' | 'error'
export type LimitStatus = 'safe' | 'warn' | 'over'
export type TrendDirection = 'up' | 'down' | 'neutral'
export type UrgencyLevel = 'ok' | 'overdue' | 'urgent' | 'soon' | 'normal'

/** Result of matching an obligation name to a debt (credit card or small loan) */
export type DebtRef = { type: 'cc' | 'sl'; id: string }
