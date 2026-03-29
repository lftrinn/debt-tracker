import type { Ref } from 'vue'
import type { AppData } from '@/types/data'
import type { ToastType } from './useToast'

export function useDebtActions(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
) {
  async function updateCardDirect({ cardId, balance, min, minDueDate }: { cardId: string; balance?: number; min?: number; minDueDate?: string }): Promise<void> {
    d.value = {
      ...d.value,
      debts: {
        ...d.value.debts,
        credit_cards: d.value.debts.credit_cards.map((c) => {
          if (c.id !== cardId) return c
          return {
            ...c,
            ...(balance != null ? { balance } : {}),
            ...(min != null ? { minimum_payment: min } : {}),
            ...(minDueDate !== undefined ? { min_due_date: minDueDate } : {}),
          }
        }),
      },
    }
    ;(await pushData()) ? toast('Đã cập nhật thẻ') : toast('Lỗi cập nhật thẻ', 'err')
  }

  async function addCash({ amount }: { amount: number }): Promise<void> {
    if (!amount || amount <= 0) return
    d.value = {
      ...d.value,
      current_cash: {
        ...d.value.current_cash,
        balance: (d.value.current_cash?.balance || 0) + amount,
        as_of: tStr(),
      },
    }
    ;(await pushData()) ? toast('Đã cập nhật tiền mặt') : toast('Lỗi cập nhật tiền mặt', 'err')
  }

  async function updLimit(val: number): Promise<void> {
    if (val > 0) {
      d.value.custom_daily_limit = val
      ;(await pushData()) ? toast('Đã cập nhật hạn mức') : toast('Lỗi cập nhật hạn mức', 'err')
    }
  }

  async function importNewJson(jsonStr: string, importErr: Ref<string>): Promise<void> {
    if (!jsonStr) return
    importErr.value = ''
    try {
      const parsed = JSON.parse(jsonStr) as Partial<AppData>
      const merged: AppData = {
        ...parsed,
        expenses: d.value.expenses || [],
        incomes: d.value.incomes || [],
        paid_obligations: d.value.paid_obligations || [],
        one_time_expenses: d.value.one_time_expenses || [],
        custom_daily_limit: d.value.custom_daily_limit || 0,
        current_cash: parsed.current_cash || d.value.current_cash,
      } as AppData
      d.value = merged
      ;(await pushData()) ? toast('Đã import dữ liệu') : toast('Lỗi import dữ liệu', 'err')
    } catch (e) {
      const err = e as Error
      importErr.value =
        err.message === 'Unexpected token' || err.message?.includes('JSON')
          ? 'JSON không hợp lệ — kiểm tra lại cú pháp'
          : err.message || 'Lỗi không xác định'
    }
  }

  return { updateCardDirect, addCash, updLimit, importNewJson }
}
