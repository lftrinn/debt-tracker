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
 * Schema v2: dùng transactions[] thay vì expenses[] + incomes[] riêng biệt.
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
   * Thêm khoản chi tiêu mới.
   */
  async function addExp({ desc, amount, cat, payMethod, date, note, time }: { desc: string; amount: number; cat: string; payMethod?: string; date?: string; note?: string; time?: string }): Promise<void> {
    const isCash = !payMethod || payMethod === 'cash'
    const id = Date.now()
    const t = {
      id,
      type: 'exp' as const,
      desc,
      amount,
      cat,
      date: date || tStr(),
      payMethod: payMethod || 'cash',
      ...(note ? { note } : {}),
      ...(time ? { time } : {}),
    }
    const nd: AppData = {
      ...d.value,
      transactions: [t, ...(d.value.transactions || [])],
    }
    if (!isCash) {
      nd.debts = (nd.debts || []).map((c) =>
        c.type === 'credit_card' && c.id === payMethod ? { ...c, balance: (c.balance || 0) + amount } : c
      )
    }
    d.value = nd
    ;(await pushData()) ? toast('toast.expAdded') : toast('toast.expAddedErr', 'err')
  }

  /**
   * Thêm khoản thu nhập và cập nhật số dư tiền mặt.
   */
  async function addInc({ desc, amount, cat, date, note, time }: { desc: string; amount: number; cat: string; date?: string; note?: string; time?: string }): Promise<void> {
    const id = Date.now()
    const t = {
      id,
      type: 'inc' as const,
      desc,
      amount,
      cat,
      date: date || tStr(),
      ...(note ? { note } : {}),
      ...(time ? { time } : {}),
    }
    d.value = {
      ...d.value,
      transactions: [t, ...(d.value.transactions || [])],
      current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amount },
    }
    ;(await pushData()) ? toast('toast.incAdded') : toast('toast.incAddedErr', 'err')
  }

  /**
   * Xóa một giao dịch. Đảo ngược balance update.
   */
  async function deleteTx(e: { id: number; type: string }): Promise<void> {
    if (e.type === 'inc') {
      const inc = (d.value.transactions || []).find((t) => t.id === e.id && t.type === 'inc')
      d.value = { ...d.value, transactions: (d.value.transactions || []).filter((t) => t.id !== e.id) }
      if (inc) {
        d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: Math.max(0, (d.value.current_cash?.balance || 0) - inc.amount) } }
      }
    } else {
      const exp = (d.value.transactions || []).find((t) => t.id === e.id && t.type === 'exp')
      const nd: AppData = { ...d.value, transactions: (d.value.transactions || []).filter((t) => t.id !== e.id) }
      if (exp?.payMethod && exp.payMethod !== 'cash') {
        nd.debts = (nd.debts || []).map((c) =>
          c.type === 'credit_card' && c.id === exp.payMethod
            ? { ...c, balance: Math.max(0, (c.balance || 0) - exp.amount) }
            : c
        )
      }
      d.value = nd
    }
    ;(await pushData()) ? toast('toast.txDeleted') : toast('toast.txDeletedErr', 'err')
  }

  /**
   * Lưu chỉnh sửa giao dịch từ popup.
   */
  async function handlePopupSaveTx(item: {
    id: number
    type: string
    _buf: { name: string; date: string; amt: number; cat: string; note?: string; time?: string }
  }): Promise<void> {
    const buf = item._buf
    const newNote = buf.note?.trim() || undefined
    const newTime = buf.time || undefined

    if (item.type === 'inc') {
      const old = (d.value.transactions || []).find((t) => t.id === item.id && t.type === 'inc')
      const amtDiff = buf.amt - (old?.amount || 0)
      d.value = {
        ...d.value,
        transactions: (d.value.transactions || []).map((t) =>
          t.id === item.id
            ? { ...t, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat, note: newNote, time: newTime }
            : t
        ),
        current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amtDiff },
      }
    } else {
      d.value = {
        ...d.value,
        transactions: (d.value.transactions || []).map((t) =>
          t.id === item.id
            ? { ...t, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat, note: newNote, time: newTime }
            : t
        ),
      }
    }
    ;(await pushData()) ? toast('toast.txUpdated') : toast('toast.txUpdatedErr', 'err')
  }

  return { copyTxData, addExp, addInc, deleteTx, handlePopupSaveTx }
}
