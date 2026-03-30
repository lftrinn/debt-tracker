import { ref } from 'vue'
import type { Ref } from 'vue'
import type { AppData, DebtRef } from '@/types/data'
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

/**
 * Xử lý các hành động thêm, sửa, xóa giao dịch chi tiêu và thu nhập.
 * Tự động cập nhật số dư thẻ tín dụng / tiền mặt (luôn quy đổi về VND cho balance).
 * Ghi nhận ngôn ngữ gốc và tự động dịch mô tả sang các ngôn ngữ còn lại trong background.
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

  /** Locale hiện tại của app, dùng để ghi descLang khi tạo giao dịch mới */
  function currentLang(): AppLang {
    return (i18n.global.locale as { value: string }).value as AppLang
  }

  /**
   * Tự động dịch desc sang các ngôn ngữ còn lại trong background sau khi đã lưu.
   * Cập nhật descI18n trên record có id tương ứng trong mảng chỉ định.
   * Không block UI, không toast — thất bại im lặng.
   */
  function backgroundTranslate(
    id: number,
    desc: string,
    lang: AppLang,
    listKey: 'expenses' | 'incomes',
  ): void {
    if (!desc.trim()) return
    translateToAll(desc, lang).then(async (translations) => {
      // Guard: nếu item đã được edit (desc thay đổi) kể từ khi translate bắt đầu,
      // bỏ qua bản dịch stale này để tránh overwrite descI18n mới hơn.
      const current = (d.value[listKey] as Array<{ id: number; desc?: string }>).find((x) => x.id === id)
      if (!current || current.desc !== desc) return
      // Build meta: ngôn ngữ nguồn = manual, các ngôn ngữ được dịch tự động = auto
      const meta: Partial<Record<AppLang, 'auto' | 'manual'>> = {}
      for (const l of ALL_LANGS) {
        if (translations[l]) meta[l] = l === lang ? 'manual' : 'auto'
      }
      d.value = {
        ...d.value,
        [listKey]: (d.value[listKey] as Array<{ id: number; descI18n?: unknown; descI18nMeta?: unknown }>).map((x) =>
          x.id === id ? { ...x, descI18n: translations, descI18nMeta: meta } : x
        ),
      }
      await pushData()
    })
  }

  /**
   * Dịch lại một số ngôn ngữ cụ thể trong background (dùng sau khi edit với một số lang đã được dịch auto).
   * Chỉ cập nhật các lang trong targetLangs, không đụng đến manual langs.
   */
  function backgroundTranslatePartial(
    id: number,
    desc: string,
    from: AppLang,
    listKey: 'expenses' | 'incomes',
    targetLangs: AppLang[],
  ): void {
    if (!desc.trim() || targetLangs.length === 0) return
    Promise.all(targetLangs.map((lang) => translateText(desc, from, lang).then((r) => ({ lang, result: r })))).then(
      async (results) => {
        const current = (d.value[listKey] as Array<{ id: number; desc?: string }>).find((x) => x.id === id)
        if (!current || current.desc !== desc) return
        const i18nUpdates: Partial<Record<AppLang, string>> = {}
        const metaUpdates: Partial<Record<AppLang, 'auto' | 'manual'>> = {}
        for (const { lang, result } of results) {
          if (result) { i18nUpdates[lang] = result; metaUpdates[lang] = 'auto' }
        }
        d.value = {
          ...d.value,
          [listKey]: (d.value[listKey] as Array<{ id: number; descI18n?: unknown; descI18nMeta?: unknown }>).map((x) =>
            x.id === id
              ? { ...x, descI18n: { ...(x.descI18n as object || {}), ...i18nUpdates }, descI18nMeta: { ...(x.descI18nMeta as object || {}), ...metaUpdates } }
              : x
          ),
        }
        await pushData()
      },
    )
  }

  /**
   * Thêm khoản chi tiêu mới.
   * Amount lưu nguyên theo currency được chọn; card balance luôn cập nhật bằng VND.
   * descLang và descI18n được ghi nhận theo locale hiện tại; bản dịch chạy background.
   */
  async function addExp({ desc, amount, cat, payMethod, currency, note, tags, time }: { desc: string; amount: number; cat: string; payMethod?: string; currency?: string; note?: string; tags?: string[]; time?: string }): Promise<void> {
    const isCash = !payMethod || payMethod === 'cash'
    const txCur = (currency || baseCurrency.value) as Currency
    const lang = currentLang()
    const id = Date.now()
    const e = {
      id,
      desc,
      amount,
      cat,
      date: tStr(),
      payMethod: payMethod || 'cash',
      currency: txCur,
      descLang: lang,
      descI18n: { [lang]: desc } as Partial<Record<AppLang, string>>,
      descI18nMeta: { [lang]: 'manual' as const } as Partial<Record<AppLang, 'auto' | 'manual'>>,
      ...(note ? { note } : {}),
      ...(tags?.length ? { tags } : {}),
      ...(time ? { time } : {}),
    }
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
    // Dịch background sau khi đã lưu thành công
    backgroundTranslate(id, desc, lang, 'expenses')
  }

  /**
   * Thêm khoản thu nhập và cập nhật số dư tiền mặt (cash balance luôn theo VND).
   * descLang và descI18n được ghi nhận theo locale hiện tại; bản dịch chạy background.
   */
  async function addInc({ desc, amount, cat, currency, note, tags, time }: { desc: string; amount: number; cat: string; currency?: string; note?: string; tags?: string[]; time?: string }): Promise<void> {
    const txCur = (currency || baseCurrency.value) as Currency
    const lang = currentLang()
    const id = Date.now()
    const e = {
      id,
      desc,
      amount,
      cat,
      date: tStr(),
      currency: txCur,
      descLang: lang,
      descI18n: { [lang]: desc } as Partial<Record<AppLang, string>>,
      descI18nMeta: { [lang]: 'manual' as const } as Partial<Record<AppLang, 'auto' | 'manual'>>,
      ...(note ? { note } : {}),
      ...(tags?.length ? { tags } : {}),
      ...(time ? { time } : {}),
    }
    d.value = { ...d.value, incomes: [e, ...(d.value.incomes || [])] }
    // Cash balance luôn theo VND — quy đổi nếu thu nhập ở ngoại tệ
    const amountVnd = toVnd(amount, txCur)
    d.value = { ...d.value, current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amountVnd } }
    ;(await pushData()) ? toast('toast.incAdded') : toast('toast.incAddedErr', 'err')
    backgroundTranslate(id, desc, lang, 'incomes')
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
   * Xử lý quyết định dịch từ review step: 'auto' lang được dịch lại, 'manual' dùng giá trị user nhập, 'keep' giữ nguyên.
   * @param item - Đối tượng giao dịch với dữ liệu chỉnh sửa trong _buf và _translations từ review step
   */
  async function handlePopupSaveTx(item: {
    id: number
    type: string
    _buf: { name: string; date: string; amt: number; cat: string; note?: string; tags?: string; time?: string }
    _translations?: Partial<Record<AppLang, TranslationDecision>>
    descI18n?: Partial<Record<AppLang, string>>
    descI18nMeta?: Partial<Record<AppLang, 'auto' | 'manual'>>
  }): Promise<void> {
    const buf = item._buf
    const lang = currentLang()
    const existingI18n = item.descI18n || {}
    const existingMeta = item.descI18nMeta || {}

    // Build descI18n và meta mới: bắt đầu từ existing, cập nhật theo decisions
    const newDescI18n: Partial<Record<AppLang, string>> = { ...existingI18n, [lang]: buf.name }
    const newDescI18nMeta: Partial<Record<AppLang, 'auto' | 'manual'>> = { ...existingMeta, [lang]: 'manual' }
    const autoLangs: AppLang[] = []

    for (const otherLang of ALL_LANGS.filter((l) => l !== lang)) {
      const decision = item._translations?.[otherLang]
      if (decision) {
        if (decision.action === 'auto' && decision.value) {
          newDescI18n[otherLang] = decision.value
          newDescI18nMeta[otherLang] = 'auto'
        } else if (decision.action === 'manual' && decision.value) {
          newDescI18n[otherLang] = decision.value
          newDescI18nMeta[otherLang] = 'manual'
        }
        // action='keep': giữ nguyên existing values và meta (đã copy ở trên)
      } else if (existingMeta[otherLang] === 'auto' || !existingMeta[otherLang]) {
        // Không có decision → ngôn ngữ này là 'auto' mode → dịch lại background
        autoLangs.push(otherLang)
      }
      // Nếu existing meta = 'manual' và không có decision → đã được handled ở review step
    }

    const listKey = item.type === 'inc' ? 'incomes' : 'expenses'
    // Parse note/tags/time từ buf (undefined nếu rỗng để JSON.stringify loại bỏ)
    const newNote = buf.note?.trim() || undefined
    const newTags = (() => {
      const tags = (buf.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
      return tags.length ? tags : undefined
    })()
    const newTime = buf.time || undefined

    if (item.type === 'inc') {
      const old = (d.value.incomes || []).find((i) => i.id === item.id)
      const txCur = (old?.currency || baseCurrency.value) as Currency
      const oldVnd = toVnd(old?.amount || 0, txCur)
      const newVnd = toVnd(buf.amt, txCur)
      const amtDiff = newVnd - oldVnd
      d.value = {
        ...d.value,
        incomes: (d.value.incomes || []).map((i) =>
          i.id === item.id
            ? { ...i, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat, descLang: lang, descI18n: newDescI18n, descI18nMeta: newDescI18nMeta, note: newNote, tags: newTags, time: newTime }
            : i
        ),
        current_cash: { ...d.value.current_cash, balance: (d.value.current_cash?.balance || 0) + amtDiff },
      }
    } else {
      d.value = {
        ...d.value,
        expenses: (d.value.expenses || []).map((i) =>
          i.id === item.id
            ? { ...i, desc: buf.name, date: buf.date, amount: buf.amt, cat: buf.cat, descLang: lang, descI18n: newDescI18n, descI18nMeta: newDescI18nMeta, note: newNote, tags: newTags, time: newTime }
            : i
        ),
      }
    }
    ;(await pushData()) ? toast('toast.txUpdated') : toast('toast.txUpdatedErr', 'err')
    // Dịch lại background các 'auto' langs
    backgroundTranslatePartial(item.id, buf.name, lang, listKey, autoLangs)
  }

  return { copyTxData, addExp, addInc, deleteTx, handlePopupSaveTx }
}
