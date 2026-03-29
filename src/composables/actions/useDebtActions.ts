import type { Ref } from 'vue'
import type { AppData } from '@/types/data'
import type { ToastType } from '../ui/useToast'

/**
 * Xử lý các hành động quản lý nợ và cài đặt: cập nhật thẻ, bổ sung tiền mặt, đặt hạn mức, và import JSON.
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
   * Chỉ cập nhật trường nào được truyền vào, các trường khác giữ nguyên.
   * @param cardId - ID thẻ cần cập nhật
   * @param balance - Số dư mới (tùy chọn)
   * @param min - Số tiền thanh toán tối thiểu mới (tùy chọn)
   * @param minDueDate - Ngày đến hạn thanh toán tối thiểu mới (tùy chọn)
   */
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
    ;(await pushData()) ? toast('toast.cardUpdated') : toast('toast.cardUpdatedErr', 'err')
  }

  /**
   * Bổ sung tiền mặt vào số dư và cập nhật ngày snapshot hiện tại.
   * @param amount - Số tiền cần thêm (VND, phải dương)
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
   * Đặt hạn mức chi tiêu tùy chỉnh theo ngày. Khi val > 0 thì ghi đè daily_limit từ rules.
   * @param val - Hạn mức mới (VND/ngày)
   */
  async function updLimit(val: number): Promise<void> {
    if (val > 0) {
      d.value.custom_daily_limit = val
      ;(await pushData()) ? toast('toast.limitUpdated') : toast('toast.limitUpdatedErr', 'err')
    }
  }

  /**
   * Import cấu hình nợ từ JSON string, giữ nguyên giao dịch và nghĩa vụ hiện có.
   * Merge theo chiến lược: dùng config mới (debts, income, rules...) nhưng giữ expenses/incomes/paid_obligations của user.
   * @param jsonStr - Chuỗi JSON cần import
   * @param importErr - Ref để ghi thông báo lỗi nếu parse thất bại
   */
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
