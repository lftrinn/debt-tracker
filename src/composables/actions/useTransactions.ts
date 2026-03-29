import { ref } from 'vue'
import type { Ref } from 'vue'
import type { AppData, DebtRef } from '@/types/data'
import type { ToastType } from '../ui/useToast'
import { useCurrency } from '../api/useCurrency'
import type { Currency } from '../api/useCurrency'

export interface CopyTxData {
  desc: string
  amount: number
  cat: string
  type: 'exp' | 'inc'
}

/**
 * Xử lý các hành động thêm, sửa, xóa giao dịch chi tiêu và thu nhập.
 * Tự động cập nhật số dư thẻ tín dụng / tiền mặt (luôn quy đổi về VND cho balance).
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @param pushData - Hàm đẩy dữ liệu lên JSONBin, trả về true nếu thành công
 * @param toast - Hàm hiển thị thông báo ngắn
 * @param tStr - Hàm trả về ngày hôm nay dạng 'YYYY-MM-DD'
 * @param findDebtId - Hàm tra cứu ID nợ từ tên nghĩa vụ
 * @returns copyTxData, addExp, addInc, deleteTx, handlePopupSaveTx
 */
export function useTransactions(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
  findDebtId: (name: string) => DebtRef | null,
) {
  const copyTxData = ref<CopyTxData | null>(null)
  // Lấy helpers từ useCurrency singleton (toVnd, baseCurrency)
  const { toVnd, baseCurrency } = useCurrency()

  /**
   * Thêm khoản chi tiêu mới.
   * Amount lưu nguyên theo currency được chọn; card balance luôn cập nhật bằng VND.
   * @param desc - Mô tả giao dịch
   * @param amount - Số tiền theo đơn vị currency
   * @param cat - Danh mục
   * @param payMethod - 'cash' hoặc card ID; mặc định là 'cash'
   * @param currency - Đơn vị tiền của giao dịch; mặc định là baseCurrency
   */
  async function addExp({ desc, amount, cat, payMethod, currency }: { desc: string; amount: number; cat: string; payMethod?: string; currency?: string }): Promise<void> {
    const isCash = !payMethod || payMethod === 'cash'
    const txCur = (currency || baseCurrency.value) as Currency
    const e = { id: Date.now(), desc, amount, cat, date: tStr(), payMethod: payMethod || 'cash', currency: txCur }
    const nd: AppData = {
      ...d.value,
      expenses: [e, ...(d.value.expenses || [])],
    }
    if (!isCash) {
      // Card balance luôn theo VND — quy đổi nếu giao dịch ở ngoại tệ
      const amountVnd = toVnd(amount, txCur)
      nd.debts = {
        ...nd.debts,
        credit_cards: (nd.debts?.credit_cards || []).map((c) =>
          c.id === payMethod ? { ...c, balance: (c.balance || 0) + amountVnd } : c
        ),
      }
    }
    d.value = nd
    ;(await pushData()) ? toast('toast.expAdded') : toast('toast.expAddedErr', 'err')
  }

  /**
   * Thêm khoản thu nhập và cập nhật số dư tiền mặt (cash balance luôn theo VND).
   * @param desc - Mô tả khoản thu
   * @param amount - Số tiền theo đơn vị currency
   * @param cat - Danh mục thu nhập
   * @param currency - Đơn vị tiền của khoản thu; mặc định là baseCurrency
   */
  async function addInc({ desc, amount, cat, currency }: { desc: string; amount: number; cat: string; currency?: string }): Promise<void> {
    const txCur = (currency || baseCurrency.value) as Currency
    const e = { id: Date.now(), desc, amount, cat, date: tStr(), currency: txCur }
    d.value = { ...d.value, incomes: [e, ...(d.value.incomes || [])] }
    // Cash balance luôn theo VND — quy đổi nếu thu nhập ở ngoại tệ
    const amountVnd = toVnd(amount, txCur)
    d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amountVnd } }
    ;(await pushData()) ? toast('toast.incAdded') : toast('toast.incAddedErr', 'err')
  }

  /**
   * Xóa một giao dịch. Đảo ngược balance update bằng VND (đồng nhất với addExp/addInc).
   * @param e - Đối tượng có id và type ('inc' hoặc 'exp')
   */
  async function deleteTx(e: { id: number; type: string }): Promise<void> {
    if (e.type === 'inc') {
      const inc = (d.value.incomes || []).find((i) => i.id === e.id)
      d.value = { ...d.value, incomes: d.value.incomes.filter((i) => i.id !== e.id) }
      if (inc) {
        // Trừ đúng giá trị VND đã cộng vào lúc thêm
        const incVnd = toVnd(inc.amount, (inc.currency || baseCurrency.value) as Currency)
        d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: Math.max(0, (d.value.current_cash?.balance || 0) - incVnd) } }
      }
    } else {
      const exp = (d.value.expenses || []).find((i) => i.id === e.id)
      const nd: AppData = { ...d.value, expenses: d.value.expenses.filter((i) => i.id !== e.id) }
      if (exp?.payMethod && exp.payMethod !== 'cash') {
        // Trừ đúng giá trị VND đã cộng vào card balance lúc thêm
        const expVnd = toVnd(exp.amount, (exp.currency || baseCurrency.value) as Currency)
        nd.debts = {
          ...nd.debts,
          credit_cards: (nd.debts?.credit_cards || []).map((c) =>
            c.id === exp.payMethod ? { ...c, balance: Math.max(0, (c.balance || 0) - expVnd) } : c
          ),
        }
      }
      d.value = nd
    }
    ;(await pushData()) ? toast('toast.txDeleted') : toast('toast.txDeletedErr', 'err')
  }

  /**
   * Lưu chỉnh sửa giao dịch từ popup. Cash balance cập nhật theo chênh lệch VND.
   * @param item - Đối tượng giao dịch với dữ liệu chỉnh sửa trong _buf
   */
  async function handlePopupSaveTx(item: { id: number; type: string; _buf: { name: string; date: string; amt: number; cat: string } }): Promise<void> {
    const buf = item._buf
    if (item.type === 'inc') {
      const old = (d.value.incomes || []).find((i) => i.id === item.id)
      // Tính chênh lệch theo VND để cập nhật cash balance chính xác
      const txCur = (old?.currency || baseCurrency.value) as Currency
      const oldVnd = toVnd(old?.amount || 0, txCur)
      const newVnd = toVnd(buf.amt, txCur)
      const amtDiff = newVnd - oldVnd
      d.value = {
        ...d.value,
        incomes: (d.value.incomes || []).map((i) =>
          i.id === item.id ? { ...i, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat } : i
        ),
        current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amtDiff },
      }
    } else {
      d.value = {
        ...d.value,
        expenses: (d.value.expenses || []).map((i) =>
          i.id === item.id ? { ...i, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat } : i
        ),
      }
    }
    ;(await pushData()) ? toast('toast.txUpdated') : toast('toast.txUpdatedErr', 'err')
  }

  return { copyTxData, addExp, addInc, deleteTx, handlePopupSaveTx }
}
