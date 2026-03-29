import type { Ref } from 'vue'
import type { AppData, DebtRef } from '@/types/data'
import type { ToastType } from '../ui/useToast'

/**
 * Xử lý thanh toán nghĩa vụ, thêm/sửa/xóa khoản chi một lần, và dọn dẹp dữ liệu đã qua hạn.
 * Khi đánh dấu một nghĩa vụ là đã thanh toán, tự động tạo expense có _obTag và giảm số dư nợ.
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
   * Xóa các nghĩa vụ đã thanh toán có ngày trong quá khứ, đồng thời dọn sạch dữ liệu nguồn.
   * Chạy sau mỗi lần pull để tránh tích lũy rác trong one_time_expenses và monthly_plans.
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
    const plans = { ...(d.value.monthly_plans || {}) }
    for (const mo of Object.keys(plans)) {
      const obs = plans[mo]?.obligations
      if (!obs) continue
      const filtered = obs.filter((ob) => {
        const dateStr = ob.date || ob['date ']
        if (!dateStr) return true
        const key = dateStr + ':' + ob.name
        return !pastKeys.has(key)
      })
      if (filtered.length !== obs.length) {
        plans[mo] = { ...plans[mo], obligations: filtered }
      }
    }
    d.value = {
      ...d.value,
      paid_obligations: [...paid],
      one_time_expenses: filteredOneTime,
      monthly_plans: plans,
    }
    await pushData()
  }

  /**
   * Ghi nhận khoản trả nợ trực tiếp (ngoài kế hoạch) và giảm dư nợ tương ứng trên thẻ hoặc khoản vay.
   * @param target - Định danh dạng 'cc:card_id' hoặc 'sl:loan_id'
   * @param amount - Số tiền đã thanh toán (VND)
   */
  async function recPay({ target, amount }: { target: string; amount: number }): Promise<void> {
    if (!amount || amount <= 0 || !target) return
    const [type, id] = target.split(':')
    const nd: AppData = { ...d.value }
    if (type === 'cc') {
      nd.debts = { ...nd.debts, credit_cards: nd.debts.credit_cards.map((c) => c.id === id ? { ...c, balance: Math.max(0, c.balance - amount) } : c) }
    } else {
      nd.debts = { ...nd.debts, small_loans: nd.debts.small_loans.map((l) => l.id === id ? { ...l, remaining_balance: Math.max(0, (l.remaining_balance || 0) - amount) } : l) }
    }
    d.value = nd
    ;(await pushData()) ? toast('toast.debtPaid') : toast('toast.debtPaidErr', 'err')
  }

  /**
   * Thêm khoản chi một lần vào danh sách sắp tới (chưa thực hiện).
   * @param name - Tên khoản chi
   * @param date - Ngày dự kiến dạng 'YYYY-MM-DD'
   * @param amount - Số tiền (VND)
   */
  async function addOneTime({ name, date, amount }: { name: string; date: string; amount: number }): Promise<void> {
    if (!name || !date || !amount) return
    const ev = { id: Date.now(), name, date, amount }
    d.value = { ...d.value, one_time_expenses: [...(d.value.one_time_expenses || []), ev] }
    ;(await pushData()) ? toast('toast.expenseAdded') : toast('toast.expenseAddedErr', 'err')
  }

  /**
   * Lưu chỉnh sửa một khoản sắp tới từ popup. Cập nhật paid_obligations nếu key thay đổi do đổi tên/ngày.
   * @param p - Đối tượng khoản thanh toán với dữ liệu chỉnh sửa trong _buf
   */
  async function saveEdit(p: { source: string; _id?: number; _mo?: string; _key: string; _buf?: { name: string; date: string; amt: number } }): Promise<void> {
    const buf = p._buf
    if (!buf?.name || !buf.date || !buf.amt) return
    const nd: AppData = { ...d.value }
    if (p.source === 'one_time') {
      nd.one_time_expenses = (nd.one_time_expenses || []).map((e) =>
        e.id === p._id ? { ...e, name: buf.name, date: buf.date, amount: buf.amt } : e
      )
    } else {
      const mo = p._mo
      if (mo && nd.monthly_plans?.[mo]?.obligations) {
        nd.monthly_plans = {
          ...nd.monthly_plans,
          [mo]: {
            ...nd.monthly_plans[mo],
            obligations: nd.monthly_plans[mo].obligations.map((ob) => {
              const k = (ob.date || '') + ':' + (ob.name || '')
              if (k !== p._key) return ob
              const newCat = (buf.name || '').toLowerCase().includes('minimum')
                ? 'debt_minimum'
                : (ob.category === 'debt_minimum' ? null : ob.category)
              return { ...ob, name: buf.name, date: buf.date, amount: buf.amt, category: newCat }
            }),
          },
        }
      }
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
   * Xóa một khoản sắp tới khỏi danh sách (one_time hoặc monthly_plan).
   * @param p - Đối tượng khoản cần xóa với source, _id, _mo, _key
   */
  async function deleteUpcoming(p: { source: string; _id?: number; _mo?: string; _key: string }): Promise<void> {
    if (p.source === 'one_time') {
      d.value = { ...d.value, one_time_expenses: (d.value.one_time_expenses || []).filter((e) => e.id !== p._id) }
    } else if (p.source === 'monthly_plan' && p._mo) {
      const plans = { ...(d.value.monthly_plans || {}) }
      const plan = plans[p._mo]
      if (plan?.obligations) {
        plans[p._mo] = {
          ...plan,
          obligations: plan.obligations.filter((ob) => {
            const dateStr = ob.date || ob['date '] || ''
            return (dateStr + ':' + ob.name) !== p._key
          }),
        }
        d.value = { ...d.value, monthly_plans: plans }
      }
    } else {
      return
    }
    ;(await pushData()) ? toast('toast.upcomingDeleted') : toast('toast.upcomingDeletedErr', 'err')
  }

  /**
   * Đánh dấu hoặc bỏ đánh dấu một nghĩa vụ là đã thanh toán.
   * Khi đánh dấu: trừ tiền mặt, tạo expense có _obTag, giảm dư nợ thẻ/khoản vay.
   * Khi bỏ đánh dấu: hoàn tác toàn bộ các thay đổi trên.
   * @param key - Key dạng 'YYYY-MM-DD:tên nghĩa vụ'
   * @param amt - Số tiền nghĩa vụ (VND)
   * @param obName - Tên nghĩa vụ để tra cứu debt ID, tùy chọn
   */
  async function togglePaid(key: string, amt: number, obName?: string): Promise<void> {
    const paid = new Set(d.value.paid_obligations || [])
    const nd: AppData = {
      ...d.value,
      expenses: [...(d.value.expenses || [])],
      debts: {
        ...d.value.debts,
        credit_cards: [...(d.value.debts?.credit_cards || [])],
        small_loans: [...(d.value.debts?.small_loans || [])],
      },
    }
    const debtRef = obName ? findDebtId(obName) : null
    const obTag = 'ob:' + key

    if (paid.has(key)) {
      paid.delete(key)
      nd.current_cash = { ...nd.current_cash, balance: (nd.current_cash?.balance || 0) + amt }
      nd.expenses = nd.expenses.filter((e) => e._obTag !== obTag)
      if (debtRef) {
        if (debtRef.type === 'cc') {
          nd.debts.credit_cards = nd.debts.credit_cards.map((c) =>
            c.id === debtRef.id ? { ...c, balance: (c.balance || 0) + amt } : c
          )
        } else {
          nd.debts.small_loans = nd.debts.small_loans.map((l) =>
            l.id === debtRef.id ? { ...l, remaining_balance: (l.remaining_balance || 0) + amt } : l
          )
        }
      }
    } else {
      paid.add(key)
      nd.current_cash = { ...nd.current_cash, balance: Math.max(0, (nd.current_cash?.balance || 0) - amt) }
      nd.expenses = [
        { id: Date.now(), desc: obName || 'Thanh toán', amount: amt, cat: 'thanhToan', date: tStr(), _obTag: obTag },
        ...nd.expenses,
      ]
      if (debtRef) {
        if (debtRef.type === 'cc') {
          nd.debts.credit_cards = nd.debts.credit_cards.map((c) =>
            c.id === debtRef.id ? { ...c, balance: Math.max(0, (c.balance || 0) - amt) } : c
          )
        } else {
          nd.debts.small_loans = nd.debts.small_loans.map((l) =>
            l.id === debtRef.id ? { ...l, remaining_balance: Math.max(0, (l.remaining_balance || 0) - amt) } : l
          )
        }
      }
    }
    nd.paid_obligations = [...paid]
    d.value = nd
    const wasPaid = paid.has(key)
    ;(await pushData()) ? toast(wasPaid ? 'toast.paid' : 'toast.undoPaid') : toast('toast.payErr', 'err')
  }

  async function handlePopupSaveUpcoming(p: { _buf: { name: string; date: string; amt: number }; source: string; _id?: number; _mo?: string; _key: string }): Promise<void> {
    await saveEdit(p)
  }

  return { cleanupPastPaid, recPay, addOneTime, saveEdit, deleteUpcoming, togglePaid, handlePopupSaveUpcoming }
}
