import type { Ref } from 'vue'
import type { AppData } from '@/types/data'
import type { ToastType } from '../ui/useToast'

/**
 * Xử lý các hành động quản lý nợ và cài đặt.
 * Schema v2: debts[] là flat array thay vì { credit_cards, small_loans }.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @param pushData - Hàm đẩy dữ liệu lên JSONBin, trả về true nếu thành công
 * @param toast - Hàm hiển thị thông báo ngắn
 * @param tStr - Hàm trả về ngày hôm nay dạng 'YYYY-MM-DD'
 * @returns updateCardDirect, addCash, updLimit, importNewJson
 */
export function useDebtActions(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
) {
  /**
   * Cập nhật trực tiếp thông tin thẻ tín dụng (số dư, thanh toán tối thiểu, ngày đến hạn).
   */
  async function updateCardDirect({ cardId, balance, min, minDueDate }: { cardId: string; balance?: number; min?: number; minDueDate?: string }): Promise<void> {
    d.value = {
      ...d.value,
      debts: (d.value.debts || []).map((x) => {
        if (x.type !== 'credit_card' || x.id !== cardId) return x
        const updated = { ...x }
        if (balance != null) updated.balance = balance
        if (min != null) updated.minimum_payment = min
        if (minDueDate !== undefined) {
          // Cập nhật payment_due_dates: thay thế ngày đầu tiên
          const dates = [...(x.payment_due_dates || [])]
          if (minDueDate) {
            dates[0] = minDueDate
          } else {
            dates.splice(0, 1)
          }
          updated.payment_due_dates = dates
        }
        return updated
      }),
    }
    ;(await pushData()) ? toast('toast.cardUpdated') : toast('toast.cardUpdatedErr', 'err')
  }

  /**
   * Bổ sung tiền mặt vào số dư và cập nhật ngày snapshot hiện tại.
   */
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
    ;(await pushData()) ? toast('toast.cashUpdated') : toast('toast.cashUpdatedErr', 'err')
  }

  /**
   * Đặt hạn mức chi tiêu tùy chỉnh theo ngày.
   */
  async function updLimit(val: number): Promise<void> {
    if (val > 0) {
      d.value.custom_daily_limit = val
      ;(await pushData()) ? toast('toast.limitUpdated') : toast('toast.limitUpdatedErr', 'err')
    }
  }

  /**
   * Import cấu hình từ JSON string, giữ nguyên transactions và paid_obligations hiện có.
   */
  async function importNewJson(jsonStr: string, importErr: Ref<string>): Promise<void> {
    if (!jsonStr) return
    importErr.value = ''
    try {
      const parsed = JSON.parse(jsonStr) as Partial<AppData>
      const merged: AppData = {
        ...parsed,
        transactions: d.value.transactions || [],
        paid_obligations: d.value.paid_obligations || [],
        one_time_expenses: d.value.one_time_expenses || [],
        custom_daily_limit: d.value.custom_daily_limit || 0,
        current_cash: parsed.current_cash || d.value.current_cash,
        schema_version: 2,
      } as AppData
      d.value = merged
      ;(await pushData()) ? toast('toast.imported') : toast('toast.importedErr', 'err')
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
