<template>
  <div>
    <!-- ─── Section 1 · Cấu hình đạo hữu ────────────────────────── -->
    <SectionHeader :icon="IconSettings" title="Cấu hình đạo hữu" />
    <div class="set-group">
      <!-- Profile (display only) -->
      <div class="set-row">
        <div class="set-ic"><IconUser :size="15" /></div>
        <div class="set-body">
          <div class="set-name">{{ playerName }}</div>
          <div class="set-sub">{{ playerRealm }} · LV {{ playerLvl }}</div>
        </div>
        <div class="set-val"><IconChevronRight :size="14" /></div>
      </div>
      <!-- Daily limit -->
      <div class="set-row" @click="open = 'lim'">
        <div class="set-ic"><IconTarget :size="15" /></div>
        <div class="set-body">
          <div class="set-name">Mức linh khí ngày</div>
          <div class="set-sub">giới hạn chi tiêu hằng ngày</div>
        </div>
        <div class="set-val">{{ fmtLimitShort }}</div>
      </div>
      <!-- Strategy (display only — tap to long-press for logout) -->
      <div class="set-row" @click="onStrategyTap" @contextmenu.prevent="open = 'logout'">
        <div class="set-ic"><IconSword :size="15" /></div>
        <div class="set-body">
          <div class="set-name">Chiến lược trảm ma</div>
          <div class="set-sub">avalanche · hạ lãi cao trước</div>
        </div>
        <div class="set-val"><IconChevronRight :size="14" /></div>
      </div>
    </div>

    <!-- ─── Section 2 · Giao diện ───────────────────────────────── -->
    <SectionHeader title="Giao diện" />
    <div class="set-group">
      <!-- Theme toggle -->
      <div class="set-row" @click="toggleTheme">
        <div class="set-ic">
          <component :is="theme === 'light' ? IconSun : IconMoon" :size="15" />
        </div>
        <div class="set-body">
          <div class="set-name">Chế độ sáng</div>
          <div class="set-sub">đổi giao diện sáng/tối</div>
        </div>
        <div :class="['switch', { on: theme === 'light' }]"></div>
      </div>
      <!-- Display mode toggle -->
      <div class="set-row" @click="toggleMode">
        <div class="set-ic"><IconScroll :size="15" /></div>
        <div class="set-body">
          <div class="set-name">Tên hiển thị tu tiên</div>
          <div class="set-sub">{{ displayMode === 'tutien' ? 'hiển thị tên ác nhân' : 'tên gốc' }}</div>
        </div>
        <div :class="['switch', { on: displayMode === 'tutien' }]"></div>
      </div>
      <!-- Hide amounts toggle -->
      <div class="set-row" @click="$emit('toggle-hide')">
        <div class="set-ic">
          <component :is="hideFlag ? IconEyeOff : IconEye" :size="15" />
        </div>
        <div class="set-body">
          <div class="set-name">Ẩn số tiền</div>
          <div class="set-sub">privacy mode</div>
        </div>
        <div :class="['switch', { on: hideFlag }]"></div>
      </div>
    </div>

    <!-- ─── Section 3 · Kết nối ─────────────────────────────────── -->
    <SectionHeader title="Kết nối" />
    <div class="set-group">
      <!-- Sync · tap = reload -->
      <div class="set-row" @click="$emit('reload')">
        <div class="set-ic"><IconCloud :size="15" /></div>
        <div class="set-body">
          <div class="set-name">Đồng bộ</div>
          <div class="set-sub">{{ syncMsg }} · {{ syncTime || '--:--' }}</div>
        </div>
        <div :class="['switch', 'on']"></div>
      </div>
      <!-- Push notifications · tap = enable/disable -->
      <div class="set-row" @click="onPushTap">
        <div class="set-ic"><IconBell :size="15" /></div>
        <div class="set-body">
          <div class="set-name">Thông báo kiếp số</div>
          <div class="set-sub">nhắc trước hạn 2 ngày</div>
        </div>
        <div :class="['switch', { on: pushStatus === 'granted' }]"></div>
      </div>
      <!-- Export -->
      <div class="set-row" @click="open = 'export'">
        <div class="set-ic"><IconExport :size="15" /></div>
        <div class="set-body">
          <div class="set-name">Xuất chiến ký</div>
          <div class="set-sub">CSV / JSON</div>
        </div>
        <div class="set-val"><IconChevronRight :size="14" /></div>
      </div>
    </div>

    <!-- Footer · version + tagline -->
    <div class="settings__foot">
      Tru Ma Lục · v.Tu Tiên 2.0<br />
      <span class="settings__foot-tag">~ Đạo tâm bất diệt ~</span>
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
          <div class="popup-handle"><div class="popup-handle-bar"></div></div>

          <div class="popup-hdr">
            <span class="popup-title">{{ popupTitle }}</span>
            <button class="popup-close" @click="closePopup"><Icon name="x" :size="18" /></button>
          </div>

          <!-- DAILY LIMIT -->
          <template v-if="open === 'lim'">
            <div class="popup-body">
              <div class="settings__lim-wrap">
                <div class="settings__lim-bar">
                  <div class="settings__lim-fill" :class="'settings__lim-fill--' + limSt" :style="{ width: Math.min(limPct, 100) + '%' }"></div>
                </div>
                <span class="settings__sync-note">{{ limPct }}%</span>
              </div>
              <div class="settings__sync-note" style="margin-bottom:4px">
                {{ fCurrFull(todaySpent) }} / {{ fCurrFull(dayLimit) }}
              </div>
              <div class="popup-field">
                <label class="popup-label">Mức linh khí ngày mới</label>
                <div class="settings__input-wrap">
                  <input class="popup-input" v-model.number="nLimit" type="number" inputmode="numeric" :placeholder="String(dayLimit)" />
                  <span class="settings__input-suffix">VND</span>
                </div>
              </div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn attack" @click="saveLimit" :disabled="!nLimit">Đặt giới linh khí</button>
            </div>
          </template>

          <!-- EXPORT -->
          <template v-if="open === 'export'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:10px">Sao chép chiến ký để sao lưu / mang qua thiết bị khác.</div>
              <div class="popup-actions" style="margin-top:0">
                <button class="popup-btn attack" @click="exportJson">Sao chép JSON</button>
                <button class="popup-btn heal" @click="exportCsv">Tải CSV</button>
              </div>
              <div v-if="exportMsg" class="hint" style="margin-top:10px;color:var(--jade)">{{ exportMsg }}</div>
            </div>
          </template>

          <!-- LOGOUT confirm (chỉ truy cập qua long-press Strategy row) -->
          <template v-if="open === 'logout'">
            <div class="popup-body">
              <p style="text-align:center;font-family:var(--serif-vn);font-size:14px;font-weight:600;margin:12px 0 6px">Đăng xuất khỏi Bin?</p>
              <p style="text-align:center;font-family:var(--serif-vn);font-size:12px;color:var(--muted);margin:0;line-height:1.5">Đạo tâm vẫn còn — chiến ký vẫn lưu trên JSONBin.</p>
            </div>
            <div class="popup-actions" style="flex-direction:row;gap:10px">
              <button class="popup-btn flee" style="flex:1" @click="closePopup">Hủy</button>
              <button class="popup-btn attack" style="flex:1" @click="$emit('logout')">Đăng xuất</button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Icon from '../ui/Icon.vue'
import SectionHeader from '../cards/SectionHeader.vue'
import {
  IconSettings,
  IconUser,
  IconTarget,
  IconSword,
  IconSun,
  IconMoon,
  IconScroll,
  IconEye,
  IconEyeOff,
  IconCloud,
  IconBell,
  IconExport,
  IconChevronRight,
} from '../ui/quest-icons'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCurrency } from '../../composables/api/useCurrency'
import { useTheme } from '../../composables/ui/useTheme'
import { useDisplayMode } from '../../composables/ui/useDisplayMode'

const { fN } = useFormatters()
const { fCurrFull } = useCurrency()
const { theme, toggleTheme } = useTheme()
const { mode: displayMode, toggleMode } = useDisplayMode()

const props = defineProps({
  dayLimit: Number,
  todaySpent: Number,
  limPct: Number,
  limSt: String,
  syncMsg: String,
  syncTime: String,
  pushStatus: String,
  playerName: { type: String, default: '' },
  playerRealm: { type: String, default: '' },
  playerLvl: { type: Number, default: 1 },
  hideFlag: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-limit',
  'enable-push',
  'logout',
  'reload',
  'toggle-hide',
  'export-json',
])

const fmtLimitShort = computed(() => {
  const v = props.dayLimit || 0
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return fN(v)
})

const popupTitles = {
  lim: 'Mức linh khí ngày',
  export: 'Xuất chiến ký',
  logout: 'Đăng xuất',
}
const popupTitle = computed(() => popupTitles[open.value] || '')

// ─── State ────────────────────────────────────────────────────
const open = ref(null)
const nLimit = ref(null)
const exportMsg = ref('')

function closePopup() {
  dismissing.value = false
  dragY.value = 0
  open.value = null
  exportMsg.value = ''
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

function onPushTap() {
  if (props.pushStatus !== 'granted' && props.pushStatus !== 'denied') {
    emit('enable-push')
  }
}

function onStrategyTap() {
  // Tap = không làm gì (chỉ display). Long-press để mở logout.
  // Mobile: contextmenu event = long-press.
}

// ─── Export ───────────────────────────────────────────────────
function exportJson() {
  emit('export-json', 'json')
  exportMsg.value = 'Đã sao chép vào clipboard'
}
function exportCsv() {
  emit('export-json', 'csv')
  exportMsg.value = 'Đã tải file CSV'
}

// ─── Swipe to dismiss ──────────────────────────────────────────
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

<style scoped>
/* Sync note */
.settings__sync-note { font-family: var(--mono); font-size: 10px; color: var(--muted); }

/* Input với suffix VND */
.settings__input-wrap { position: relative; display: flex; align-items: center; }
.settings__input-wrap .popup-input { flex: 1; padding-right: 44px; min-width: 0; }
.settings__input-suffix {
  position: absolute; right: 8px;
  font-family: var(--mono); font-size: 9px; font-weight: 700;
  padding: 1px 6px; border-radius: 4px;
  background: rgba(var(--gold-rgb), 0.12);
  color: var(--gold);
  pointer-events: none;
}

/* Limit bar */
.settings__lim-wrap { display: flex; align-items: center; gap: 8px; margin: 9px 0 5px; }
.settings__lim-bar { flex: 1; height: 5px; background: var(--paper-3); border-radius: 99px; overflow: hidden; }
.settings__lim-fill { height: 100%; border-radius: 99px; transition: width .4s; }
.settings__lim-fill--safe { background: var(--jade); }
.settings__lim-fill--warn { background: var(--gold); }
.settings__lim-fill--over { background: var(--crimson); }

/* Footer */
.settings__foot {
  text-align: center;
  margin-top: 24px;
  font-family: var(--serif); font-style: italic;
  font-size: 12px; color: var(--muted);
  letter-spacing: 0.04em;
}
.settings__foot-tag { color: var(--violet); }
</style>
