import type { Ref } from 'vue'
import {
  type AppData,
  type Item,
  isAccount,
  isDebt,
} from '@/types/data'
import type { ToastType } from '../ui/useToast'

/**
 * Update DebtItem fields, top up account cash, set custom daily limit, import full JSON.
 */
export function useDebtActions(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
) {
  function mutateItems(fn: (items: Item[]) => Item[]): void {
    d.value = { ...d.value, items: fn(d.value.items) }
  }

  /** Cập nhật DebtItem (balance/min/due_date) cho 1 cardId. */
  async function updateCardDirect({ cardId, balance, min, minDueDate }: {
    cardId: string; balance?: number; min?: number; minDueDate?: string
  }): Promise<void> {
    mutateItems((items) =>
      items.map((i) => {
        if (!isDebt(i) || i.id !== cardId) return i
        return {
          ...i,
          ...(balance != null ? { amount: balance, available_credit: i.credit_limit != null ? Math.max(0, i.credit_limit - balance) : null } : {}),
          ...(min != null ? { minimum_payment: min } : {}),
          ...(minDueDate !== undefined ? { due_date: minDueDate } : {}),
        }
      })
    )
    ;(await pushData()) ? toast('toast.cardUpdated') : toast('toast.cardUpdatedErr', 'err')
  }

  /** Bổ sung tiền mặt vào primary account, cập nhật `as_of`. */
  async function addCash({ amount }: { amount: number }): Promise<void> {
    if (!amount || amount <= 0) return
    let done = false
    mutateItems((items) =>
      items.map((i) => {
        if (!done && isAccount(i)) {
          done = true
          return { ...i, amount: (i.amount || 0) + amount, as_of: tStr() }
        }
        return i
      })
    )
    ;(await pushData()) ? toast('toast.cashUpdated') : toast('toast.cashUpdatedErr', 'err')
  }

  /** Đặt custom daily limit trong meta. */
  async function updLimit(val: number): Promise<void> {
    if (val <= 0) return
    d.value = { ...d.value, meta: { ...d.value.meta, custom_daily_limit: val } }
    ;(await pushData()) ? toast('toast.limitUpdated') : toast('toast.limitUpdatedErr', 'err')
  }

  /**
   * Import JSON (v2 format only). User-pasted JSON phải có shape `{meta, items}`.
   * Giữ lại các log/payment_record items hiện có (không mất history).
   */
  async function importNewJson(jsonStr: string, importErr: Ref<string>): Promise<void> {
    if (!jsonStr) return
    importErr.value = ''
    try {
      const parsed = JSON.parse(jsonStr) as Partial<AppData>
      if (!parsed.meta || !Array.isArray(parsed.items)) {
        throw new Error('JSON v2 không hợp lệ — cần { meta, items }')
      }
      // Giữ history user
      const preservedTypes = new Set(['expense_log', 'income_log', 'payment_record'])
      const userHistory = d.value.items.filter((i) => preservedTypes.has(i.type))
      const newItems = parsed.items.filter((i) => !preservedTypes.has(i.type))
      const merged: AppData = {
        meta: { ...d.value.meta, ...parsed.meta },
        items: [...newItems, ...userHistory],
      }
      d.value = merged
      ;(await pushData()) ? toast('toast.imported') : toast('toast.importedErr', 'err')
    } catch (e) {
      const err = e as Error
      importErr.value = err.message?.includes('JSON')
        ? 'JSON không hợp lệ — kiểm tra lại cú pháp'
        : err.message || 'Lỗi không xác định'
    }
  }

  return { updateCardDirect, addCash, updLimit, importNewJson }
}
