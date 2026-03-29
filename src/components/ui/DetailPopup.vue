<template>
  <Transition name="popup">
    <div v-if="item" class="popup-overlay" :style="overlayStyle" @click.self="$emit('close')">
      <div
        class="popup-sheet"
        ref="sheetRef"
        :style="sheetStyle"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- Drag handle -->
        <div class="popup-handle"><div class="popup-handle-bar"></div></div>

        <!-- Header -->
        <div class="popup-hdr">
          <span class="popup-title">{{ editing ? $t('detail.edit') : $t('detail.view') }}</span>
          <button class="popup-close" @click="$emit('close')"><Icon name="x" :size="18" /></button>
        </div>

        <!-- VIEW MODE -->
        <template v-if="!editing">
          <div class="popup-body">
            <!-- Icon / urgency indicator -->
            <div class="popup-hero">
              <span v-if="item._variant === 'upcoming'" class="popup-badge" :class="item.paid ? 'ok' : item.urg">
                <template v-if="item.paid"><Icon name="check" :size="12" /> {{ $t('detail.paid') }}</template>
                <template v-else>{{ item.urg === 'urgent' ? $t('detail.urgent') : item.urg === 'soon' ? $t('detail.soon') : $t('detail.normal') }}</template>
              </span>
              <span v-else class="popup-badge" :class="item.type === 'inc' ? 'income' : 'expense'">
                <Icon :name="resolveCat(item.cat).icon" :size="13" /> · {{ resolveCat(item.cat).label }} · {{ item.type === 'inc' ? $t('detail.income') : $t('detail.expense') }}
              </span>
            </div>

            <!-- Name -->
            <div class="popup-name">{{ item._variant === 'upcoming' ? getLocalized(item, 'name') : getLocalized(item, 'desc', locale) }}</div>

            <!-- Amount -->
            <div class="popup-amt" :class="item._variant === 'tx' ? (item.type === 'inc' ? 'inc' : 'exp') : 'exp'">
              <template v-if="hide">•••••</template>
              <template v-else>
                <template v-if="item._variant === 'tx'">{{ item.type === 'inc' ? '+' : '-' }}{{ fCurrFull(item.amount || item.amt) }}</template>
                <template v-else>{{ fCurrFull(item.amt || item.amount) }}</template>
              </template>
            </div>

            <!-- Details rows -->
            <div class="popup-details">
              <div class="popup-row">
                <span class="popup-label">{{ $t('detail.dateLabel') }}</span>
                <span class="popup-val">{{ fDate(item._date || item.date) }}</span>
              </div>
              <div v-if="item.sub" class="popup-row">
                <span class="popup-label">{{ $t('detail.typeLabel') }}</span>
                <span class="popup-val">{{ item.sub }}</span>
              </div>
              <div v-if="item._variant === 'upcoming' && !hide" class="popup-row">
                <span class="popup-label">{{ $t('detail.availCash') }}</span>
                <span class="popup-val" :style="availCash < (item.amt || 0) ? { color: 'var(--accent2)' } : {}">{{ fCurrFull(availCash) }}</span>
              </div>
              <div v-if="item._variant === 'upcoming' && !hide && !item.paid && availCash < (item.amt || 0)" class="popup-row">
                <span class="popup-label">{{ $t('detail.shortfall') }}</span>
                <span class="popup-val" style="color:var(--accent2)">{{ fCurrFull((item.amt || 0) - availCash) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="popup-actions">
            <button v-if="item._variant === 'upcoming'" class="popup-btn primary" :class="{ done: item.paid }" :disabled="!item.paid && availCash < (item.amt || 0)" @click="$emit('toggle-paid', item._key, item.amt, item.name)">
              <template v-if="item.paid"><Icon name="undo-2" :size="14" /> {{ $t('detail.undoPay') }}</template>
              <template v-else><Icon name="check" :size="14" /> {{ $t('detail.pay') }}</template>
            </button>
            <div style="display:flex;gap:8px">
              <button v-if="canCopy" class="popup-btn secondary" style="flex:1" @click="handleCopy"><Icon name="copy" :size="14" /> {{ $t('detail.copy') }}</button>
              <button class="popup-btn secondary" style="flex:1" @click="startEdit"><Icon name="pencil" :size="14" /> {{ $t('detail.editBtn') }}</button>
            </div>
            <button v-if="canDelete" class="popup-btn danger" @click="$emit('delete', item)"><Icon name="trash-2" :size="14" /> {{ $t('detail.delete') }}</button>
          </div>
        </template>

        <!-- EDIT MODE -->
        <template v-else-if="editing">
          <div class="popup-body">
            <!-- CC payment level selector (edit mode) -->
            <div v-if="isCcItem" class="popup-field">
              <label class="popup-label">{{ $t('detail.payLevel') }}</label>
              <div style="display:flex;gap:4px;background:var(--surface2);border-radius:8px;padding:2px">
                <button :class="['tab-btn', editPayLevel === 'min' ? 'active' : '']" style="flex:1;font-size:10px;padding:5px 0" @click="editPayLevel = 'min'">
                  {{ $t('detail.minimum') }}{{ matchedCard && !hide ? ' (' + fCurr(matchedCard.min) + ')' : '' }}
                </button>
                <button :class="['tab-btn', editPayLevel === 'custom' ? 'active' : '']" style="flex:1;font-size:10px;padding:5px 0" @click="editPayLevel = 'custom'">
                  {{ $t('detail.custom') }}
                </button>
              </div>
            </div>
            <div class="popup-field">
              <label class="popup-label">{{ item._variant === 'upcoming' ? $t('detail.nameUpcoming') : $t('detail.nameDesc') }}</label>
              <input class="popup-input" v-model="buf.name" :readonly="isCcItem" :style="isCcItem ? { opacity: '.7' } : {}" :placeholder="$t('detail.namePlaceholder')" />
            </div>
            <div class="popup-field">
              <label class="popup-label">{{ $t('detail.dateLabel') }}</label>
              <div class="date-wrap">
                <input type="date" class="popup-input popup-input--date" v-model="buf.date" :max="item._variant === 'tx' ? tStr() : undefined" placeholder="dd/mm/yyyy" />
              </div>
            </div>
            <div class="popup-field">
              <label class="popup-label">{{ $t('detail.amountLabel') }}</label>
              <!-- Dual mode: 2 inputs cùng 1 hàng khi currency khác nhau -->
              <div v-if="showDisplayEquiv" class="detail__dual-row">
                <div class="detail__input-wrap">
                  <input class="popup-input" v-model.number="buf.amt" type="number" inputmode="numeric" :placeholder="txCurrency || '0'" @input="onNativeAmtInput" />
                  <span v-if="txCurrency" class="detail__input-suffix">{{ txCurrency }}</span>
                </div>
                <span class="detail__dual-sep">≈</span>
                <div class="detail__input-wrap">
                  <input class="popup-input" v-model.number="bufDisplayAmt" type="number" inputmode="numeric" :placeholder="'≈ ' + displayCurrency" @input="onDisplayAmtInput" />
                  <span class="detail__input-suffix">{{ displayCurrency }}</span>
                </div>
              </div>
              <div v-else class="detail__input-wrap">
                <input class="popup-input" v-model.number="buf.amt" type="number" inputmode="numeric" placeholder="0" @input="onNativeAmtInput" />
                <span v-if="txCurrency" class="detail__input-suffix">{{ txCurrency }}</span>
              </div>
            </div>
            <div v-if="item._variant === 'tx'" class="popup-field">
              <label class="popup-label">{{ $t('detail.categoryLabel') }}</label>
              <select class="popup-input" v-model="buf.cat" style="font-family:var(--sans);font-size:12px">
                <optgroup :label="$t('detail.categoryExpense')">
                  <option v-for="c in expenseCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
                </optgroup>
                <optgroup :label="$t('detail.categoryIncome')">
                  <option v-for="c in incomeCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div class="popup-actions">
            <button class="popup-btn primary" @click="handleSave">{{ $t('detail.saveButton') }}</button>
            <button class="popup-btn secondary" @click="editing = false">{{ $t('detail.cancelButton') }}</button>
          </div>
        </template>

        <!-- REVIEW STEP: xử lý bản dịch các ngôn ngữ manual sau khi edit -->
        <template v-else-if="reviewStep">
          <div class="popup-body">
            <p class="review__subtitle">{{ $t('detail.review.subtitle') }}</p>
            <div v-for="entry in reviewPending" :key="entry.lang" class="review__lang-block">
              <div class="review__lang-header">
                <span class="review__lang-label">{{ $t('detail.review.langLabel.' + entry.lang) }}</span>
                <div class="review__options">
                  <button
                    v-for="opt in ['keep', 'auto', 'manual']"
                    :key="opt"
                    :class="['review__opt-btn', reviewDecisions[entry.lang]?.action === opt ? 'active' : '']"
                    @click="setReviewAction(entry.lang, opt)"
                  >
                    {{ $t('detail.review.' + (opt === 'keep' ? 'keep' : opt === 'auto' ? 'autoTranslate' : 'manual')) }}
                  </button>
                </div>
              </div>
              <div class="detail__input-wrap" style="margin-top:6px">
                <input
                  class="popup-input"
                  :value="reviewInputValue(entry.lang)"
                  :readonly="reviewDecisions[entry.lang]?.action !== 'manual'"
                  :style="reviewDecisions[entry.lang]?.action !== 'manual' ? { opacity: '.7' } : {}"
                  :placeholder="reviewDecisions[entry.lang]?.action === 'auto' && autoTranslations[entry.lang] == null ? $t('detail.review.translating') : ''"
                  @input="(e) => onReviewInput(entry.lang, e.target.value)"
                />
              </div>
            </div>
          </div>
          <div class="popup-actions">
            <button class="popup-btn primary" @click="handleReviewSave">{{ $t('detail.review.saveAll') }}</button>
            <button class="popup-btn secondary" @click="reviewStep = false">{{ $t('detail.review.cancel') }}</button>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './Icon.vue'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCategories } from '../../composables/data/useCategories'
import { useCurrency } from '../../composables/api/useCurrency'
import { getLocalized } from '../../composables/data/useI18nData'
import { translateText, ALL_LANGS } from '../../composables/api/useTranslation'

const { locale } = useI18n()
const { fDate, tStr } = useFormatters()
const { resolveCat, expenseCategories, incomeCategories } = useCategories()
const { fCurr, fCurrFull, displayCurrency, baseCurrency, convertBetween, ratesLoading } = useCurrency()

const props = defineProps({
  item: [Object, null],
  availCash: { type: Number, default: 0 },
  hide: Boolean,
  debtCards: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'save-upcoming', 'save-tx', 'delete', 'toggle-paid', 'clone-item'])

const editing = ref(false)
const buf = ref({ name: '', date: '', amt: 0, cat: '' })
const editPayLevel = ref('min') // 'min' | 'custom' — only used for CC edit

// ─── Review step state ────────────────────────────────────────────────────
const reviewStep = ref(false)
/** Danh sách ngôn ngữ cần review (các ngôn ngữ manual != currentLocale) */
const reviewPending = ref([]) // Array<{ lang: AppLang, oldValue: string }>
/** Quyết định của user cho từng ngôn ngữ: { [lang]: { action: 'keep'|'auto'|'manual', value: string } } */
const reviewDecisions = ref({})
/** Auto-translations được prefetch khi bước review bắt đầu */
const autoTranslations = ref({})

// ─── Dual input (native currency ↔ display currency) ──────────────────────
/** Currency của giao dịch đang xem/edit; null nếu không có item */
const txCurrency = computed(() => {
  if (!props.item) return null
  if (props.item._variant === 'tx') return (props.item.currency || baseCurrency.value) || null
  // Upcoming items không có currency field — luôn là base currency
  return baseCurrency.value
})
/** Hiện dual input khi tx currency khác display currency và rates đã load */
const showDisplayEquiv = computed(() =>
  editing.value
  && txCurrency.value != null
  && txCurrency.value !== displayCurrency.value
  && !ratesLoading.value
)
/** Giá trị tương đương theo display currency (chỉ dùng trong edit mode) */
const bufDisplayAmt = ref(null)

let updatingFromDisplay = false

/** User chỉnh native amount → tính lại display equiv */
function onNativeAmtInput() {
  if (updatingFromDisplay) return
  if (buf.value.amt != null && txCurrency.value && txCurrency.value !== displayCurrency.value) {
    bufDisplayAmt.value = roundForCur(
      convertBetween(buf.value.amt, txCurrency.value, displayCurrency.value),
      displayCurrency.value
    )
  }
}

/** User chỉnh display equiv → tính ngược lại native amount */
function onDisplayAmtInput() {
  updatingFromDisplay = true
  if (bufDisplayAmt.value != null && txCurrency.value) {
    buf.value.amt = roundForCur(
      convertBetween(bufDisplayAmt.value, displayCurrency.value, txCurrency.value),
      txCurrency.value
    )
  }
  nextTick(() => { updatingFromDisplay = false })
}

/** Làm tròn số tiền theo loại currency */
function roundForCur(v, cur) {
  if (cur === 'USD') return Math.round(v * 100) / 100
  return Math.round(v)
}

/** Is this item a credit card payment? */
const isCcItem = computed(() => {
  if (!props.item || props.item._variant !== 'upcoming') return false
  const n = (props.item.name || '').toLowerCase()
  return (props.debtCards || []).some((c) => n.includes(c.name.toLowerCase()))
})

/** Get the matching card for this CC item */
const matchedCard = computed(() => {
  if (!isCcItem.value) return null
  const n = (props.item.name || '').toLowerCase()
  return (props.debtCards || []).find((c) => n.includes(c.name.toLowerCase())) || null
})

const canDelete = computed(() => {
  if (!props.item) return false
  if (props.item._variant === 'upcoming') {
    // Allow delete for non-installment upcoming items (including CC debt payments)
    const cat = props.item._category
    return cat !== 'installment'
  }
  return true
})

const canCopy = computed(() => {
  if (!props.item) return true
  // Hide copy for last installment period
  if (props.item._isLastPeriod) return false
  return true
})

watch(() => props.item, (v) => {
  editing.value = false
  reviewStep.value = false
  reviewPending.value = []
  reviewDecisions.value = {}
  autoTranslations.value = {}
  dragY.value = 0
  dragging.value = false
  dismissing.value = false
  document.body.style.overflow = v ? 'hidden' : ''
})

function startEdit() {
  const i = props.item
  if (i._variant === 'upcoming') {
    buf.value = { name: getLocalized(i, 'name'), date: i._date, amt: i.amt }
    // Detect CC payment level
    if (isCcItem.value) {
      const n = (i.name || '').toLowerCase()
      editPayLevel.value = n.includes('minimum') ? 'min' : 'custom'
    }
  } else {
    const resolved = resolveCat(i.cat)
    // Hiện bản dịch đúng locale khi edit — fallback về desc gốc nếu chưa có
    buf.value = { name: getLocalized(i, 'desc', locale.value), date: i.date, amt: i.amount, cat: resolved.key }
    // Populate display equiv nếu currencies khác nhau
    const cur = (i.currency || baseCurrency.value)
    if (cur !== displayCurrency.value && i.amount != null) {
      bufDisplayAmt.value = roundForCur(convertBetween(i.amount, cur, displayCurrency.value), displayCurrency.value)
    } else {
      bufDisplayAmt.value = null
    }
  }
  editing.value = true
}

/** Build CC payment name from card, date, and level (edit mode) */
function buildEditCcPayName() {
  const card = matchedCard.value
  if (!card) return
  const d2 = buf.value.date ? new Date(buf.value.date) : null
  const monthLabel = d2 ? 'T' + (d2.getMonth() + 1) + '/' + d2.getFullYear() : ''
  if (editPayLevel.value === 'min') {
    buf.value.name = card.name + ' minimum' + (monthLabel ? ' ' + monthLabel : '')
  } else {
    buf.value.name = card.name + ' trả nợ' + (monthLabel ? ' ' + monthLabel : '')
  }
}

/** Watch edit date changes for CC items */
watch(() => buf.value.date, () => {
  if (editing.value && isCcItem.value) buildEditCcPayName()
})

/** Watch edit pay level changes for CC items */
watch(editPayLevel, () => {
  if (!editing.value || !isCcItem.value || !matchedCard.value) return
  buildEditCcPayName()
  if (editPayLevel.value === 'min') {
    buf.value.amt = matchedCard.value.min || buf.value.amt
  }
})

function handleCopy() {
  const i = props.item
  emit('clone-item', { ...i })
}

/** Lấy i18nMeta và i18n của item hiện tại theo field (name hoặc desc) */
function getItemI18nFields(i) {
  if (i._variant === 'upcoming') return { i18n: i.nameI18n, meta: i.nameI18nMeta }
  return { i18n: i.descI18n, meta: i.descI18nMeta }
}

/** Lấy giá trị hiển thị trong input của review step cho một ngôn ngữ */
function reviewInputValue(lang) {
  const d = reviewDecisions.value[lang]
  if (!d) return ''
  if (d.action === 'auto') return autoTranslations.value[lang] ?? ''
  return d.value ?? ''
}

/** User đổi action của một ngôn ngữ trong review step */
function setReviewAction(lang, action) {
  const prev = reviewDecisions.value[lang] || {}
  reviewDecisions.value = { ...reviewDecisions.value, [lang]: { ...prev, action } }
}

/** User chỉnh thủ công input trong review step */
function onReviewInput(lang, value) {
  const prev = reviewDecisions.value[lang] || {}
  reviewDecisions.value = { ...reviewDecisions.value, [lang]: { ...prev, value } }
}

function handleSave() {
  if (!buf.value.name || !buf.value.amt) return
  if (props.item._variant === 'tx' && buf.value.date > tStr()) buf.value.date = tStr()
  const i = props.item
  const currentLang = locale.value
  const { i18n: existingI18n, meta } = getItemI18nFields(i)

  // Tìm ngôn ngữ cần review:
  // - meta='manual' → luôn hỏi
  // - meta='auto'   → dịch lại tự động (không hỏi)
  // - không có meta nhưng có nội dung trong i18n → không rõ nguồn gốc, xem như manual → hỏi
  const manualLangs = ALL_LANGS.filter((l) => {
    if (l === currentLang) return false
    const lMeta = meta?.[l]
    if (lMeta === 'auto') return false
    if (lMeta === 'manual') return true
    return !!(existingI18n?.[l])
  })

  if (manualLangs.length > 0) {
    // Bắt đầu review step
    reviewPending.value = manualLangs.map((lang) => ({
      lang,
      oldValue: existingI18n?.[lang] || (i._variant === 'upcoming' ? i.name : i.desc) || '',
    }))
    // Khởi tạo decisions với action='keep' và giá trị cũ
    const decisions = {}
    for (const { lang, oldValue } of reviewPending.value) {
      decisions[lang] = { action: 'keep', value: oldValue }
    }
    reviewDecisions.value = decisions
    autoTranslations.value = {}
    // Prefetch auto translations cho từng lang
    for (const { lang } of reviewPending.value) {
      translateText(buf.value.name, currentLang, lang).then((result) => {
        autoTranslations.value = { ...autoTranslations.value, [lang]: result ?? '' }
      })
    }
    editing.value = false
    reviewStep.value = true
    return
  }

  // Không có manual langs → emit save trực tiếp
  doSave({})
}

function doSave(translations) {
  const i = props.item
  if (i._variant === 'upcoming') {
    emit('save-upcoming', { ...i, _buf: { ...buf.value }, _translations: translations })
  } else {
    emit('save-tx', { ...i, _buf: { ...buf.value }, _translations: translations })
  }
  editing.value = false
  reviewStep.value = false
}

function handleReviewSave() {
  // Build translations từ decisions
  const translations = {}
  for (const [lang, d] of Object.entries(reviewDecisions.value)) {
    if (d.action === 'auto') {
      const autoVal = autoTranslations.value[lang]
      translations[lang] = { action: 'auto', value: autoVal || null }
    } else if (d.action === 'manual') {
      translations[lang] = { action: 'manual', value: d.value || null }
    } else {
      translations[lang] = { action: 'keep', value: null }
    }
  }
  doSave(translations)
}

// --- Swipe to dismiss ---
const sheetRef = ref(null)
const dragY = ref(0)
const dragging = ref(false)
const dismissing = ref(false)
let startY = 0
let lastY = 0
let lastTime = 0
const DISMISS_POS = 80       // slow drag: need 80px
const DISMISS_FLICK = 5      // fast flick: minimal distance
const VELOCITY_THRESHOLD = 0.15 // px/ms to count as flick

// Sheet height estimated for opacity calc
const sheetHeight = computed(() => sheetRef.value?.offsetHeight || 400)

const dragProgress = computed(() =>
  Math.min(dragY.value / sheetHeight.value, 1)
)

const sheetStyle = computed(() => {
  if (dismissing.value) {
    return {
      transform: 'translateY(100%)',
      transition: 'transform .3s cubic-bezier(.4,0,1,1), opacity .3s ease',
      opacity: '0',
    }
  }
  if (!dragging.value && dragY.value === 0) return {}
  const opacity = 1 - dragProgress.value * 0.6
  return {
    transform: `translateY(${dragY.value}px)`,
    opacity: `${opacity}`,
    transition: dragging.value ? 'none' : 'transform .3s cubic-bezier(.22,1,.36,1), opacity .3s ease',
  }
})

const overlayStyle = computed(() => {
  if (dismissing.value) return { opacity: '0', transition: 'opacity .3s ease' }
  if (!dragging.value && dragY.value === 0) return {}
  const opacity = 1 - dragProgress.value
  return { opacity: `${opacity}`, transition: dragging.value ? 'none' : 'opacity .3s ease' }
})

function onTouchStart(e) {
  const el = sheetRef.value
  if (!el || dismissing.value) return
  if (el.scrollTop > 0) return
  startY = e.touches[0].clientY
  lastY = startY
  lastTime = Date.now()
  dragging.value = false
  dragY.value = 0
}

function onTouchMove(e) {
  const el = sheetRef.value
  if (!el || dismissing.value) return
  const currentY = e.touches[0].clientY
  const delta = currentY - startY

  if (el.scrollTop > 0) {
    startY = currentY
    lastY = currentY
    lastTime = Date.now()
    return
  }

  if (delta <= 0) {
    dragY.value = 0
    dragging.value = false
    return
  }

  e.preventDefault()
  dragging.value = true
  dragY.value = delta * 0.6

  // Track velocity
  lastY = currentY
  lastTime = Date.now()
}

function onTouchEnd(e) {
  if (!dragging.value || dismissing.value) return
  dragging.value = false

  // Calculate velocity from last move
  const endY = e.changedTouches[0].clientY
  const now = Date.now()
  const dt = now - lastTime || 1
  const velocity = (endY - lastY) / dt // px/ms, positive = downward

  const pos = dragY.value
  const isFlick = velocity > VELOCITY_THRESHOLD && pos >= DISMISS_FLICK
  const isDrag = pos >= DISMISS_POS

  if (isFlick || isDrag) {
    // Dismiss
    dismissing.value = true
    setTimeout(() => {
      dismissing.value = false
      dragY.value = 0
      emit('close')
    }, 300)
  } else {
    // Spring back
    dragY.value = 0
  }
}
</script>

<style scoped>
/* Input wrap với currency badge bên trong (absolute right) */
.detail__input-wrap { position: relative; display: flex; align-items: center; }
.detail__input-wrap .popup-input { flex: 1; padding-right: 44px; min-width: 0; }
.detail__input-suffix { position: absolute; right: 8px; font-family: var(--mono); font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(var(--accent-rgb),.12); color: var(--accent); pointer-events: none; }
/* Dual input: 2 ô cùng 1 hàng khi currency khác nhau */
.detail__dual-row { display: flex; gap: 6px; align-items: center; }
.detail__dual-row .detail__input-wrap { flex: 1; min-width: 0; }
.detail__dual-sep { font-family: var(--mono); font-size: 10px; color: var(--muted); flex-shrink: 0; }

/* Review step */
.review__subtitle { font-size: 12px; color: var(--muted); margin: 0 0 14px; line-height: 1.5; }
.review__lang-block { margin-bottom: 16px; }
.review__lang-block:last-child { margin-bottom: 0; }
.review__lang-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.review__lang-label { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: .05em; }
.review__options { display: flex; gap: 4px; }
.review__opt-btn { font-family: var(--sans); font-size: 10px; padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface2); color: var(--muted); cursor: pointer; transition: all .15s; }
.review__opt-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
</style>
