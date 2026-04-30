/**
 * useV2Adapter — adapter giữa schema cũ (legacy AppData) và schema v2 (meta + items[]).
 *
 * Strategy: items[] là source of truth khi serialize lên JSONBin. Trong memory
 * cùng giữ legacy fields (expenses, debts, etc.) như derived views để composables
 * không phải refactor.
 *
 * 3 functions chính:
 * - isV2Schema(raw): detect data đã ở v2 chưa
 * - migrateLegacyToV2(legacy): convert legacy → v2 (lần đầu pull data cũ)
 * - applyV2ToLegacy(data): derive legacy fields từ items[]+meta (sau pull)
 * - syncItemsFromLegacy(data): rebuild items[] từ legacy (trước push)
 *   · Preserve risks/hidden_installments/extra fields qua id lookup
 *
 * Quyết định user (A1/B2/C1):
 * - A1: expense_log + income_log là items types mới cho transactions
 * - B2: payments tạo expense_log với cat='pay' + ref_id (tạm thời preserve
 *       paid_obligations trong meta để không mất tracking; future phase derive từ items)
 * - C1: daily_limit di chuyển vào meta
 */

import type {
  AppData,
  CreditCard,
  Expense,
  Income,
  Item,
  ItemType,
  Meta,
  MonthlyPlan,
  OneTimeExpense,
  Obligation,
  RuleItem,
  SmallLoan,
} from '@/types/data'

const DEFAULT_META: Meta = {
  owner: '',
  currency: 'VND',
  generated_at: '',
  as_of_month: '',
  strategy: 'avalanche_modified',
  strategy_note: '',
  debt_free_target: '',
  schema_note:
    "All entries share one object shape. Fields not relevant to a given type are null. The 'children' array uses the same object shape recursively. Switch on 'type' to interpret which fields are meaningful.",
  daily_limit: { until_salary: 70000, after_salary: 100000 },
  custom_daily_limit: 0,
  extra_paid: 0,
}

/** Empty Item template — tất cả fields null trừ id/type/name/children. */
export function blankItem(id: string, type: ItemType, name: string): Item {
  return {
    id,
    type,
    name,
    issuer: null,
    account_last_4: null,
    amount: null,
    credit_limit: null,
    available_credit: null,
    minimum_payment: null,
    apr: null,
    monthly_rate: null,
    per_period: null,
    periods_remaining: null,
    frequency: null,
    due_day_of_month: null,
    statement_day_of_month: null,
    due_date: null,
    ends_on: null,
    as_of: null,
    priority_score: null,
    non_cancellable: null,
    severity: null,
    note: null,
    children: [],
  }
}

/** True khi data có shape v2 (items[] + meta object). */
export function isV2Schema(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  return Array.isArray(obj.items) && typeof obj.meta === 'object' && obj.meta !== null
}

// ═══ MIGRATE legacy → v2 ═══════════════════════════════════════════════════

/**
 * Convert legacy AppData → v2 shape (meta + items + derived legacy fields).
 * Chạy 1 lần khi pull data legacy lần đầu.
 */
export function migrateLegacyToV2(legacy: AppData): AppData {
  const items: Item[] = []
  const today = new Date().toISOString().slice(0, 10)

  // 1. Account from current_cash
  if (legacy.current_cash) {
    const acc = blankItem('cash_balance', 'account', 'Tiền mặt')
    acc.amount = legacy.current_cash.balance
    acc.as_of = legacy.current_cash.as_of || today
    items.push(acc)
  }

  // 2. Income recurring from legacy.income
  if (legacy.income) {
    const inc = blankItem('income_recurring', 'income', 'Lương tháng')
    inc.amount = legacy.income.monthly_net
    inc.per_period = legacy.income.monthly_net
    inc.frequency = 'monthly'
    inc.due_day_of_month = legacy.income.pay_date
    items.push(inc)
  }

  // 3. Credit cards as debt
  for (const c of legacy.debts?.credit_cards || []) {
    const item = blankItem(c.id, 'debt', c.name)
    item.amount = c.balance
    item.credit_limit = c.credit_limit
    item.available_credit = (c.credit_limit || 0) - (c.balance || 0)
    item.minimum_payment = c.minimum_payment
    item.apr = c.interest_rate_annual
    item.monthly_rate = c.interest_rate_annual ? c.interest_rate_annual / 12 : null
    item.frequency = 'monthly'
    item.due_date = c.min_due_date || null
    if (c.nameLang) item.nameLang = c.nameLang
    if (c.nameI18n) item.nameI18n = c.nameI18n
    items.push(item)
  }

  // 4. Small loans as debt (no credit_limit)
  for (const l of legacy.debts?.small_loans || []) {
    const item = blankItem(l.id, 'debt', l.name)
    item.amount = l.remaining_balance
    if (l.nameLang) item.nameLang = l.nameLang
    if (l.nameI18n) item.nameI18n = l.nameI18n
    items.push(item)
  }

  // 5. Expenses as expense_log
  for (const e of legacy.expenses || []) {
    const item = blankItem(`tx_e_${e.id}`, 'expense_log', e.desc)
    item.amount = e.amount
    item.cat = e.cat
    item.due_date = e.date
    item.pay_method = e.payMethod ?? null
    item.currency = e.currency ?? null
    item.time = e.time ?? null
    item.note = e.note ?? null
    if (e._obTag) item.ref_id = e._obTag
    if (e.descLang) item.nameLang = e.descLang
    if (e.descI18n) item.nameI18n = e.descI18n
    if (e.descI18nMeta) item.nameI18nMeta = e.descI18nMeta
    items.push(item)
  }

  // 6. Incomes as income_log
  for (const i of legacy.incomes || []) {
    const item = blankItem(`tx_i_${i.id}`, 'income_log', i.desc)
    item.amount = i.amount
    item.cat = i.cat
    item.due_date = i.date
    item.currency = i.currency ?? null
    item.time = i.time ?? null
    item.note = i.note ?? null
    if (i.descLang) item.nameLang = i.descLang
    if (i.descI18n) item.nameI18n = i.descI18n
    if (i.descI18nMeta) item.nameI18nMeta = i.descI18nMeta
    items.push(item)
  }

  // 7. One-time expenses
  for (const ote of legacy.one_time_expenses || []) {
    const item = blankItem(`ote_${ote.id}`, 'one_time_expense', ote.name)
    item.amount = ote.amount
    item.due_date = ote.date
    item.frequency = 'one_time'
    if (ote.nameLang) item.nameLang = ote.nameLang
    if (ote.nameI18n) item.nameI18n = ote.nameI18n
    if (ote.nameI18nMeta) item.nameI18nMeta = ote.nameI18nMeta
    items.push(item)
  }

  // 8. Monthly plans → fixed_expense items (per obligation)
  let planCounter = 0
  for (const [month, plan] of Object.entries(legacy.monthly_plans || {})) {
    for (const ob of plan.obligations) {
      const id = `plan_${month}_${planCounter++}`
      const item = blankItem(id, 'fixed_expense', ob.name)
      item.amount = ob.amount
      item.per_period = ob.amount
      item.due_date = ob.date || ob['date '] || null
      item.frequency = ob.monthly ? 'monthly' : 'one_time'
      if (ob.category) item.cat = ob.category
      if (ob.nameLang) item.nameLang = ob.nameLang
      if (ob.nameI18n) item.nameI18n = ob.nameI18n
      if (ob.nameI18nMeta) item.nameI18nMeta = ob.nameI18nMeta
      items.push(item)
    }
  }

  // 9. Rules
  let ruleCounter = 0
  for (const r of legacy.rules?.must_not || []) {
    const text = typeof r === 'string' ? r : r.text
    const id = `rule_must_not_${ruleCounter++}`
    const item = blankItem(id, 'rule', text)
    item.severity = 'high'
    if (typeof r === 'object' && r.textLang) item.nameLang = r.textLang
    if (typeof r === 'object' && r.textI18n) item.nameI18n = r.textI18n
    items.push(item)
  }
  for (const r of legacy.rules?.must_do || []) {
    const text = typeof r === 'string' ? r : r.text
    const id = `rule_must_do_${ruleCounter++}`
    const item = blankItem(id, 'rule', text)
    item.severity = 'medium'
    if (typeof r === 'object' && r.textLang) item.nameLang = r.textLang
    if (typeof r === 'object' && r.textI18n) item.nameI18n = r.textI18n
    items.push(item)
  }

  // 10. Milestones
  for (const m of legacy.payoff_timeline?.milestones || []) {
    const id = `milestone_${m.month}`
    const item = blankItem(id, 'milestone', m.event || `Milestone ${m.month}`)
    item.due_date = m.month + '-15'
    if (m.eventI18n) item.nameI18n = m.eventI18n
    items.push(item)
  }

  // Build meta
  const meta: Meta = {
    ...DEFAULT_META,
    owner: 'User',
    currency: 'VND',
    generated_at: today,
    as_of_month: today.slice(0, 7),
    daily_limit: legacy.rules?.daily_limit ?? DEFAULT_META.daily_limit,
    custom_daily_limit: legacy.custom_daily_limit ?? 0,
    extra_paid: legacy.extra_paid ?? 0,
  }

  // Stash paid_obligations + projected_debt_by_month + summary in meta-extras
  // (preserve cho round-trip dù không native v2)
  ;(meta as Meta & { paid_obligations?: string[] }).paid_obligations =
    legacy.paid_obligations ?? []
  ;(meta as Meta & { projected_debt_by_month?: Array<{ month: string; total_debt: number }> }).projected_debt_by_month =
    legacy.payoff_timeline?.projected_debt_by_month ?? []
  ;(meta as Meta & { debt_summary_total?: number }).debt_summary_total =
    legacy.debts?.summary?.total ?? 0

  const result: AppData = {
    ...legacy,
    meta,
    items,
  }
  return applyV2ToLegacy(result)
}

// ═══ APPLY v2 → legacy (derive views after pull) ═══════════════════════════

/**
 * Derive legacy fields từ items[] + meta. Mutate input data.
 * Gọi sau pull (hoặc sau migrate) để composables có legacy shape sẵn dùng.
 */
export function applyV2ToLegacy(data: AppData): AppData {
  if (!data.items || !data.meta) return data
  const items = data.items
  const meta = data.meta as Meta & {
    paid_obligations?: string[]
    projected_debt_by_month?: Array<{ month: string; total_debt: number }>
    debt_summary_total?: number
  }

  // expenses ← expense_log (cat !== 'pay' to keep payments separate)
  data.expenses = items
    .filter((i) => i.type === 'expense_log')
    .map((i) => itemToExpense(i))

  // incomes ← income_log
  data.incomes = items
    .filter((i) => i.type === 'income_log')
    .map((i) => itemToIncome(i))

  // debts.credit_cards ← debt items có credit_limit
  data.debts = data.debts || { credit_cards: [], small_loans: [] }
  data.debts.credit_cards = items
    .filter((i) => i.type === 'debt' && i.credit_limit != null)
    .map((i) => itemToCreditCard(i))
  data.debts.small_loans = items
    .filter((i) => i.type === 'debt' && i.credit_limit == null)
    .map((i) => itemToSmallLoan(i))
  if (meta.debt_summary_total != null) {
    data.debts.summary = { total: meta.debt_summary_total }
  }

  // current_cash ← account[primary]
  const account = items.find((i) => i.type === 'account')
  data.current_cash = {
    balance: account?.amount ?? 0,
    reserved: 0,
    as_of: account?.as_of ?? '',
  }

  // income ← income recurring
  const incRec = items.find((i) => i.type === 'income' && i.frequency === 'monthly')
  data.income = {
    monthly_net: incRec?.amount ?? 0,
    pay_date: incRec?.due_day_of_month ?? 5,
  }

  // rules ← rule items + meta.daily_limit
  const ruleItems = items.filter((i) => i.type === 'rule')
  data.rules = {
    daily_limit: meta.daily_limit ?? DEFAULT_META.daily_limit,
    must_not: ruleItems
      .filter((i) => i.severity !== 'medium')
      .map((i) => ruleToRuleItem(i)),
    must_do: ruleItems
      .filter((i) => i.severity === 'medium')
      .map((i) => ruleToRuleItem(i)),
  }

  // payoff_timeline ← milestones + projected
  data.payoff_timeline = {
    projected_debt_by_month: meta.projected_debt_by_month ?? [],
    milestones: items
      .filter((i) => i.type === 'milestone')
      .map((i) => ({
        month: i.due_date ? i.due_date.slice(0, 7) : '',
        event: i.name,
        eventI18n: i.nameI18n,
      })),
  }

  // one_time_expenses ← one_time_expense items
  data.one_time_expenses = items
    .filter((i) => i.type === 'one_time_expense')
    .map((i) => itemToOneTimeExpense(i))

  // monthly_plans ← fixed_expense items grouped by month
  const plans: Record<string, MonthlyPlan> = {}
  for (const i of items.filter((it) => it.type === 'fixed_expense')) {
    const mo = (i.due_date ?? '').slice(0, 7) || meta.as_of_month
    if (!plans[mo]) plans[mo] = { obligations: [] }
    plans[mo].obligations.push(itemToObligation(i))
  }
  // Phase 11.6 fix: thêm debt items' minimum_payment vào monthly_plans để
  // useUpcoming có thể hiển thị (cả credit_cards lẫn small_loans như shopee/hd).
  // Synthesized obligations dùng category='debt_minimum' → syncItemsFromLegacy
  // sẽ skip để tránh duplicate khi push.
  for (const i of items.filter((it) => it.type === 'debt')) {
    if (!i.due_date || !i.minimum_payment) continue
    const mo = i.due_date.slice(0, 7)
    if (!plans[mo]) plans[mo] = { obligations: [] }
    const ob: Obligation = {
      name: i.name + ' minimum',
      amount: i.minimum_payment,
      category: 'debt_minimum',
      monthly: false,
      date: i.due_date,
    }
    if (i.nameLang) ob.nameLang = i.nameLang
    if (i.nameI18n) ob.nameI18n = i.nameI18n
    plans[mo].obligations.push(ob)
  }
  data.monthly_plans = plans

  // paid_obligations ← from meta (B2 partial: future deriving from expense_log items)
  data.paid_obligations = meta.paid_obligations ?? []

  // extra_paid + custom_daily_limit ← meta
  data.extra_paid = meta.extra_paid ?? 0
  data.custom_daily_limit = meta.custom_daily_limit ?? 0

  return data
}

// ═══ SYNC legacy → items[] (rebuild before push) ══════════════════════════

/**
 * Rebuild items[] từ legacy fields. Preserve risks + hidden_installments + extra
 * fields (priority_score, severity, statement_day_of_month, etc.) qua id lookup
 * từ existing items[].
 */
export function syncItemsFromLegacy(data: AppData): AppData {
  if (!data.meta) data.meta = { ...DEFAULT_META, generated_at: new Date().toISOString().slice(0, 10) }

  const existing = data.items || []
  const existingMap = new Map(existing.map((i) => [i.id, i]))
  const newItems: Item[] = []

  // Helper: merge với existing để preserve extra fields (priority_score, severity, etc.)
  const mergeWithExisting = (newItem: Item): Item => {
    const old = existingMap.get(newItem.id)
    if (!old) return newItem
    return {
      ...newItem,
      issuer: newItem.issuer ?? old.issuer,
      account_last_4: newItem.account_last_4 ?? old.account_last_4,
      available_credit: newItem.available_credit ?? old.available_credit,
      monthly_rate: newItem.monthly_rate ?? old.monthly_rate,
      per_period: newItem.per_period ?? old.per_period,
      periods_remaining: newItem.periods_remaining ?? old.periods_remaining,
      statement_day_of_month: newItem.statement_day_of_month ?? old.statement_day_of_month,
      ends_on: newItem.ends_on ?? old.ends_on,
      as_of: newItem.as_of ?? old.as_of,
      priority_score: newItem.priority_score ?? old.priority_score,
      non_cancellable: newItem.non_cancellable ?? old.non_cancellable,
      severity: newItem.severity ?? old.severity,
      children: newItem.children.length > 0 ? newItem.children : old.children,
    }
  }

  // Account
  if (data.current_cash) {
    const acc = blankItem('cash_balance', 'account', 'Tiền mặt')
    acc.amount = data.current_cash.balance
    acc.as_of = data.current_cash.as_of || null
    newItems.push(mergeWithExisting(acc))
  }

  // Income recurring
  if (data.income) {
    const inc = blankItem('income_recurring', 'income', 'Lương tháng')
    inc.amount = data.income.monthly_net
    inc.per_period = data.income.monthly_net
    inc.frequency = 'monthly'
    inc.due_day_of_month = data.income.pay_date
    newItems.push(mergeWithExisting(inc))
  }

  // Debts
  for (const c of data.debts?.credit_cards || []) {
    const item = blankItem(c.id, 'debt', c.name)
    item.amount = c.balance
    item.credit_limit = c.credit_limit
    item.available_credit = (c.credit_limit || 0) - (c.balance || 0)
    item.minimum_payment = c.minimum_payment
    item.apr = c.interest_rate_annual
    item.monthly_rate = c.interest_rate_annual ? c.interest_rate_annual / 12 : null
    item.frequency = 'monthly'
    item.due_date = c.min_due_date || null
    if (c.nameLang) item.nameLang = c.nameLang
    if (c.nameI18n) item.nameI18n = c.nameI18n
    newItems.push(mergeWithExisting(item))
  }
  for (const l of data.debts?.small_loans || []) {
    const item = blankItem(l.id, 'debt', l.name)
    item.amount = l.remaining_balance
    if (l.nameLang) item.nameLang = l.nameLang
    if (l.nameI18n) item.nameI18n = l.nameI18n
    newItems.push(mergeWithExisting(item))
  }

  // Expenses + incomes (logs)
  for (const e of data.expenses || []) {
    const item = blankItem(`tx_e_${e.id}`, 'expense_log', e.desc)
    item.amount = e.amount
    item.cat = e.cat
    item.due_date = e.date
    item.pay_method = e.payMethod ?? null
    item.currency = e.currency ?? null
    item.time = e.time ?? null
    item.note = e.note ?? null
    if (e._obTag) item.ref_id = e._obTag
    if (e.descLang) item.nameLang = e.descLang
    if (e.descI18n) item.nameI18n = e.descI18n
    if (e.descI18nMeta) item.nameI18nMeta = e.descI18nMeta
    newItems.push(item)
  }
  for (const i of data.incomes || []) {
    const item = blankItem(`tx_i_${i.id}`, 'income_log', i.desc)
    item.amount = i.amount
    item.cat = i.cat
    item.due_date = i.date
    item.currency = i.currency ?? null
    item.time = i.time ?? null
    item.note = i.note ?? null
    if (i.descLang) item.nameLang = i.descLang
    if (i.descI18n) item.nameI18n = i.descI18n
    if (i.descI18nMeta) item.nameI18nMeta = i.descI18nMeta
    newItems.push(item)
  }

  // One-time expenses
  for (const ote of data.one_time_expenses || []) {
    const item = blankItem(`ote_${ote.id}`, 'one_time_expense', ote.name)
    item.amount = ote.amount
    item.due_date = ote.date
    item.frequency = 'one_time'
    if (ote.nameLang) item.nameLang = ote.nameLang
    if (ote.nameI18n) item.nameI18n = ote.nameI18n
    if (ote.nameI18nMeta) item.nameI18nMeta = ote.nameI18nMeta
    newItems.push(mergeWithExisting(item))
  }

  // Monthly plans → fixed_expense
  // Skip synthesized debt_minimum obligations (derived from debt items in
  // applyV2ToLegacy) để tránh duplicate khi sync ngược.
  let planCounter = 0
  for (const [month, plan] of Object.entries(data.monthly_plans || {})) {
    for (const ob of plan.obligations) {
      if (ob.category === 'debt_minimum') continue
      const id = `plan_${month}_${planCounter++}`
      const item = blankItem(id, 'fixed_expense', ob.name)
      item.amount = ob.amount
      item.per_period = ob.amount
      item.due_date = ob.date || ob['date '] || null
      item.frequency = ob.monthly ? 'monthly' : 'one_time'
      if (ob.category) item.cat = ob.category
      if (ob.nameLang) item.nameLang = ob.nameLang
      if (ob.nameI18n) item.nameI18n = ob.nameI18n
      if (ob.nameI18nMeta) item.nameI18nMeta = ob.nameI18nMeta
      newItems.push(mergeWithExisting(item))
    }
  }

  // Rules
  let ruleCounter = 0
  for (const r of data.rules?.must_not || []) {
    const text = typeof r === 'string' ? r : r.text
    const id = `rule_must_not_${ruleCounter++}`
    const item = blankItem(id, 'rule', text)
    item.severity = 'high'
    if (typeof r === 'object' && r.textLang) item.nameLang = r.textLang
    if (typeof r === 'object' && r.textI18n) item.nameI18n = r.textI18n
    newItems.push(mergeWithExisting(item))
  }
  for (const r of data.rules?.must_do || []) {
    const text = typeof r === 'string' ? r : r.text
    const id = `rule_must_do_${ruleCounter++}`
    const item = blankItem(id, 'rule', text)
    item.severity = 'medium'
    if (typeof r === 'object' && r.textLang) item.nameLang = r.textLang
    if (typeof r === 'object' && r.textI18n) item.nameI18n = r.textI18n
    newItems.push(mergeWithExisting(item))
  }

  // Milestones
  for (const m of data.payoff_timeline?.milestones || []) {
    const id = `milestone_${m.month}`
    const item = blankItem(id, 'milestone', m.event || `Milestone ${m.month}`)
    item.due_date = m.month + '-15'
    if (m.eventI18n) item.nameI18n = m.eventI18n
    newItems.push(mergeWithExisting(item))
  }

  // Preserve items không có legacy mapping (risks, hidden_installments orphans)
  const preservedTypes: ItemType[] = ['risk', 'hidden_installment']
  const usedIds = new Set(newItems.map((i) => i.id))
  for (const old of existing) {
    if (preservedTypes.includes(old.type) && !usedIds.has(old.id)) {
      newItems.push(old)
    }
  }

  // Update meta
  data.meta.daily_limit = data.rules?.daily_limit ?? data.meta.daily_limit
  data.meta.custom_daily_limit = data.custom_daily_limit ?? 0
  data.meta.extra_paid = data.extra_paid ?? 0
  data.meta.generated_at = new Date().toISOString().slice(0, 10)
  ;(data.meta as Meta & { paid_obligations?: string[] }).paid_obligations =
    data.paid_obligations ?? []
  ;(data.meta as Meta & { projected_debt_by_month?: Array<{ month: string; total_debt: number }> }).projected_debt_by_month =
    data.payoff_timeline?.projected_debt_by_month ?? []
  ;(data.meta as Meta & { debt_summary_total?: number }).debt_summary_total =
    data.debts?.summary?.total ?? 0

  data.items = newItems
  return data
}

/**
 * Strip legacy fields trước khi serialize lên JSONBin. JSON output chỉ chứa
 * { meta, items } (per user's schema spec).
 */
export function toV2Output(data: AppData): { meta: Meta; items: Item[] } {
  return {
    meta: (data.meta ?? DEFAULT_META) as Meta,
    items: data.items ?? [],
  }
}

// ═══ Item ↔ legacy field converters (helpers) ═════════════════════════════

function itemToExpense(i: Item): Expense {
  // Parse id "tx_e_<n>" hoặc fallback Date.now()
  const idMatch = /^tx_e_(\d+)$/.exec(i.id)
  const id = idMatch ? Number(idMatch[1]) : Date.now()
  const e: Expense = {
    id,
    desc: i.name,
    amount: i.amount ?? 0,
    cat: i.cat ?? 'khac',
    date: i.due_date ?? '',
  }
  if (i.pay_method) e.payMethod = i.pay_method
  if (i.currency) e.currency = i.currency
  if (i.note) e.note = i.note
  if (i.time) e.time = i.time
  if (i.ref_id) e._obTag = i.ref_id
  if (i.nameLang) e.descLang = i.nameLang
  if (i.nameI18n) e.descI18n = i.nameI18n
  if (i.nameI18nMeta) e.descI18nMeta = i.nameI18nMeta
  return e
}

function itemToIncome(i: Item): Income {
  const idMatch = /^tx_i_(\d+)$/.exec(i.id)
  const id = idMatch ? Number(idMatch[1]) : Date.now()
  const inc: Income = {
    id,
    desc: i.name,
    amount: i.amount ?? 0,
    cat: i.cat ?? 'khac_thu',
    date: i.due_date ?? '',
  }
  if (i.currency) inc.currency = i.currency
  if (i.note) inc.note = i.note
  if (i.time) inc.time = i.time
  if (i.nameLang) inc.descLang = i.nameLang
  if (i.nameI18n) inc.descI18n = i.nameI18n
  if (i.nameI18nMeta) inc.descI18nMeta = i.nameI18nMeta
  return inc
}

function itemToCreditCard(i: Item): CreditCard {
  const c: CreditCard = {
    id: i.id,
    name: i.name,
    credit_limit: i.credit_limit ?? 0,
    balance: i.amount ?? 0,
    interest_rate_annual: i.apr ?? 0,
    minimum_payment: i.minimum_payment ?? 0,
  }
  if (i.due_date) c.min_due_date = i.due_date
  if (i.nameLang) c.nameLang = i.nameLang
  if (i.nameI18n) c.nameI18n = i.nameI18n
  return c
}

function itemToSmallLoan(i: Item): SmallLoan {
  const l: SmallLoan = {
    id: i.id,
    name: i.name,
    remaining_balance: i.amount ?? 0,
  }
  if (i.nameLang) l.nameLang = i.nameLang
  if (i.nameI18n) l.nameI18n = i.nameI18n
  return l
}

function itemToOneTimeExpense(i: Item): OneTimeExpense {
  const idMatch = /^ote_(\d+)$/.exec(i.id)
  const id = idMatch ? Number(idMatch[1]) : Date.now()
  const ote: OneTimeExpense = {
    id,
    name: i.name,
    date: i.due_date ?? '',
    amount: i.amount ?? 0,
  }
  if (i.nameLang) ote.nameLang = i.nameLang
  if (i.nameI18n) ote.nameI18n = i.nameI18n
  if (i.nameI18nMeta) ote.nameI18nMeta = i.nameI18nMeta
  return ote
}

function itemToObligation(i: Item): Obligation {
  const ob: Obligation = {
    name: i.name,
    amount: i.amount ?? 0,
  }
  if (i.cat) ob.category = i.cat
  // Fix: only mark `monthly` template (recurring without specific date) khi
  // KHÔNG có due_date. Nếu có due_date → đó là kỳ cụ thể, hiển thị trong upcoming.
  if (i.frequency === 'monthly' && !i.due_date) ob.monthly = true
  if (i.due_date) ob.date = i.due_date
  if (i.nameLang) ob.nameLang = i.nameLang
  if (i.nameI18n) ob.nameI18n = i.nameI18n
  if (i.nameI18nMeta) ob.nameI18nMeta = i.nameI18nMeta
  return ob
}

function ruleToRuleItem(i: Item): RuleItem {
  const r: RuleItem = { text: i.name }
  if (i.nameLang) r.textLang = i.nameLang
  if (i.nameI18n) r.textI18n = i.nameI18n
  return r
}
