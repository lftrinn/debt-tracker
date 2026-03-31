import type { Ref } from 'vue'
import type { AppData, DebtRef } from '@/types/data'
import type { ToastType } from '../ui/useToast'
import { i18n } from '../../i18n'

/**
 * Xử lý thanh toán nghĩa vụ, thêm/sửa/xóa khoản chi một lần.
 * Schema v2: dùng transactions[], debts[] (flat array), không còn monthly_plans.
 * @param d - Reactive ref chứa toàn bộ dữ liệu ứng dụng
 * @param pushData - Hàm đẩy dữ liệu lên JSONBin, trả về true nếu thành công
 * @param toast - Hàm hiển thị thông báo ngắn
 * @param tStr - Hàm trả về ngày hôm nay dạng 'YYYY-MM-DD'
 * @param findDebtId - Hàm tra cứu ID nợ từ tên nghĩa vụ
 * @returns cleanupPastPaid, recPay, addOneTime, saveEdit, deleteUpcoming, togglePaid, handlePopupSaveUpcoming
 */
export function usePayments(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
  findDebtId: (name: string) => DebtRef | null,
) {
  /**
   * Xóa các nghĩa vụ đã thanh toán có ngày trong quá khứ.
   */
  async function cleanupPastPaid(): Promise<void> {
    const todayStr = tStr()
    const paid = new Set(d.value.paid_obligations || [])
    if (!paid.size) return
    const pastKeys = new Set([...paid].filter((k) => {
      const dateStr = k.split(':')[0]
      return dateStr && dateStr < todayStr
    }))
    if (!pastKeys.size) return
    pastKeys.forEach((k) => paid.delete(k))
    const filteredOneTime = (d.value.one_time_expenses || []).filter((ev) => {
      const key = ev.date + ':' + ev.name
      return !pastKeys.has(key)
    })
    d.value = {
      ...d.value,
      paid_obligations: [...paid],
      one_time_expenses: filteredOneTime,
    }
    await pushData()
  }

  /**
   * Ghi nhận khoản trả nợ trực tiếp và giảm dư nợ tương ứng.
   * @param target - Định danh dạng 'cc:card_id' hoặc 'sl:loan_id'
   * @param amount - Số tiền đã thanh toán (VND)
   */
  async function recPay({ target, amount }: { target: string; amount: number }): Promise<void> {
    if (!amount || amount <= 0 || !target) return
    const [type, id] = target.split(':')
    d.value = {
      ...d.value,
      debts: (d.value.debts || []).map((x) => {
        if (type === 'cc' && x.type === 'credit_card' && x.id === id) {
          return { ...x, balance: Math.max(0, (x.balance || 0) - amount) }
        }
        if (type === 'sl' && x.type === 'loan' && x.id === id) {
          return { ...x, remaining_balance: Math.max(0, (x.remaining_balance || 0) - amount) }
        }
        return x
      }),
    }
    ;(await pushData()) ? toast('toast.debtPaid') : toast('toast.debtPaidErr', 'err')
  }

  /**
   * Thêm khoản chi một lần vào danh sách sắp tới.
   */
  async function addOneTime({ name, date, amount }: { name: string; date: string; amount: number }): Promise<void> {
    if (!name || !date || !amount) return
    const id = Date.now()
    const ev = { id, name, date, amount }
    d.value = { ...d.value, one_time_expenses: [...(d.value.one_time_expenses || []), ev] }
    ;(await pushData()) ? toast('toast.expenseAdded') : toast('toast.expenseAddedErr', 'err')
  }

  /**
   * Lưu chỉnh sửa một khoản sắp tới từ popup.
   */
  async function saveEdit(p: {
    source: string
    _id?: number
    _key: string
    _buf?: { name: string; date: string; amt: number }
    name?: string
  }): Promise<void> {
    const buf = p._buf
    if (!buf?.name || !buf.date || !buf.amt) return
    const nd: AppData = { ...d.value }

    if (p.source === 'one_time') {
      nd.one_time_expenses = (nd.one_time_expenses || []).map((e) =>
        e.id === p._id
          ? { ...e, name: buf.name, date: buf.date, amount: buf.amt }
          : e
      )
    }

    const oldKey = p._key
    const newKey = buf.date + ':' + buf.name
    if (oldKey !== newKey) {
      const paid = new Set(nd.paid_obligations || [])
      if (paid.has(oldKey)) { paid.delete(oldKey); paid.add(newKey) }
      nd.paid_obligations = [...paid]
    }
    d.value = nd
    ;(await pushData()) ? toast('toast.upcomingUpdated') : toast('toast.upcomingUpdatedErr', 'err')
  }

  /**
   * Xóa một khoản sắp tới khỏi danh sách.
   */
  async function deleteUpcoming(p: { source: string; _id?: number; _key: string }): Promise<void> {
    if (p.source === 'one_time') {
      d.value = { ...d.value, one_time_expenses: (d.value.one_time_expenses || []).filter((e) => e.id !== p._id) }
    } else {
      return
    }
    ;(await pushData()) ? toast('toast.upcomingDeleted') : toast('toast.upcomingDeletedErr', 'err')
  }

  /**
   * Đánh dấu hoặc bỏ đánh dấu một nghĩa vụ là đã thanh toán.
   * Khi đánh dấu: trừ tiền mặt, tạo transaction có type='exp', giảm dư nợ thẻ/khoản vay.
   * Khi bỏ đánh dấu: hoàn tác toàn bộ các thay đổi trên.
   */
  async function togglePaid(key: string, amt: number, obName?: string): Promise<void> {
    const paid = new Set(d.value.paid_obligations || [])
    const nd: AppData = {
      ...d.value,
      transactions: [...(d.value.transactions || [])],
      debts: [...(d.value.debts || [])],
    }
    const debtRef = obName ? findDebtId(obName) : null
    const obTag = 'ob:' + key

    if (paid.has(key)) {
      paid.delete(key)
      nd.current_cash = { ...nd.current_cash, balance: (nd.current_cash?.balance || 0) + amt }
      nd.transactions = nd.transactions.filter((t) => t.note !== obTag)
      if (debtRef) {
        nd.debts = nd.debts.map((x) => {
          if (debtRef.type === 'cc' && x.type === 'credit_card' && x.id === debtRef.id) {
            return { ...x, balance: (x.balance || 0) + amt }
          }
          if (debtRef.type === 'sl' && x.type === 'loan' && x.id === debtRef.id) {
            return { ...x, remaining_balance: (x.remaining_balance || 0) + amt }
          }
          return x
        })
      }
    } else {
      paid.add(key)
      nd.current_cash = { ...nd.current_cash, balance: Math.max(0, (nd.current_cash?.balance || 0) - amt) }
      const payDesc = obName || 'Thanh toán'
      nd.transactions = [
        {
          id: Date.now(),
          type: 'exp' as const,
          desc: payDesc,
          amount: amt,
          cat: 'thanhToan',
          date: tStr(),
          note: obTag,
        },
        ...nd.transactions,
      ]
      if (debtRef) {
        nd.debts = nd.debts.map((x) => {
          if (debtRef.type === 'cc' && x.type === 'credit_card' && x.id === debtRef.id) {
            return { ...x, balance: Math.max(0, (x.balance || 0) - amt) }
          }
          if (debtRef.type === 'sl' && x.type === 'loan' && x.id === debtRef.id) {
            return { ...x, remaining_balance: Math.max(0, (x.remaining_balance || 0) - amt) }
          }
          return x
        })
      }
    }
    nd.paid_obligations = [...paid]
    d.value = nd
    const wasPaid = paid.has(key)
    ;(await pushData()) ? toast(wasPaid ? 'toast.paid' : 'toast.undoPaid') : toast('toast.payErr', 'err')
  }

  async function handlePopupSaveUpcoming(p: { _buf: { name: string; date: string; amt: number }; source: string; _id?: number; _key: string; name?: string }): Promise<void> {
    await saveEdit(p)
  }

  return { cleanupPastPaid, recPay, addOneTime, saveEdit, deleteUpcoming, togglePaid, handlePopupSaveUpcoming }
}
