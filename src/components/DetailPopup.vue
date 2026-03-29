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
            <div class="popup-name">{{ item._variant === 'upcoming' ? item.name : item.desc }}</div>

            <!-- Amount -->
            <div class="popup-amt" :class="item._variant === 'tx' ? (item.type === 'inc' ? 'inc' : 'exp') : 'exp'">
              <template v-if="hide">•••••</template>
              <template v-else>
                <template v-if="item._variant === 'tx'">{{ item.type === 'inc' ? '+' : '-' }}₫{{ fN(item.amount || item.amt) }}</template>
                <template v-else>₫{{ fN(item.amt || item.amount) }}</template>
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
                <span class="popup-val" :style="availCash < (item.amt || 0) ? { color: 'var(--accent2)' } : {}">₫{{ fN(availCash) }}</span>
              </div>
              <div v-if="item._variant === 'upcoming' && !hide && !item.paid && availCash < (item.amt || 0)" class="popup-row">
                <span class="popup-label">{{ $t('detail.shortfall') }}</span>
                <span class="popup-val" style="color:var(--accent2)">₫{{ fN((item.amt || 0) - availCash) }}</span>
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
        <template v-else>
          <div class="popup-body">
            <!-- CC payment level selector (edit mode) -->
            <div v-if="isCcItem" class="popup-field">
              <label class="popup-label">{{ $t('detail.payLevel') }}</label>
              <div style="display:flex;gap:4px;background:var(--surface2);border-radius:8px;padding:2px">
                <button :class="['tab-btn', editPayLevel === 'min' ? 'active' : '']" style="flex:1;font-size:10px;padding:5px 0" @click="editPayLevel = 'min'">
                  {{ $t('detail.minimum') }}{{ matchedCard && !hide ? ' (₫' + fS(matchedCard.min) + ')' : '' }}
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
              <input class="popup-input" v-model.number="buf.amt" type="number" inputmode="numeric" placeholder="0" />
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
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'
import { useCategories } from '../composables/useCategories'

const { fN, fS, fDate, tStr } = useFormatters()
const { resolveCat, expenseCategories, incomeCategories } = useCategories()

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
  dragY.value = 0
  dragging.value = false
  dismissing.value = false
  document.body.style.overflow = v ? 'hidden' : ''
})

function startEdit() {
  const i = props.item
  if (i._variant === 'upcoming') {
    buf.value = { name: i.name, date: i._date, amt: i.amt }
    // Detect CC payment level
    if (isCcItem.value) {
      const n = (i.name || '').toLowerCase()
      editPayLevel.value = n.includes('minimum') ? 'min' : 'custom'
    }
  } else {
    const resolved = resolveCat(i.cat)
    buf.value = { name: i.desc, date: i.date, amt: i.amount, cat: resolved.key }
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

function handleSave() {
  if (!buf.value.name || !buf.value.amt) return
  if (props.item._variant === 'tx' && buf.value.date > tStr()) buf.value.date = tStr()
  const i = props.item
  if (i._variant === 'upcoming') {
    emit('save-upcoming', { ...i, _buf: { ...buf.value } })
  } else {
    emit('save-tx', { ...i, _buf: { ...buf.value } })
  }
  editing.value = false
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
