import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import {
  type AppData,
  type Item,
  type AccountItem,
  type IncomeRecurringItem,
  type FixedExpenseItem,
  type OneTimeExpenseItem,
  type DebtItem,
  type RuleEntryItem,
  type RiskItem,
  type MilestoneItem,
  type ExpenseLogItem,
  type IncomeLogItem,
  type PaymentRecordItem,
  isAccount,
  isIncomeRecurring,
  isFixedExpense,
  isOneTimeExpense,
  isDebt,
  isCreditCard,
  isSmallLoan,
  isRule,
  isRisk,
  isMilestone,
  isExpenseLog,
  isIncomeLog,
  isPaymentRecord,
} from '@/types/data'

/**
 * Type-narrow accessors cho `items[]`. Mọi composable read-path phải đi qua đây
 * thay vì `d.value.items.filter(...)` thủ công — đảm bảo subtype narrowing đúng.
 */
export interface ItemsView {
  items: ComputedRef<Item[]>
  accounts: ComputedRef<AccountItem[]>
  primaryAccount: ComputedRef<AccountItem | null>
  incomeRecurring: ComputedRef<IncomeRecurringItem[]>
  primaryIncome: ComputedRef<IncomeRecurringItem | null>
  fixedExpenses: ComputedRef<FixedExpenseItem[]>
  oneTimeExpenses: ComputedRef<OneTimeExpenseItem[]>
  debts: ComputedRef<DebtItem[]>
  creditCards: ComputedRef<DebtItem[]>
  smallLoans: ComputedRef<DebtItem[]>
  rules: ComputedRef<RuleEntryItem[]>
  risks: ComputedRef<RiskItem[]>
  milestones: ComputedRef<MilestoneItem[]>
  expenseLogs: ComputedRef<ExpenseLogItem[]>
  incomeLogs: ComputedRef<IncomeLogItem[]>
  paymentRecords: ComputedRef<PaymentRecordItem[]>
  /** Set of `key` từ payment_record items — dùng cho `paid.has(...)` check. */
  paidKeys: ComputedRef<Set<string>>
}

export function useItems(d: Ref<AppData>): ItemsView {
  const items = computed(() => d.value.items)
  const accounts = computed(() => items.value.filter(isAccount))
  const primaryAccount = computed(() => accounts.value[0] ?? null)
  const incomeRecurring = computed(() => items.value.filter(isIncomeRecurring))
  const primaryIncome = computed(() => incomeRecurring.value[0] ?? null)
  const fixedExpenses = computed(() => items.value.filter(isFixedExpense))
  const oneTimeExpenses = computed(() => items.value.filter(isOneTimeExpense))
  const debts = computed(() => items.value.filter(isDebt))
  const creditCards = computed(() => items.value.filter(isCreditCard))
  const smallLoans = computed(() => items.value.filter(isSmallLoan))
  const rules = computed(() => items.value.filter(isRule))
  const risks = computed(() => items.value.filter(isRisk))
  const milestones = computed(() => items.value.filter(isMilestone))
  const expenseLogs = computed(() => items.value.filter(isExpenseLog))
  const incomeLogs = computed(() => items.value.filter(isIncomeLog))
  const paymentRecords = computed(() => items.value.filter(isPaymentRecord))
  const paidKeys = computed(() => new Set(paymentRecords.value.map((p) => p.key)))

  return {
    items,
    accounts,
    primaryAccount,
    incomeRecurring,
    primaryIncome,
    fixedExpenses,
    oneTimeExpenses,
    debts,
    creditCards,
    smallLoans,
    rules,
    risks,
    milestones,
    expenseLogs,
    incomeLogs,
    paymentRecords,
    paidKeys,
  }
}
