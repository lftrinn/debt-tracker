import type { Ref } from 'vue'
import {
  type AppData,
  type ExpenseLogItem,
  type Item,
  type OneTimeExpenseItem,
  type PaymentRecordItem,
  isAccount,
  isDebt,
  isExpenseLog,
  isFixedExpense,
  isOneTimeExpense,
  isPaymentRecord,
} from '@/types/data'
import type { ToastType } from '../ui/useToast'
import { i18n } from '../../i18n'
import { translateToAll, translateText, ALL_LANGS } from '../api/useTranslation'
import type { AppLang } from '../api/useTranslation'
import type { TranslationDecision } from './useTransactions'

/** Helper · gen string ID. */
function nextOteId(): string { return 'ote_' + Date.now() }
function nextPayId(): string { return 'pay_' + Date.now() }
function nextExpId(): string { return 'tx_e_' + Date.now() }

/**
 * Payments + one-time expense management. Mọi thao tác chuyển sang mutate items[]:
 *   - togglePaid → tạo/xóa PaymentRecordItem + ExpenseLogItem(cat='thanhToan') + adjust DebtItem.amount + AccountItem.amount
 *   - addOneTime → tạo OneTimeExpenseItem
 *   - saveEdit / deleteUpcoming → mutate FixedExpenseItem hoặc OneTimeExpenseItem
 *   - cleanupPastPaid → xóa PaymentRecordItem + OTE/FE đã quá hạn của tháng cũ
 */
export function usePayments(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
  findDebtId: (name: string) => string | null,
) {
  function mutateItems(fn: (items: Item[]) => Item[]): void {
    d.value = { ...d.value, items: fn(d.value.items) }
  }

  function currentLang(): AppLang {
    return (i18n.global.locale as { value: string }).value as AppLang
  }

  /** Cleanup các payment_record + one_time_expense + fixed_expense quá hạn. */
  async function cleanupPastPaid(): Promise<void> {
    const todayStr = tStr()
    const items = d.value.items
    const paidPast = items.filter(
      (i): i is PaymentRecordItem => isPaymentRecord(i) && i.due_date < todayStr
    )
    if (paidPast.length === 0) return

    const pastKeys = new Set(paidPast.map((p) => p.key))

    mutateItems((list) =>
      list.filter((i) => {
        if (isPaymentRecord(i) && pastKeys.has(i.key)) return false
        if (isOneTimeExpense(i) && pastKeys.has(i.due_date + ':' + i.name)) return false
        if (isFixedExpense(i) && i.due_date && pastKeys.has(i.due_date + ':' + i.name)) return false
        return true
      })
    )
    await pushData()
  }

  /** Trả nợ trực tiếp ngoài kế hoạch — chỉ giảm DebtItem.amount, không tạo log. */
  async function recPay({ target, amount }: { target: string; amount: number }): Promise<void> {
    if (!amount || amount <= 0 || !target) return
    // target format kept compat: "cc:id" / "sl:id" / hoặc plain id
    const id = target.includes(':') ? target.split(':')[1] : target
    mutateItems((items) =>
      items.map((i) =>
        isDebt(i) && i.id === id ? { ...i, amount: Math.max(0, (i.amount || 0) - amount) } : i
      )
    )
    ;(await pushData()) ? toast('toast.debtPaid') : toast('toast.debtPaidErr', 'err')
  }

  function backgroundTranslateOneTime(id: string, name: string, from: AppLang): void {
    if (!name.trim()) return
    translateToAll(name, from).then(async (translations) => {
      const meta: Partial<Record<AppLang, 'auto' | 'manual'>> = {}
      for (const l of ALL_LANGS) {
        if (translations[l]) meta[l] = l === from ? 'manual' : 'auto'
      }
      mutateItems((items) =>
        items.map((i) =>
          isOneTimeExpense(i) && i.id === id && i.name === name
            ? { ...i, nameI18n: translations, nameI18nMeta: meta }
            : i
        )
      )
      await pushData()
    })
  }

  function backgroundTranslateOneTimePartial(id: string, name: string, from: AppLang, targetLangs: AppLang[]): void {
    if (!name.trim() || targetLangs.length === 0) return
    Promise.all(targetLangs.map((lang) => translateText(name, from, lang).then((r) => ({ lang, result: r })))).then(
      async (results) => {
        const i18nUpdates: Partial<Record<AppLang, string>> = {}
        const metaUpdates: Partial<Record<AppLang, 'auto' | 'manual'>> = {}
        for (const { lang, result } of results) {
          if (result) { i18nUpdates[lang] = result; metaUpdates[lang] = 'auto' }
        }
        mutateItems((items) =>
          items.map((i) =>
            isOneTimeExpense(i) && i.id === id && i.name === name
              ? {
                  ...i,
                  nameI18n: { ...(i.nameI18n || {}), ...i18nUpdates },
                  nameI18nMeta: { ...(i.nameI18nMeta || {}), ...metaUpdates },
                }
              : i
          )
        )
        await pushData()
      },
    )
  }

  function backgroundTranslateFixedExpensePartial(itemId: string, name: string, from: AppLang, targetLangs: AppLang[]): void {
    if (!name.trim() || targetLangs.length === 0) return
    Promise.all(targetLangs.map((lang) => translateText(name, from, lang).then((r) => ({ lang, result: r })))).then(
      async (results) => {
        const i18nUpdates: Partial<Record<AppLang, string>> = {}
        const metaUpdates: Partial<Record<AppLang, 'auto' | 'manual'>> = {}
        for (const { lang, result } of results) {
          if (result) { i18nUpdates[lang] = result; metaUpdates[lang] = 'auto' }
        }
        mutateItems((items) =>
          items.map((i) =>
            isFixedExpense(i) && i.id === itemId && i.name === name
              ? {
                  ...i,
                  nameI18n: { ...(i.nameI18n || {}), ...i18nUpdates },
                  nameI18nMeta: { ...(i.nameI18nMeta || {}), ...metaUpdates },
                }
              : i
          )
        )
        await pushData()
      },
    )
  }

  async function addOneTime({ name, date, amount }: { name: string; date: string; amount: number }): Promise<void> {
    if (!name || !date || !amount) return
    const lang = currentLang()
    const id = nextOteId()
    const ote: OneTimeExpenseItem = {
      id,
      type: 'one_time_expense',
      name,
      amount,
      due_date: date,
      frequency: 'one_time',
      nameLang: lang,
      nameI18n: { [lang]: name },
      nameI18nMeta: { [lang]: 'manual' },
    }
    mutateItems((items) => [...items, ote])
    ;(await pushData()) ? toast('toast.expenseAdded') : toast('toast.expenseAddedErr', 'err')
    backgroundTranslateOneTime(id, name, lang)
  }

  /** Edit upcoming · either FixedExpenseItem (source='fixed_expense' / 'debt_minimum') or OneTimeExpenseItem. */
  async function saveEdit(p: {
    source: string
    _id?: string
    _key: string
    _buf?: { name: string; date: string; amt: number }
    name?: string
    nameI18n?: Partial<Record<AppLang, string>>
    nameI18nMeta?: Partial<Record<AppLang, 'auto' | 'manual'>>
    _translations?: Partial<Record<AppLang, TranslationDecision>>
  }): Promise<void> {
    const buf = p._buf
    if (!buf?.name || !buf.date || !buf.amt || !p._id) return
    const currentLocale = currentLang()

    let rawName: string
    let updatedNameI18n: Partial<Record<AppLang, string>> | undefined
    let updatedNameI18nMeta: Partial<Record<AppLang, 'auto' | 'manual'>> | undefined
    const autoLangs: AppLang[] = []

    if (p.nameI18n) {
      const newI18n: Partial<Record<AppLang, string>> = { ...p.nameI18n, [currentLocale]: buf.name }
      const newMeta: Partial<Record<AppLang, 'auto' | 'manual'>> = { ...(p.nameI18nMeta || {}), [currentLocale]: 'manual' }
      rawName = currentLocale === 'vi' ? buf.name : (p.name ?? buf.name)
      for (const otherLang of ALL_LANGS.filter((l) => l !== currentLocale)) {
        const decision = p._translations?.[otherLang]
        if (decision) {
          if (decision.action === 'auto' && decision.value) { newI18n[otherLang] = decision.value; newMeta[otherLang] = 'auto' }
          else if (decision.action === 'manual' && decision.value) { newI18n[otherLang] = decision.value; newMeta[otherLang] = 'manual' }
        } else if ((p.nameI18nMeta?.[otherLang] === 'auto') || !p.nameI18nMeta?.[otherLang]) {
          autoLangs.push(otherLang)
        }
      }
      updatedNameI18n = newI18n
      updatedNameI18nMeta = newMeta
    } else {
      rawName = buf.name
    }

    const oldKey = p._key
    const newKey = buf.date + ':' + rawName

    if (p.source === 'one_time_expense') {
      mutateItems((items) =>
        items.map((i) =>
          isOneTimeExpense(i) && i.id === p._id
            ? {
                ...i,
                name: rawName,
                ...(updatedNameI18n !== undefined ? { nameI18n: updatedNameI18n } : {}),
                ...(updatedNameI18nMeta !== undefined ? { nameI18nMeta: updatedNameI18nMeta } : {}),
                due_date: buf.date,
                amount: buf.amt,
              }
            : i
        )
      )
    } else if (p.source === 'fixed_expense') {
      mutateItems((items) =>
        items.map((i) => {
          if (!isFixedExpense(i) || i.id !== p._id) return i
          const newCat = (rawName || '').toLowerCase().includes('minimum')
            ? 'debt_minimum'
            : (i.cat === 'debt_minimum' ? null : i.cat)
          return {
            ...i,
            name: rawName,
            ...(updatedNameI18n !== undefined ? { nameI18n: updatedNameI18n } : {}),
            ...(updatedNameI18nMeta !== undefined ? { nameI18nMeta: updatedNameI18nMeta } : {}),
            due_date: buf.date,
            amount: buf.amt,
            cat: newCat,
          }
        })
      )
    } else if (p.source === 'debt_minimum') {
      // Update DebtItem.minimum_payment + due_date
      mutateItems((items) =>
        items.map((i) =>
          isDebt(i) && i.id === p._id
            ? { ...i, minimum_payment: buf.amt, due_date: buf.date }
            : i
        )
      )
    }

    // Migrate paid key nếu đã từng paid
    if (oldKey !== newKey) {
      mutateItems((items) =>
        items.map((i) =>
          isPaymentRecord(i) && i.key === oldKey
            ? { ...i, key: newKey, due_date: buf.date }
            : i
        )
      )
    }

    ;(await pushData()) ? toast('toast.upcomingUpdated') : toast('toast.upcomingUpdatedErr', 'err')

    if (autoLangs.length > 0 && p._id) {
      if (p.source === 'one_time_expense') backgroundTranslateOneTimePartial(p._id, rawName, currentLocale, autoLangs)
      else if (p.source === 'fixed_expense') backgroundTranslateFixedExpensePartial(p._id, rawName, currentLocale, autoLangs)
    }
  }

  async function deleteUpcoming(p: { source: string; _id?: string; _key: string }): Promise<void> {
    if (!p._id) return
    if (p.source === 'one_time_expense') {
      mutateItems((items) => items.filter((i) => !(isOneTimeExpense(i) && i.id === p._id)))
    } else if (p.source === 'fixed_expense') {
      mutateItems((items) => items.filter((i) => !(isFixedExpense(i) && i.id === p._id)))
    } else {
      return
    }
    ;(await pushData()) ? toast('toast.upcomingDeleted') : toast('toast.upcomingDeletedErr', 'err')
  }

  /**
   * Toggle paid status cho 1 obligation (key = "YYYY-MM-DD:name").
   * Mark paid: tạo PaymentRecord + ExpenseLog(cat=thanhToan, ref_id=key) + giảm cash + giảm debt
   * Un-mark: xoá PaymentRecord + ExpenseLog match + hồi cash + hồi debt
   */
  async function togglePaid(key: string, amt: number, obName?: string): Promise<void> {
    const existing = d.value.items.find(
      (i): i is PaymentRecordItem => isPaymentRecord(i) && i.key === key
    )
    const debtId = obName ? findDebtId(obName) : null
    const obTag = 'ob:' + key

    if (existing) {
      // UN-MARK: remove payment_record + expense_log + restore cash + restore debt
      mutateItems((items) =>
        items.filter((i) => {
          if (isPaymentRecord(i) && i.key === key) return false
          if (isExpenseLog(i) && i.ref_id === obTag) return false
          return true
        })
      )
      // Restore cash: add back the paid amount
      mutateItems((items) =>
        items.map((i) =>
          isAccount(i) ? { ...i, amount: (i.amount || 0) + amt } : i
        )
      )
      if (debtId) {
        mutateItems((items) =>
          items.map((i) =>
            isDebt(i) && i.id === debtId
              ? { ...i, amount: (i.amount || 0) + amt }
              : i
          )
        )
      }
      ;(await pushData()) ? toast('toast.undoPaid') : toast('toast.payErr', 'err')
    } else {
      // MARK: create payment_record + expense_log + reduce cash + reduce debt
      const dateStr = key.split(':')[0] || tStr()
      const payDesc = obName || 'Thanh toán'
      const payLang = currentLang()

      const pr: PaymentRecordItem = {
        id: nextPayId(),
        type: 'payment_record',
        name: payDesc,
        amount: amt,
        due_date: dateStr,
        key,
        ref_id: debtId,
        ref_type: debtId ? 'debt' : null,
        nameLang: payLang,
        nameI18n: { [payLang]: payDesc },
      }
      const exp: ExpenseLogItem = {
        id: nextExpId(),
        type: 'expense_log',
        name: payDesc,
        amount: amt,
        cat: 'thanhToan',
        due_date: tStr(),
        pay_method: null,
        currency: null,
        time: null,
        note: null,
        ref_id: obTag,
        nameLang: payLang,
        nameI18n: { [payLang]: payDesc },
      }
      mutateItems((items) => [pr, exp, ...items])
      // Reduce cash + debt
      mutateItems((items) =>
        items.map((i) => {
          if (isAccount(i)) return { ...i, amount: Math.max(0, (i.amount || 0) - amt) }
          if (isDebt(i) && debtId && i.id === debtId) return { ...i, amount: Math.max(0, (i.amount || 0) - amt) }
          return i
        })
      )
      ;(await pushData()) ? toast('toast.paid') : toast('toast.payErr', 'err')
    }
  }

  async function handlePopupSaveUpcoming(p: Parameters<typeof saveEdit>[0]): Promise<void> {
    await saveEdit(p)
  }

  return { cleanupPastPaid, recPay, addOneTime, saveEdit, deleteUpcoming, togglePaid, handlePopupSaveUpcoming }
}
