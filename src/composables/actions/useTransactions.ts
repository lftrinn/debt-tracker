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

export function useTransactions(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
  findDebtId: (name: string) => DebtRef | null,
) {
  const copyTxData = ref<CopyTxData | null>(null)

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

  async function addInc({ desc, amount, cat }: { desc: string; amount: number; cat: string }): Promise<void> {
    const e = { id: Date.now(), desc, amount, cat, date: tStr() }
    d.value = { ...d.value, incomes: [e, ...(d.value.incomes || [])] }
    d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amount } }
    ;(await pushData()) ? toast('toast.incAdded') : toast('toast.incAddedErr', 'err')
  }

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
