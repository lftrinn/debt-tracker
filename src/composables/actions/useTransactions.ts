import { ref } from 'vue'
import type { Ref } from 'vue'
import type { AppData, DebtRef } from '@/types/data'
import type { ToastType } from '../ui/useToast'

export interface CopyTxData {
  desc: string
  amount: number
  cat: string
  type: 'exp' | 'inc'
}

/**
 * Xử lý các hành động thêm, sửa, xóa giao dịch chi tiêu và thu nhập.
 * Tự động cập nhật số dư thẻ tín dụng nếu giao dịch được thực hiện qua thẻ.
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

  /**
   * Thêm khoản chi tiêu mới. Nếu thanh toán qua thẻ, tự động tăng dư nợ thẻ tương ứng.
   * @param desc - Mô tả giao dịch
   * @param amount - Số tiền (VND)
   * @param cat - Danh mục
   * @param payMethod - 'cash' hoặc card ID; mặc định là 'cash'
   */
  async function addExp({ desc, amount, cat, payMethod }: { desc: string; amount: number; cat: string; payMethod?: string }): Promise<void> {
    const isCash = !payMethod || payMethod === 'cash'
    const e = { id: Date.now(), desc, amount, cat, date: tStr(), payMethod: payMethod || 'cash' }
    const nd: AppData = {
      ...d.value,
      expenses: [e, ...(d.value.expenses || [])],
    }
    if (!isCash) {
      nd.debts = {
        ...nd.debts,
        credit_cards: (nd.debts?.credit_cards || []).map((c) =>
          c.id === payMethod ? { ...c, balance: (c.balance || 0) + amount } : c
        ),
      }
    }
    d.value = nd
    ;(await pushData()) ? toast('toast.expAdded') : toast('toast.expAddedErr', 'err')
  }

  /**
   * Thêm khoản thu nhập và cập nhật số dư tiền mặt ngay lập tức.
   * @param desc - Mô tả khoản thu
   * @param amount - Số tiền nhận được (VND)
   * @param cat - Danh mục thu nhập
   */
  async function addInc({ desc, amount, cat }: { desc: string; amount: number; cat: string }): Promise<void> {
    const e = { id: Date.now(), desc, amount, cat, date: tStr() }
    d.value = { ...d.value, incomes: [e, ...(d.value.incomes || [])] }
    d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amount } }
    ;(await pushData()) ? toast('toast.incAdded') : toast('toast.incAddedErr', 'err')
  }

  /**
   * Xóa một giao dịch. Khi xóa thu nhập thì giảm số dư tiền mặt; khi xóa chi tiêu qua thẻ thì giảm dư nợ thẻ.
   * @param e - Đối tượng có id và type ('inc' hoặc 'exp')
   */
  async function deleteTx(e: { id: number; type: string }): Promise<void> {
    if (e.type === 'inc') {
      const inc = (d.value.incomes || []).find((i) => i.id === e.id)
      d.value = { ...d.value, incomes: d.value.incomes.filter((i) => i.id !== e.id) }
      if (inc) {
        d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: Math.max(0, (d.value.current_cash?.balance || 0) - inc.amount) } }
      }
    } else {
      const exp = (d.value.expenses || []).find((i) => i.id === e.id)
      const nd: AppData = { ...d.value, expenses: d.value.expenses.filter((i) => i.id !== e.id) }
      if (exp?.payMethod && exp.payMethod !== 'cash') {
        nd.debts = {
          ...nd.debts,
          credit_cards: (nd.debts?.credit_cards || []).map((c) =>
            c.id === exp.payMethod ? { ...c, balance: Math.max(0, (c.balance || 0) - exp.amount) } : c
          ),
        }
      }
      d.value = nd
    }
    ;(await pushData()) ? toast('toast.txDeleted') : toast('toast.txDeletedErr', 'err')
  }

  /**
   * Lưu chỉnh sửa giao dịch từ popup. Khi chỉnh sửa thu nhập thì cập nhật số dư tiền mặt theo chênh lệch số tiền.
   * @param item - Đối tượng giao dịch với dữ liệu chỉnh sửa trong _buf
   */
  async function handlePopupSaveTx(item: { id: number; type: string; _buf: { name: string; date: string; amt: number; cat: string } }): Promise<void> {
    const buf = item._buf
    if (item.type === 'inc') {
      const old = (d.value.incomes || []).find((i) => i.id === item.id)
      const amtDiff = buf.amt - (old?.amount || 0)
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
