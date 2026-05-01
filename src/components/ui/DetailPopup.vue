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
          <span class="popup-title">
            <component v-if="!editing && !reviewStep && hdrIcon" :is="hdrIcon" :size="16" />
            {{ hdrTitle }}
          </span>
          <button class="popup-close" @click="$emit('close')"><Icon name="x" :size="18" /></button>
        </div>

        <!-- VIEW MODE · Khai Chiến (upcoming) / Chi tiết (tx) -->
        <template v-if="!editing && !reviewStep">
          <!-- Hero · tier-aware cho upcoming (PayQuestPopup style), simple cho tx -->
          <div
            v-if="upcomingTier"
            :class="['popup-hero', `tier-${upcomingTier.tier.key}`]"
            :style="{ '--tier-color': upcomingTier.tier.color, '--tier-glow': upcomingTier.tier.glow }"
          >
            <div class="tier-badge">{{ upcomingTier.tier.classn }} · {{ upcomingTier.tier.rank }}</div>
            <div class="portrait tier-portrait">
              <component :is="upcomingTier.portrait" :size="44" />
            </div>
            <div class="danger-pips center">
              <span v-for="i in 9" :key="i" :class="{ on: i <= upcomingTier.tier.danger }"></span>
            </div>
            <div class="nm">{{ heroName }}</div>
            <div class="popup-realm">{{ upcomingTier.tier.realm }} · {{ upcomingTier.tier.desc }}</div>
            <div class="amt">
              <span class="cu">{{ heroCurrencySym }}</span>
              <template v-if="hide"><span class="masked">{{ MASK_GLYPHS }}</span></template>
              <template v-else>{{ fN(heroAmt) }}</template>
            </div>
          </div>
          <div v-else class="popup-hero" :class="heroVariant">
            <div class="portrait">
              <component :is="heroSprite" :size="36" />
            </div>
            <div class="nm">{{ heroName }}</div>
            <div v-if="heroSubName" class="real">{{ heroSubName }}</div>
            <div class="amt">
              <span class="cu">{{ heroCurrencySym }}</span>
              <template v-if="hide"><span class="masked">{{ MASK_GLYPHS }}</span></template>
              <template v-else>{{ fN(heroAmt) }}</template>
            </div>
          </div>

          <!-- Real-data block (nguồn thật) — chỉ khi useDisplay + có dữ liệu real -->
          <div v-if="showRealData" class="popup-realdata">
            <div class="lab">▾ Nguồn thật</div>
            <div v-if="realDataName" class="rn">{{ realDataName }}</div>
            <div v-if="realDataDesc" class="dn">{{ realDataDesc }}</div>
          </div>

          <!-- 4-stat grid -->
          <div class="popup-stats">
            <div v-for="s in heroStats" :key="s.label" class="popup-stat">
              <div class="l">{{ s.label }}</div>
              <div :class="['v', s.cls]">{{ s.value }}</div>
            </div>
          </div>

          <!-- Action buttons · attack/heal/flee -->
          <div class="popup-actions">
            <button
              v-if="primaryAction"
              class="popup-btn attack"
              :disabled="primaryAction.disabled"
              @click="onPrimary"
            >{{ primaryAction.label }}</button>
            <button
              v-if="secondaryAction"
              class="popup-btn heal"
              @click="onSecondary"
            >{{ secondaryAction.label }}</button>
            <button
              v-if="canDelete"
              class="popup-btn flee"
              @click="$emit('delete', item)"
            >{{ $t('detail.delete') }}</button>
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
              <label class="popup-label">{{ $t('detail.dateLabel') }}<template v-if="item._variant === 'tx'"> / {{ $t('detail.timeLabel') }}</template></label>
              <div class="popup-datetime-row">
                <input type="date" class="popup-input" v-model="buf.date" :max="item._variant === 'tx' ? tStr() : undefined" style="flex:1;min-width:0" />
                <input v-if="item._variant === 'tx'" type="time" class="popup-input popup-input--time" v-model="buf.time" style="flex:1;min-width:0" />
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
              <div class="detail__cat-toggle">
                <button :class="['tab-btn', editCatType === 'exp' ? 'active' : '']" style="flex:1;font-size:10px;padding:5px 0" @click="setCatType('exp')">{{ $t('detail.categoryExpense') }}</button>
                <button :class="['tab-btn', editCatType === 'inc' ? 'active' : '']" style="flex:1;font-size:10px;padding:5px 0" @click="setCatType('inc')">{{ $t('detail.categoryIncome') }}</button>
              </div>
              <select class="popup-input" v-model="buf.cat" style="font-family:var(--sans);font-size:12px">
                <option v-for="c in editActiveCats" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </div>
            <div v-if="item._variant === 'tx'" class="popup-field">
              <label class="popup-label">{{ $t('detail.noteLabel') }}</label>
              <textarea class="popup-input popup-input--note" v-model="buf.note" :placeholder="$t('detail.notePlaceholder')" rows="2" />
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
import {
  IconSword,
  IconScroll,
  IconBill,
  IconLotus,
  IconIngot,
  SPRITE,
} from './quest-icons'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCategories } from '../../composables/data/useCategories'
import { useCurrency } from '../../composables/api/useCurrency'
import { useAmountColor } from '../../composables/ui/useAmountColor'
import { useDisplayMode } from '../../composables/ui/useDisplayMode'
import { categoryFor } from '../../composables/data/useTutienNames'
import { tierForAmount, nameForBoss } from '../../composables/data/useBossTiers'
import { TIER_PORTRAITS } from '../../components/ui/quest-bosses'
import { MASK_GLYPHS, MASK_SHORT } from '../../composables/ui/usePrivacy'
import { getLocalized } from '../../composables/data/useI18nData'
import { translateText, ALL_LANGS } from '../../composables/api/useTranslation'

const { locale, t } = useI18n()
const { fN, fDate, tStr } = useFormatters()
const { resolveCat, expenseCategories, incomeCategories } = useCategories()
const { fCurr, fCurrFull, displayCurrency, baseCurrency, convertBetween, ratesLoading } = useCurrency()
const { amountColor } = useAmountColor()
const { mode: displayMode } = useDisplayMode()
const useTutien = computed(() => displayMode.value === 'tutien')
void useTutien

const props = defineProps({
  item: [Object, null],
  availCash: { type: Number, default: 0 },
  hide: Boolean,
  debtCards: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'save-upcoming', 'save-tx', 'delete', 'toggle-paid', 'clone-item'])

const editing = ref(false)
const buf = ref({ name: '', date: '', amt: 0, cat: '', note: '', time: '' })
const editPayLevel = ref('min') // 'min' | 'custom' — only used for CC edit
const editCatType = ref('exp') // 'exp' | 'inc' — toggle in category field

const editActiveCats = computed(() =>
  editCatType.value === 'inc' ? incomeCategories.value : expenseCategories.value
)

function setCatType(type) {
  editCatType.value = type
  const cats = type === 'inc' ? incomeCategories.value : expenseCategories.value
  buf.value.cat = cats[0]?.key || ''
}

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

// ─── Tier descriptor cho upcoming (PayQuestPopup style) ───────────────────
/**
 * Boss tier cho upcoming item dựa trên amt. Returns null cho tx variant
 * (transactions không có boss semantics).
 */
const upcomingTier = computed(() => {
  const i = props.item
  if (!i || i._variant !== 'upcoming') return null
  const amt = (i.amt || i.amount || 0)
  const tier = tierForAmount(amt)
  return {
    tier,
    portrait: TIER_PORTRAITS[tier.key],
    name: nameForBoss(tier, i._key || i.name || String(amt)),
  }
})

/** Show real-data block khi tutien mode + có nội dung khác display. */
const showRealData = computed(() => {
  if (!useTutien.value || !props.item) return false
  return Boolean(realDataName.value || realDataDesc.value)
})

/** Tên gốc real (raw `name` field, hoặc real_name nếu có). */
const realDataName = computed(() => {
  const i = props.item
  if (!i) return ''
  if (i._variant === 'upcoming') {
    // Hiện raw name khi tutien mode đang dịch tên obligation
    const localized = getLocalized(i, 'name')
    return localized !== i.name ? i.name : ''
  }
  // tx
  const localized = getLocalized(i, 'desc', locale.value)
  return localized !== i.desc ? i.desc : ''
})

/** Mô tả real (note / desc_real). */
const realDataDesc = computed(() => {
  const i = props.item
  if (!i) return ''
  return i.note || ''
})

// ─── Phase 8 · Hero + stats computed (Khai Chiến / Chi tiết popup) ────────
/** Header icon · Sword cho upcoming, Scroll cho tx. */
const hdrIcon = computed(() => {
  const i = props.item
  if (!i) return null
  return i._variant === 'upcoming' ? IconSword : IconScroll
})

/** Header title · "Khai Chiến" cho upcoming, "Chiến Ký" cho tx. */
const hdrTitle = computed(() => {
  if (editing.value) return t('detail.edit')
  if (reviewStep.value) return t('detail.review.title')
  if (!props.item) return ''
  return props.item._variant === 'upcoming'
    ? t('detail.titleUpcoming')
    : t('detail.titleTx')
})

/** Hero variant class · 'inc' cho income tx, default crimson otherwise. */
const heroVariant = computed(() => {
  const i = props.item
  if (!i) return ''
  if (i._variant === 'tx' && i.type === 'inc') return 'inc'
  return ''
})

/** Sprite component · từ category cho tx, từ _category cho upcoming. */
const heroSprite = computed(() => {
  const i = props.item
  if (!i) return IconLotus
  if (i._variant === 'tx') {
    const cat = categoryFor(i.cat)
    return SPRITE[cat.sp] || IconBill
  }
  // upcoming
  const c = i._category
  if (c === 'debt_minimum' || c === 'installment') return IconIngot
  return IconBill
})

/** Hero name · localized name/desc. */
const heroName = computed(() => {
  const i = props.item
  if (!i) return ''
  return i._variant === 'upcoming'
    ? getLocalized(i, 'name')
    : getLocalized(i, 'desc', locale.value)
})

/** Sub name · note for tx, null for upcoming. */
const heroSubName = computed(() => {
  const i = props.item
  if (!i) return null
  if (i._variant === 'tx' && i.note) return i.note
  return null
})

/** Currency symbol · 'đ' / '$' / '¥' theo tx.currency hoặc display. */
const heroCurrencySym = computed(() => {
  const i = props.item
  const cur = i?._variant === 'tx'
    ? (i.currency || baseCurrency.value)
    : displayCurrency.value
  if (cur === 'USD') return '$'
  if (cur === 'JPY') return '¥'
  return 'đ'
})

/** Hero amount raw (in tx currency or VND). */
const heroAmt = computed(() => {
  const i = props.item
  if (!i) return 0
  return i._variant === 'tx' ? (i.amount || 0) : (i.amt || i.amount || 0)
})

/** 4-stat grid · variant tx vs upcoming. */
const heroStats = computed(() => {
  const i = props.item
  if (!i) return []
  if (i._variant === 'upcoming') {
    const days = i.overdueDays != null && i.overdueDays > 0
      ? -i.overdueDays
      : daysUntil(i._date || i.date)
    return [
      {
        label: t('detail.statDamage'),
        value: props.hide ? MASK_SHORT : '−' + fmtShort(i.amt || 0),
        cls: 'hp',
      },
      {
        label: t('detail.statDue'),
        value: i._date ? fmtDueShort(i._date) : '—',
        cls: 'gd',
      },
      {
        label: t('detail.statShortfall'),
        value: props.hide
          ? MASK_SHORT
          : (props.availCash >= (i.amt || 0)
              ? t('detail.statSufficient')
              : '−' + fmtShort((i.amt || 0) - props.availCash)),
        cls: props.availCash >= (i.amt || 0) ? 'gn' : 'hp',
      },
      {
        label: t('detail.statStatus'),
        value: i.paid
          ? t('detail.statDone')
          : days < 0
            ? t('detail.statOverdue', { d: Math.abs(days) })
            : days === 0
              ? t('detail.statToday')
              : t('detail.statDays', { d: days }),
        cls: i.paid ? 'gn' : (days <= 3 ? 'hp' : 'gd'),
      },
    ]
  }
  // tx variant
  const cat = categoryFor(i.cat)
  const catLabel = useTutien.value ? cat.display : (resolveCat(i.cat)?.label ?? cat.real)
  return [
    {
      label: t('detail.dateLabel'),
      value: fDate(i.date),
      cls: 'gd',
    },
    {
      label: t('detail.timeLabel'),
      value: i.time || '—',
      cls: '',
    },
    {
      label: t('detail.categoryLabel'),
      value: catLabel,
      cls: 'gd',
    },
    {
      label: t('detail.typeLabel'),
      value: i.type === 'inc' ? t('detail.income') : t('detail.expense'),
      cls: i.type === 'inc' ? 'gn' : 'hp',
    },
  ]
})

/** Format số gọn cho stat values · "1.2M" / "500K". */
function fmtShort(n) {
  const a = Math.abs(n)
  if (a >= 1e9) return (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return (a / 1e3).toFixed(0) + 'K'
  return String(Math.round(a))
}

/** "2026-04-15" → "15.04" */
function fmtDueShort(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

/** Primary action button · Pay/Undo cho upcoming, Edit cho tx. */
const primaryAction = computed(() => {
  const i = props.item
  if (!i) return null
  if (i._variant === 'upcoming') {
    if (i.paid) {
      return {
        label: t('detail.undoPay'),
        disabled: false,
        kind: 'undo',
      }
    }
    return {
      label: t('detail.attackBtn'),
      disabled: props.availCash < (i.amt || 0),
      kind: 'pay',
    }
  }
  return {
    label: t('detail.editBtn'),
    disabled: false,
    kind: 'edit',
  }
})

function onPrimary() {
  const i = props.item
  if (!i) return
  if (i._variant === 'upcoming') {
    emit('toggle-paid', i._key, i.amt, i.name)
  } else {
    startEdit()
  }
}

/** Secondary action button · Edit cho upcoming, Copy cho tx. */
const secondaryAction = computed(() => {
  const i = props.item
  if (!i) return null
  if (i._variant === 'upcoming') {
    return { label: t('detail.editBtn'), kind: 'edit' }
  }
  if (canCopy.value) {
    return { label: t('detail.copy'), kind: 'copy' }
  }
  return null
})

function onSecondary() {
  const i = props.item
  if (!i) return
  if (i._variant === 'upcoming') {
    startEdit()
  } else {
    handleCopy()
  }
}

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
    editCatType.value = i.type === 'inc' ? 'inc' : 'exp'
    // Hiện bản dịch đúng locale khi edit — fallback về desc gốc nếu chưa có
    buf.value = {
      name: getLocalized(i, 'desc', locale.value),
      date: i.date,
      amt: i.amount,
      cat: resolved.key,
      note: i.note || '',
      time: i.time || '',
    }
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

  // Nếu tên/mô tả không thay đổi so với giá trị đã hiển thị → không cần review bản dịch
  const originalName = i._variant === 'upcoming'
    ? getLocalized(i, 'name')
    : getLocalized(i, 'desc', currentLang)
  if (buf.value.name === originalName) {
    doSave({})
    return
  }

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
/* Date + time row */
.popup-datetime-row { display: flex; gap: 6px; }

/* Input wrap với currency badge bên trong (absolute right) */
.detail__input-wrap { position: relative; display: flex; align-items: center; }
.detail__input-wrap .popup-input { flex: 1; padding-right: 44px; min-width: 0; }
.detail__input-suffix { position: absolute; right: 8px; font-family: var(--mono); font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(var(--accent-rgb),.12); color: var(--accent); pointer-events: none; }
/* Dual input: 2 ô cùng 1 hàng khi currency khác nhau */
.detail__dual-row { display: flex; gap: 6px; align-items: center; }
.detail__dual-row .detail__input-wrap { flex: 1; min-width: 0; }
.detail__dual-sep { font-family: var(--mono); font-size: 10px; color: var(--muted); flex-shrink: 0; }

.popup-val--note { text-align: right; word-break: break-word; white-space: pre-wrap; max-width: 60%; }
/* time input in edit mode */
.popup-input--time { font-family: var(--mono); font-size: 12px; }
.popup-input--note { height: auto; min-height: 56px; resize: none; line-height: 1.4; }

/* Category type toggle */
.detail__cat-toggle { display: flex; gap: 4px; background: var(--surface2); border-radius: 8px; padding: 2px; margin-bottom: 6px; }

/* Review step */
.review__subtitle { font-size: 12px; color: rgba(var(--text-rgb),.55); margin: 0 0 14px; line-height: 1.5; }
.review__lang-block { margin-bottom: 16px; }
.review__lang-block:last-child { margin-bottom: 0; }
.review__lang-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.review__lang-label { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: .05em; }
.review__options { display: flex; gap: 4px; }
.review__opt-btn { font-family: var(--sans); font-size: 10px; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(var(--text-rgb),.18); background: var(--surface2); color: rgba(var(--text-rgb),.7); cursor: pointer; transition: all .15s; }
.review__opt-btn.active { background: rgba(var(--accent-rgb),.15); color: var(--accent); border-color: rgba(var(--accent-rgb),.45); }
</style>
