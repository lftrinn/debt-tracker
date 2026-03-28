<template>
  <div>
    <div class="cfg-list">
      <div class="cfg-item" @click="open = 'lim'">
        <span class="cfg-item-ico"><Icon name="chart-no-axes-column" :size="16" /></span>
        <span class="cfg-item-label">Hạn mức chi hàng ngày</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'hz'">
        <span class="cfg-item-ico"><Icon name="lock" :size="16" /></span>
        <span class="cfg-item-label">Vùng ẩn số tiền</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'rules'">
        <span class="cfg-item-ico"><Icon name="list" :size="16" /></span>
        <span class="cfg-item-label">Quy tắc</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'json'">
        <span class="cfg-item-ico"><Icon name="refresh-ccw" :size="16" /></span>
        <span class="cfg-item-label">Cập nhật dữ liệu JSON</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
    </div>

    <!-- Sync info -->
    <div style="text-align:center;padding:6px 0">
      <span class="small-n">{{ syncMsg }}<template v-if="syncTime"> · {{ syncTime }}</template></span>
    </div>

    <!-- POPUP -->
    <Transition name="popup">
      <div v-if="open" class="popup-overlay" :style="overlayStyle" @click.self="closePopup">
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

          <div class="popup-hdr">
            <span class="popup-title">{{ titles[open] }}</span>
            <button class="popup-close" @click="closePopup"><Icon name="x" :size="18" /></button>
          </div>

          <!-- DAILY LIMIT -->
          <template v-if="open === 'lim'">
            <div class="popup-body">
              <div class="lim-bar-w">
                <div class="lim-bar">
                  <div class="lim-fill" :class="limSt" :style="{ width: Math.min(limPct, 100) + '%' }"></div>
                </div>
                <span class="small-n">{{ limPct }}%</span>
              </div>
              <div class="small-n" style="margin-bottom:4px">
                <template v-if="hide.dailyLim">₫••••• / ₫•••••</template>
                <template v-else>₫{{ fN(todaySpent) }} / ₫{{ fN(dayLimit) }}</template>
              </div>
              <div v-if="!hide.dailyLim" class="popup-field">
                <label class="popup-label">Hạn mức mới (₫)</label>
                <input class="popup-input" v-model.number="nLimit" type="number" inputmode="numeric" :placeholder="String(dayLimit)" />
              </div>
            </div>
            <div v-if="!hide.dailyLim" class="popup-actions">
              <button class="popup-btn primary" @click="saveLimit" :disabled="!nLimit">Lưu hạn mức</button>
            </div>
          </template>

          <!-- HIDE ZONES -->
          <template v-if="open === 'hz'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:8px">Chọn mục chịu ảnh hưởng khi bấm nút ẩn. Bỏ chọn để luôn hiện.</div>
              <div class="hz-tree">
                <div v-for="g in zoneTree" :key="g.label" class="hz-group" :class="{ expanded: expandedGroups[g.label] }">
                  <div class="hz-parent" :class="{ checked: parentState(g) === 'all', partial: parentState(g) === 'some' }">
                    <label class="hz-parent-check" @click.stop>
                      <input type="checkbox"
                        :checked="parentState(g) === 'all'"
                        :indeterminate.prop="parentState(g) === 'some'"
                        @change="toggleParent(g, $event.target.checked)" />
                    </label>
                    <span class="hz-icon"><Icon :name="g.icon" :size="14" /></span>
                    <span class="hz-name" style="flex:1">{{ g.label }}</span>
                    <button v-if="g.children.length > 1" class="hz-toggle" @click="expandedGroups[g.label] = !expandedGroups[g.label]">
                      <span class="hz-arrow" :class="{ open: expandedGroups[g.label] }"><Icon name="chevron-right" :size="12" /></span>
                    </button>
                  </div>
                  <div v-if="g.children.length <= 1 || expandedGroups[g.label]" class="hz-children">
                    <label v-for="c in g.children" :key="c.key" class="hz-child" :class="{ checked: hideZones[c.key] }">
                      <input type="checkbox"
                        :checked="hideZones[c.key]"
                        @change="$emit('set-hide-zone', { key: c.key, val: $event.target.checked })" />
                      <span class="hz-child-name">{{ c.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- RULES -->
          <template v-if="open === 'rules'">
            <div class="popup-body">
              <div v-if="!rules.length" class="empty">Chưa có quy tắc nào</div>
              <div v-for="r in rules" :key="r" class="rule-item">
                <div class="rule-dot"></div><span>{{ r }}</span>
              </div>
            </div>
          </template>

          <!-- IMPORT JSON -->
          <template v-if="open === 'json'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:6px">
                Paste JSON mới vào đây để ghi đè lên Bin hiện tại. Lịch sử chi tiêu và khoản thu sẽ được giữ lại.
              </div>
              <textarea class="popup-input" v-model="importJson" placeholder="Paste JSON mới ở đây..." style="height:120px;resize:none;font-size:10px;line-height:1.5"></textarea>
              <div v-if="importErr" class="err" style="margin-top:4px">{{ importErr }}</div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn primary" style="background:var(--accent)" @click="$emit('import-json', importJson)" :disabled="!importJson || syncing">
                {{ syncing ? 'Đang cập nhật...' : 'Cập nhật dữ liệu' }}
              </button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'

const { fN } = useFormatters()

const props = defineProps({
  dayLimit: Number,
  todaySpent: Number,
  limPct: Number,
  limSt: String,
  rules: Array,
  syncMsg: String,
  syncTime: String,
  syncing: Boolean,
  importErr: String,
  hide: Object,
  hideZones: Object,
})

const emit = defineEmits([
  'update-limit',
  'import-json',
  'set-hide-zone',
])

const titles = {
  lim: 'Hạn mức chi hàng ngày',
  hz: 'Vùng ẩn số tiền',
  rules: 'Quy tắc',
  json: 'Cập nhật dữ liệu JSON',
}

const zoneTree = [
  { icon: 'alert-triangle', label: 'Cảnh báo hạn mức', children: [{ key: 'alert', name: 'Số tiền vượt / còn lại' }] },
  { icon: 'banknote', label: 'Tiền mặt & chi tiêu', children: [
    { key: 'cash.balance', name: 'Tiền mặt khả dụng' },
    { key: 'cash.todaySpent', name: 'Chi hôm nay' },
    { key: 'cash.monthSpent', name: 'Chi tháng này' },
  ]},
  { icon: 'credit-card', label: 'Tổng nợ còn lại', children: [
    { key: 'debt.total', name: 'Tổng nợ' },
    { key: 'debt.cardBal', name: 'Dư nợ từng thẻ' },
    { key: 'debt.minPay', name: 'Minimum payment' },
  ]},
  { icon: 'trending-down', label: 'Tiến độ thoát nợ', children: [
    { key: 'progress.origDebt', name: 'Nợ gốc' },
    { key: 'progress.remaining', name: 'Nợ còn lại' },
  ]},
  { icon: 'calendar', label: 'Thanh toán sắp đến', children: [
    { key: 'upcoming.amount', name: 'Số tiền khoản thanh toán' },
    { key: 'upcoming.shortage', name: 'Cảnh báo thiếu tiền' },
  ]},
  { icon: 'receipt', label: 'Lịch sử giao dịch', children: [{ key: 'transactions', name: 'Số tiền giao dịch' }] },
  { icon: 'bar-chart-3', label: 'Biểu đồ', children: [
    { key: 'charts.spend', name: 'Thu / Chi 7 ngày' },
    { key: 'charts.debtLine', name: 'Lộ trình giảm nợ' },
    { key: 'charts.pie', name: 'Cơ cấu nợ (legend)' },
  ]},
  { icon: 'clock', label: 'Lộ trình thoát nợ', children: [
    { key: 'timeline.debt', name: 'Tổng nợ mỗi mốc' },
    { key: 'timeline.eventAmt', name: 'Số tiền trong sự kiện' },
  ]},
  { icon: 'settings', label: 'Cài đặt', children: [
    { key: 'settings.cardInfo', name: 'Sao kê thẻ tín dụng' },
    { key: 'settings.dailyLim', name: 'Hạn mức chi' },
    { key: 'settings.dropdown', name: 'Dropdown trả nợ' },
    { key: 'settings.cashInfo', name: 'Quỹ tiền mặt' },
  ]},
]

function parentState(g) {
  const vals = g.children.map((c) => !!props.hideZones?.[c.key])
  if (vals.every(Boolean)) return 'all'
  if (vals.some(Boolean)) return 'some'
  return 'none'
}
function toggleParent(g, checked) {
  g.children.forEach((c) => emit('set-hide-zone', { key: c.key, val: checked }))
}

// --- State ---
const open = ref(null)
const expandedGroups = reactive({})
const nLimit = ref(null)
const importJson = ref('')

function closePopup() {
  dismissing.value = false
  dragY.value = 0
  open.value = null
}

watch(open, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) {
    dragY.value = 0
    dragging.value = false
    dismissing.value = false
  }
})

function saveLimit() {
  if (nLimit.value > 0) {
    emit('update-limit', nLimit.value)
    nLimit.value = null
    closePopup()
  }
}

// --- Swipe to dismiss ---
const sheetRef = ref(null)
const dragY = ref(0)
const dragging = ref(false)
const dismissing = ref(false)
let startY = 0
let lastY = 0
let lastTime = 0
const DISMISS_POS = 80
const DISMISS_FLICK = 5
const VELOCITY_THRESHOLD = 0.15

const sheetHeight = computed(() => sheetRef.value?.offsetHeight || 400)
const dragProgress = computed(() => Math.min(dragY.value / sheetHeight.value, 1))

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

  lastY = currentY
  lastTime = Date.now()
}

function onTouchEnd(e) {
  if (!dragging.value || dismissing.value) return
  dragging.value = false

  const endY = e.changedTouches[0].clientY
  const now = Date.now()
  const dt = now - lastTime || 1
  const velocity = (endY - lastY) / dt

  const pos = dragY.value
  const isFlick = velocity > VELOCITY_THRESHOLD && pos >= DISMISS_FLICK
  const isDrag = pos >= DISMISS_POS

  if (isFlick || isDrag) {
    dismissing.value = true
    setTimeout(() => {
      dismissing.value = false
      dragY.value = 0
      open.value = null
      document.body.style.overflow = ''
    }, 300)
  } else {
    dragY.value = 0
  }
}

defineExpose({})
</script>
