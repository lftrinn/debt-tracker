import { ref } from 'vue'
import type { Ref } from 'vue'
import {
  type AppData,
  type ExpenseLogItem,
  type IncomeLogItem,
  type Item,
  isAccount,
  isDebt,
  isExpenseLog,
  isIncomeLog,
} from '@/types/data'
import type { ToastType } from '../ui/useToast'
import { useCurrency } from '../api/useCurrency'
import type { Currency } from '../api/useCurrency'
import { i18n } from '../../i18n'
import { translateToAll, translateText, ALL_LANGS } from '../api/useTranslation'
import type { AppLang } from '../api/useTranslation'

/** Quyết định dịch từ review step của DetailPopup */
export interface TranslationDecision {
  action: 'keep' | 'auto' | 'manual'
  value?: string | null
}

export interface CopyTxData {
  desc: string
  amount: number
  cat: string
  type: 'exp' | 'inc'
}

/** Generate string ID prefix `tx_e_<timestamp>` / `tx_i_<timestamp>`. */
function nextTxId(prefix: 'tx_e_' | 'tx_i_'): string {
  return prefix + Date.now()
}

/**
 * Add/edit/delete expense_log + income_log items. Tự động cập nhật:
 *   - DebtItem.amount khi expense charged on credit card
 *   - primaryAccount.amount khi income được thêm
 * Mọi balance update quy về VND qua `useCurrency.toVnd`.
 */
export function useTransactions(
  d: Ref<AppData>,
  pushData: () => Promise<boolean>,
  toast: (msg: string, type?: ToastType) => void,
  tStr: () => string,
) {
  const copyTxData = ref<CopyTxData | null>(null)
  const { toVnd, baseCurrency } = useCurrency()

  function currentLang(): AppLang {
    return (i18n.global.locale as { value: string }).value as AppLang
  }

  /**
   * Mutate items[] qua callback — replaces reactive ref to trigger reactivity.
   * Each call completes a logical mutation unit; pushData should be called externally.
   */
  function mutateItems(fn: (items: Item[]) => Item[]): void {
    d.value = { ...d.value, items: fn(d.value.items) }
  }

  /** Update primaryAccount (account[0]) amount by delta. */
  function adjustAccount(delta: number): void {
    mutateItems((items) => {
      let done = false
      return items.map((i) => {
        if (!done && isAccount(i)) {
          done = true
          return { ...i, amount: Math.max(0, (i.amount || 0) + delta) }
        }
        return i
      })
    })
  }

  /** Update DebtItem.amount by delta (positive = increase debt, negative = pay down). */
  function adjustDebt(debtId: string, delta: number): void {
    mutateItems((items) =>
      items.map((i) => {
        if (isDebt(i) && i.id === debtId) {
          return { ...i, amount: Math.max(0, (i.amount || 0) + delta) }
        }
        return i
      })
    )
  }

  /** Background translate description and patch the matching log item. */
  function backgroundTranslate(id: string, desc: string, lang: AppLang): void {
    if (!desc.trim()) return
    translateToAll(desc, lang).then(async (translations) => {
      const meta: Partial<Record<AppLang, 'auto' | 'manual'>> = {}
      for (const l of ALL_LANGS) {
        if (translations[l]) meta[l] = l === lang ? 'manual' : 'auto'
      }
      mutateItems((items) =>
        items.map((i) => {
          if ((isExpenseLog(i) || isIncomeLog(i)) && i.id === id && i.name === desc) {
            return { ...i, nameI18n: translations, nameI18nMeta: meta }
          }
          return i
        })
      )
      await pushData()
    })
  }

  function backgroundTranslatePartial(id: string, desc: string, from: AppLang, targetLangs: AppLang[]): void {
    if (!desc.trim() || targetLangs.length === 0) return
    Promise.all(targetLangs.map((lang) => translateText(desc, from, lang).then((r) => ({ lang, result: r })))).then(
      async (results) => {
        const i18nUpdates: Partial<Record<AppLang, string>> = {}
        const metaUpdates: Partial<Record<AppLang, 'auto' | 'manual'>> = {}
        for (const { lang, result } of results) {
          if (result) { i18nUpdates[lang] = result; metaUpdates[lang] = 'auto' }
        }
        mutateItems((items) =>
          items.map((i) => {
            if ((isExpenseLog(i) || isIncomeLog(i)) && i.id === id && i.name === desc) {
              return {
                ...i,
                nameI18n: { ...(i.nameI18n || {}), ...i18nUpdates },
                nameI18nMeta: { ...(i.nameI18nMeta || {}), ...metaUpdates },
              }
            }
            return i
          })
        )
        await pushData()
      },
    )
  }

  async function addExp({ desc, amount, cat, payMethod, currency, date, note, time }: {
    desc: string; amount: number; cat: string; payMethod?: string; currency?: string; date?: string; note?: string; time?: string
  }): Promise<void> {
    const isCash = !payMethod || payMethod === 'cash'
    const txCur = (currency || baseCurrency.value) as Currency
    const lang = currentLang()
    const id = nextTxId('tx_e_')

    const exp: ExpenseLogItem = {
      id,
      type: 'expense_log',
      name: desc,
      amount,
      cat,
      due_date: date || tStr(),
      pay_method: payMethod || 'cash',
      currency: txCur,
      time: time ?? null,
      note: note ?? null,
      ref_id: null,
      nameLang: lang,
      nameI18n: { [lang]: desc },
      nameI18nMeta: { [lang]: 'manual' },
    }
    mutateItems((items) => [exp, ...items])

    if (!isCash && payMethod) {
      adjustDebt(payMethod, toVnd(amount, txCur))
    }

    ;(await pushData()) ? toast('toast.expAdded') : toast('toast.expAddedErr', 'err')
    backgroundTranslate(id, desc, lang)
  }

  async function addInc({ desc, amount, cat, currency, date, note, time }: {
    desc: string; amount: number; cat: string; currency?: string; date?: string; note?: string; time?: string
  }): Promise<void> {
    const txCur = (currency || baseCurrency.value) as Currency
    const lang = currentLang()
    const id = nextTxId('tx_i_')

    const inc: IncomeLogItem = {
      id,
      type: 'income_log',
      name: desc,
      amount,
      cat,
      due_date: date || tStr(),
      currency: txCur,
      time: time ?? null,
      note: note ?? null,
      nameLang: lang,
      nameI18n: { [lang]: desc },
      nameI18nMeta: { [lang]: 'manual' },
    }
    mutateItems((items) => [inc, ...items])

    adjustAccount(toVnd(amount, txCur))

    ;(await pushData()) ? toast('toast.incAdded') : toast('toast.incAddedErr', 'err')
    backgroundTranslate(id, desc, lang)
  }

  async function deleteTx(e: { id: string; type: string }): Promise<void> {
    const target = d.value.items.find((i) => i.id === e.id)
    if (!target) return

    if (e.type === 'inc' && isIncomeLog(target)) {
      const incVnd = toVnd(target.amount || 0, (target.currency || baseCurrency.value) as Currency)
      mutateItems((items) => items.filter((i) => i.id !== e.id))
      adjustAccount(-incVnd)
    } else if (isExpenseLog(target)) {
      const expVnd = toVnd(target.amount || 0, (target.currency || baseCurrency.value) as Currency)
      mutateItems((items) => items.filter((i) => i.id !== e.id))
      if (target.pay_method && target.pay_method !== 'cash') {
        adjustDebt(target.pay_method, -expVnd)
      }
    } else {
      return
    }

    ;(await pushData()) ? toast('toast.txDeleted') : toast('toast.txDeletedErr', 'err')
  }

  async function handlePopupSaveTx(item: {
    id: string
    type: string
    _buf: { name: string; date: string; amt: number; cat: string; note?: string; time?: string }
    _translations?: Partial<Record<AppLang, TranslationDecision>>
    descI18n?: Partial<Record<AppLang, string>>
    descI18nMeta?: Partial<Record<AppLang, 'auto' | 'manual'>>
  }): Promise<void> {
    const buf = item._buf
    const lang = currentLang()
    const existingI18n = item.descI18n || {}
    const existingMeta = item.descI18nMeta || {}

    const newI18n: Partial<Record<AppLang, string>> = { ...existingI18n, [lang]: buf.name }
    const newMeta: Partial<Record<AppLang, 'auto' | 'manual'>> = { ...existingMeta, [lang]: 'manual' }
    const autoLangs: AppLang[] = []

    for (const otherLang of ALL_LANGS.filter((l) => l !== lang)) {
      const decision = item._translations?.[otherLang]
      if (decision) {
        if (decision.action === 'auto' && decision.value) {
          newI18n[otherLang] = decision.value
          newMeta[otherLang] = 'auto'
        } else if (decision.action === 'manual' && decision.value) {
          newI18n[otherLang] = decision.value
          newMeta[otherLang] = 'manual'
        }
      } else if (existingMeta[otherLang] === 'auto' || !existingMeta[otherLang]) {
        autoLangs.push(otherLang)
      }
    }

    const newNote = buf.note?.trim() || null
    const newTime = buf.time || null

    if (item.type === 'inc') {
      const old = d.value.items.find((i): i is IncomeLogItem => isIncomeLog(i) && i.id === item.id)
      if (!old) return
      const txCur = (old.currency || baseCurrency.value) as Currency
      const oldVnd = toVnd(old.amount || 0, txCur)
      const newVnd = toVnd(buf.amt, txCur)
      const amtDiff = newVnd - oldVnd
      mutateItems((items) =>
        items.map((i) =>
          isIncomeLog(i) && i.id === item.id
            ? { ...i, name: buf.name, due_date: buf.date, amount: buf.amt, cat: buf.cat,
                nameLang: lang, nameI18n: newI18n, nameI18nMeta: newMeta, note: newNote, time: newTime }
            : i
        )
      )
      adjustAccount(amtDiff)
    } else {
      mutateItems((items) =>
        items.map((i) =>
          isExpenseLog(i) && i.id === item.id
            ? { ...i, name: buf.name, due_date: buf.date, amount: buf.amt, cat: buf.cat,
                nameLang: lang, nameI18n: newI18n, nameI18nMeta: newMeta, note: newNote, time: newTime }
            : i
        )
      )
    }

    ;(await pushData()) ? toast('toast.txUpdated') : toast('toast.txUpdatedErr', 'err')
    backgroundTranslatePartial(item.id, buf.name, lang, autoLangs)
  }

  return { copyTxData, addExp, addInc, deleteTx, handlePopupSaveTx }
}
