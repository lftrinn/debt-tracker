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
          <span class="popup-title">{{ editing ? 'Chỉnh sửa' : 'Chi tiết' }}</span>
          <button class="popup-close" @click="$emit('close')"><Icon name="x" :size="18" /></button>
        </div>

        <!-- VIEW MODE -->
        <template v-if="!editing">
          <div class="popup-body">
            <!-- Icon / urgency indicator -->
            <div class="popup-hero">
              <span v-if="item._variant === 'upcoming'" class="popup-badge" :class="item.paid ? 'ok' : item.urg">
                <template v-if="item.paid"><Icon name="check" :size="12" /> Đã thanh toán</template>
                <template v-else>{{ item.urg === 'urgent' ? 'Khẩn cấp' : item.urg === 'soon' ? 'Sắp đến hạn' : 'Bình thường' }}</template>
              </span>
              <span v-else class="popup-badge" :class="item.type === 'inc' ? 'income' : 'expense'">
                <Icon :name="resolveCat(item.cat).icon" :size="13" /> · {{ resolveCat(item.cat).label }} · {{ item.type === 'inc' ? 'Khoản thu' : 'Chi tiêu' }}
              </span>
            </div>

            <!-- Name -->
            <div class="popup-name">{{ item._variant === 'upcoming' ? item.name : item.desc }}</div>

            <!-- Amount -->
            <div class="popup-amt" :class="item._variant === 'tx' ? (item.type === 'inc' ? 'inc' : 'exp') : ''">
              <template v-if="hide">•••••</template>
              <template v-else>
                <template v-if="item._variant === 'tx'">{{ item.type === 'inc' ? '+' : '-' }}₫{{ fN(item.amount || item.amt) }}</template>
                <template v-else>₫{{ fN(item.amt || item.amount) }}</template>
              </template>
            </div>

            <!-- Details rows -->
            <div class="popup-details">
              <div class="popup-row">
                <span class="popup-label">Ngày</span>
                <span class="popup-val">{{ fDate(item._date || item.date) }}</span>
              </div>
              <div v-if="item.sub" class="popup-row">
                <span class="popup-label">Loại</span>
                <span class="popup-val">{{ item.sub }}</span>
              </div>
              <div v-if="item._variant === 'upcoming' && !hide" class="popup-row">
                <span class="popup-label">Tiền khả dụng</span>
                <span class="popup-val" :style="availCash < (item.amt || 0) ? { color: 'var(--accent2)' } : {}">₫{{ fN(availCash) }}</span>
              </div>
              <div v-if="item._variant === 'upcoming' && !hide && !item.paid && availCash < (item.amt || 0)" class="popup-row">
                <span class="popup-label">Còn thiếu</span>
                <span class="popup-val" style="color:var(--accent2)">₫{{ fN((item.amt || 0) - availCash) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="popup-actions">
            <button v-if="item._variant === 'upcoming'" class="popup-btn primary" :class="{ done: item.paid }" :disabled="!item.paid && availCash < (item.amt || 0)" @click="$emit('toggle-paid', item._key, item.amt, item.name)">
              <template v-if="item.paid"><Icon name="undo-2" :size="14" /> Hoàn tác thanh toán</template>
              <template v-else><Icon name="check" :size="14" /> Thanh toán</template>
            </button>
            <button class="popup-btn secondary" @click="startEdit"><Icon name="pencil" :size="14" /> Chỉnh sửa</button>
            <button v-if="canDelete" class="popup-btn danger" @click="$emit('delete', item)"><Icon name="trash-2" :size="14" /> Xoá</button>
          </div>
        </template>

        <!-- EDIT MODE -->
        <template v-else>
          <div class="popup-body">
            <div class="popup-field">
              <label class="popup-label">{{ item._variant === 'upcoming' ? 'Tên khoản' : 'Mô tả' }}</label>
              <input class="popup-input" v-model="buf.name" placeholder="Nhập tên..." />
            </div>
            <div class="popup-field">
              <label class="popup-label">Ngày</label>
              <div class="date-wrap">
                <input type="date" class="popup-input" v-model="buf.date" :max="item._variant === 'tx' ? tStr() : undefined" style="color-scheme:dark;" />
              </div>
            </div>
            <div class="popup-field">
              <label class="popup-label">Số tiền (₫)</label>
              <input class="popup-input" v-model.number="buf.amt" type="number" inputmode="numeric" placeholder="0" />
            </div>
            <div v-if="item._variant === 'tx'" class="popup-field">
              <label class="popup-label">Danh mục</label>
              <select class="popup-input" v-model="buf.cat" style="font-family:var(--sans);font-size:12px">
                <optgroup label="Chi tiêu">
                  <option v-for="c in expenseCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
                </optgroup>
                <optgroup label="Khoản thu">
                  <option v-for="c in incomeCategories" :key="c.key" :value="c.key">{{ c.label }}</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div class="popup-actions">
            <button class="popup-btn primary" @click="handleSave">Lưu thay đổi</button>
            <button class="popup-btn secondary" @click="editing = false">Huỷ</button>
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

const { fN, fDate, tStr } = useFormatters()
const { resolveCat, expenseCategories, incomeCategories } = useCategories()

const props = defineProps({
  item: [Object, null],
  availCash: { type: Number, default: 0 },
  hide: Boolean,
})

const emit = defineEmits(['close', 'save-upcoming', 'save-tx', 'delete', 'toggle-paid'])

const editing = ref(false)
const buf = ref({ name: '', date: '', amt: 0, cat: '' })

const canDelete = computed(() => {
  if (!props.item) return false
  if (props.item._variant === 'upcoming') return props.item.source === 'one_time'
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
  } else {
    const resolved = resolveCat(i.cat)
    buf.value = { name: i.desc, date: i.date, amt: i.amount, cat: resolved.key }
  }
  editing.value = true
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
