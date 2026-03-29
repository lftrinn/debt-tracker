<template>
  <div>
    <div class="settings__list">
      <div class="settings__item" @click="open = 'lim'">
        <span class="settings__item-ico"><Icon name="chart-no-axes-column" :size="16" /></span>
        <span class="settings__item-label">{{ $t('settings.menu.limit') }}</span>
        <span class="settings__item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <!-- Tiền tệ hiển thị — ngay dưới Hạn mức chi hàng ngày -->
      <div class="settings__item" @click="openCurrency">
        <span class="settings__item-ico"><Icon name="dollar-sign" :size="16" /></span>
        <span class="settings__item-label">{{ $t('settings.menu.currency') }}</span>
        <span class="settings__item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="settings__item" @click="open = 'hz'">
        <span class="settings__item-ico"><Icon name="lock" :size="16" /></span>
        <span class="settings__item-label">{{ $t('settings.menu.hideZones') }}</span>
        <span class="settings__item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="settings__item" @click="open = 'rules'">
        <span class="settings__item-ico"><Icon name="list" :size="16" /></span>
        <span class="settings__item-label">{{ $t('settings.menu.rules') }}</span>
        <span class="settings__item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="settings__item" @click="open = 'json'">
        <span class="settings__item-ico"><Icon name="refresh-ccw" :size="16" /></span>
        <span class="settings__item-label">{{ $t('settings.menu.json') }}</span>
        <span class="settings__item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="settings__sep"></div>
      <div class="settings__item settings__item--danger" @click="open = 'logout'">
        <span class="settings__item-ico settings__item-ico--danger"><Icon name="log-out" :size="16" /></span>
        <span class="settings__item-label settings__item-label--danger">{{ $t('settings.menu.logout') }}</span>
      </div>
    </div>

    <!-- Sync info -->
    <div style="text-align:center;padding:6px 0">
      <span class="settings__sync-note">{{ syncMsg }}<template v-if="syncTime"> · {{ syncTime }}</template></span>
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
              <div class="settings__lim-wrap">
                <div class="settings__lim-bar">
                  <div class="settings__lim-fill" :class="'settings__lim-fill--' + limSt" :style="{ width: Math.min(limPct, 100) + '%' }"></div>
                </div>
                <span class="settings__sync-note">{{ limPct }}%</span>
              </div>
              <div class="settings__sync-note" style="margin-bottom:4px">
                <template v-if="hide.dailyLim">••••• / •••••</template>
                <template v-else>{{ fCurrFull(todaySpent) }} / {{ fCurrFull(dayLimit) }}</template>
              </div>
              <div v-if="!hide.dailyLim" class="popup-field">
                <label class="popup-label">{{ $t('debt.balanceLabel') }}</label>
                <input class="popup-input" v-model.number="nLimit" type="number" inputmode="numeric" :placeholder="String(dayLimit)" />
              </div>
            </div>
            <div v-if="!hide.dailyLim" class="popup-actions">
              <button class="popup-btn primary" @click="saveLimit" :disabled="!nLimit">{{ $t('settings.limit.saveButton') }}</button>
            </div>
          </template>

          <!-- HIDE ZONES -->
          <template v-if="open === 'hz'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:8px">{{ $t('settings.hideZones.hint') }}</div>
              <div class="settings__hz-tree">
                <div v-for="g in zoneTree" :key="g.label" class="settings__hz-group" :class="{ 'settings__hz-group--expanded': expandedGroups[g.label] }">
                  <div class="settings__hz-parent" :class="{ 'settings__hz-parent--checked': parentState(g) === 'all', 'settings__hz-parent--partial': parentState(g) === 'some' }">
                    <label class="settings__hz-parent-check" @click.stop>
                      <input type="checkbox"
                        :checked="parentState(g) === 'all'"
                        :indeterminate.prop="parentState(g) === 'some'"
                        @change="toggleParent(g, $event.target.checked)" />
                    </label>
                    <span class="settings__hz-icon"><Icon :name="g.icon" :size="14" /></span>
                    <span class="settings__hz-name" style="flex:1">{{ g.label }}</span>
                    <button v-if="g.children.length > 1" class="settings__hz-toggle" @click="expandedGroups[g.label] = !expandedGroups[g.label]">
                      <span class="settings__hz-arrow" :class="{ 'settings__hz-arrow--open': expandedGroups[g.label] }"><Icon name="chevron-right" :size="12" /></span>
                    </button>
                  </div>
                  <div v-if="g.children.length <= 1 || expandedGroups[g.label]" class="settings__hz-children">
                    <label v-for="c in g.children" :key="c.key" class="settings__hz-child" :class="{ 'settings__hz-child--checked': hideZones[c.key] }">
                      <input type="checkbox"
                        :checked="hideZones[c.key]"
                        @change="$emit('set-hide-zone', { key: c.key, val: $event.target.checked })" />
                      <span class="settings__hz-child-name">{{ c.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- RULES -->
          <template v-if="open === 'rules'">
            <div class="popup-body">
              <div v-if="!rules.length" class="empty">{{ $t('settings.rules.empty') }}</div>
              <!-- Bọc danh sách quy tắc trong container có thể scroll khi nội dung dài -->
              <div v-else class="settings__rules-list">
                <div v-for="r in rules" :key="r" class="settings__rule">
                  <div class="settings__rule-dot"></div><span>{{ r }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- IMPORT JSON -->
          <template v-if="open === 'json'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:6px">{{ $t('settings.json.hint') }}</div>
              <textarea class="popup-input" v-model="importJson" :placeholder="$t('settings.json.placeholder')" style="height:120px;resize:none;font-size:10px;line-height:1.5"></textarea>
              <div v-if="importErr" class="err" style="margin-top:4px">{{ importErr }}</div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn primary" style="background:var(--accent)" @click="$emit('import-json', importJson)" :disabled="!importJson || syncing">
                {{ syncing ? $t('settings.json.updating') : $t('settings.json.button') }}
              </button>
            </div>
          </template>

          <!-- CURRENCY SELECTOR — dạng tab -->
          <template v-if="open === 'currency'">
            <div class="popup-body">
              <!-- Tab navigation -->
              <div class="tab-nav">
                <button class="tab-btn" :class="{ active: currTab === 'display' }" @click="currTab = 'display'">{{ $t('settings.currency.tabDisplay') }}</button>
                <button class="tab-btn" :class="{ active: currTab === 'base' }" @click="currTab = 'base'">{{ $t('settings.currency.tabBase') }}</button>
                <button v-if="currentCurrency === 'JPY'" class="tab-btn" :class="{ active: currTab === 'jpy' }" @click="currTab = 'jpy'">{{ $t('settings.currency.tabJpy') }}</button>
              </div>

              <!-- Tab: Tiền tệ hiển thị (mặc định) -->
              <template v-if="currTab === 'display'">
                <div class="hint" style="margin-bottom:8px">{{ $t('settings.currency.displayHint') }}</div>
                <div class="settings__lang-list">
                  <button
                    v-for="cur in CURRENCIES"
                    :key="cur"
                    class="settings__lang-item"
                    :class="{ 'settings__lang-item--active': currentCurrency === cur }"
                    @click="selectCurrency(cur)"
                  >
                    <span class="settings__lang-name">{{ $t('settings.currency.' + cur) }}</span>
                    <Icon v-if="currentCurrency === cur" name="check" :size="14" class="settings__lang-check" />
                  </button>
                </div>
                <div v-if="currentCurrency !== 'VND'" style="margin-top:10px;text-align:center" class="settings__sync-note">
                  <template v-if="ratesLoading">{{ $t('settings.currency.rateLoading') }}</template>
                  <template v-else-if="ratesError">{{ $t('settings.currency.rateError') }}</template>
                  <template v-else>{{ $t('settings.currency.rateInfo') }}</template>
                </div>
              </template>

              <!-- Tab: Tiền tệ gốc -->
              <template v-if="currTab === 'base'">
                <div class="hint" style="margin-bottom:8px">{{ $t('settings.currency.baseHint') }}</div>
                <div class="settings__lang-list">
                  <button
                    v-for="cur in CURRENCIES"
                    :key="'base-' + cur"
                    class="settings__lang-item"
                    :class="{ 'settings__lang-item--active': currentBaseCurrency === cur }"
                    @click="selectBaseCurrency(cur)"
                  >
                    <span class="settings__lang-name">{{ $t('settings.currency.' + cur) }}</span>
                    <Icon v-if="currentBaseCurrency === cur" name="check" :size="14" class="settings__lang-check" />
                  </button>
                </div>
              </template>

              <!-- Tab: Ký hiệu JPY — chỉ hiện khi tiền tệ hiển thị là JPY -->
              <template v-if="currTab === 'jpy' && currentCurrency === 'JPY'">
                <div class="hint" style="margin-bottom:6px">{{ $t('settings.currency.jpyNotation') }}</div>
                <div style="display:flex;gap:4px">
                  <button :class="['tab-btn', currentJpyNotation === 'standard' ? 'active' : '']" style="flex:1" @click="selectJpyNotation('standard')">{{ $t('settings.currency.jpyStandard') }}</button>
                  <button :class="['tab-btn', currentJpyNotation === 'kanji' ? 'active' : '']" style="flex:1" @click="selectJpyNotation('kanji')">{{ $t('settings.currency.jpyKanji') }}</button>
                </div>
              </template>
            </div>
          </template>

          <!-- LOGOUT CONFIRM -->
          <template v-if="open === 'logout'">
            <div class="popup-body">
              <div class="settings__logout-icon">
                <Icon name="log-out" :size="32" color="var(--danger)" />
              </div>
              <p class="settings__logout-msg">{{ $t('settings.logout.confirm') }}</p>
              <p class="settings__logout-hint">{{ $t('settings.logout.hint') }}</p>
            </div>
            <div class="popup-actions settings__popup-actions--gap">
              <button class="popup-btn" @click="closePopup">{{ $t('settings.logout.cancel') }}</button>
              <button class="popup-btn settings__popup-btn--danger" @click="$emit('logout')">{{ $t('settings.logout.button') }}</button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCurrency, CURRENCIES } from '../../composables/api/useCurrency'

const { fN } = useFormatters()
const { t } = useI18n()
const { displayCurrency, baseCurrency, jpyNotation, ratesLoading, ratesError, fetchRates, setDisplayCurrency, setBaseCurrency, setJpyNotation, fCurrFull } = useCurrency()

const currentCurrency = computed(() => displayCurrency.value)
const currentBaseCurrency = computed(() => baseCurrency.value)
const currentJpyNotation = computed(() => jpyNotation.value)

function selectCurrency(cur) {
  setDisplayCurrency(cur)
  if (cur !== 'VND') fetchRates()
}

function selectBaseCurrency(cur) {
  setBaseCurrency(cur)
}

function selectJpyNotation(n) {
  setJpyNotation(n)
}

function openCurrency() {
  open.value = 'currency'
  currTab.value = 'display'
  if (displayCurrency.value !== 'VND') fetchRates()
}


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
  'logout',
])

const titles = computed(() => ({
  lim: t('settings.menu.limit'),
  hz: t('settings.menu.hideZones'),
  rules: t('settings.menu.rules'),
  json: t('settings.menu.json'),
  currency: t('settings.menu.currency'),
  progressMode: t('settings.progressMode.title'),
  logout: t('settings.menu.logout'),
}))

const zoneTree = computed(() => [
  { icon: 'alert-triangle', label: t('settings.hideZones.zones.alert'), children: [{ key: 'alert', name: t('settings.hideZones.zones.alertChild') }] },
  { icon: 'banknote', label: t('settings.hideZones.zones.cash'), children: [
    { key: 'cash.balance', name: t('settings.hideZones.zones.cashBalance') },
    { key: 'cash.todaySpent', name: t('settings.hideZones.zones.cashToday') },
    { key: 'cash.monthSpent', name: t('settings.hideZones.zones.cashMonth') },
  ]},
  { icon: 'credit-card', label: t('settings.hideZones.zones.debtGroup'), children: [
    { key: 'debt.total', name: t('settings.hideZones.zones.debtTotal') },
    { key: 'debt.cardBal', name: t('settings.hideZones.zones.debtCard') },
    { key: 'debt.minPay', name: t('settings.hideZones.zones.debtMin') },
  ]},
  { icon: 'trending-down', label: t('settings.hideZones.zones.progress'), children: [
    { key: 'progress.origDebt', name: t('settings.hideZones.zones.progressOrig') },
    { key: 'progress.remaining', name: t('settings.hideZones.zones.progressRem') },
  ]},
  { icon: 'calendar', label: t('settings.hideZones.zones.upcoming'), children: [
    { key: 'upcoming.amount', name: t('settings.hideZones.zones.upcomingAmt') },
    { key: 'upcoming.shortage', name: t('settings.hideZones.zones.upcomingShortage') },
  ]},
  { icon: 'receipt', label: t('settings.hideZones.zones.txGroup'), children: [{ key: 'transactions', name: t('settings.hideZones.zones.txAmt') }] },
  { icon: 'bar-chart-3', label: t('settings.hideZones.zones.chartsGroup'), children: [
    { key: 'charts.spend', name: t('settings.hideZones.zones.chartsSpend') },
    { key: 'charts.debtLine', name: t('settings.hideZones.zones.chartsDebt') },
    { key: 'charts.pie', name: t('settings.hideZones.zones.chartsPie') },
  ]},
  { icon: 'clock', label: t('settings.hideZones.zones.timelineGroup'), children: [
    { key: 'timeline.debt', name: t('settings.hideZones.zones.timelineDebt') },
    { key: 'timeline.eventAmt', name: t('settings.hideZones.zones.timelineEvent') },
  ]},
  { icon: 'settings', label: t('settings.hideZones.zones.settingsGroup'), children: [
    { key: 'settings.cardInfo', name: t('settings.hideZones.zones.settingsCard') },
    { key: 'settings.dailyLim', name: t('settings.hideZones.zones.settingsLimit') },
    { key: 'settings.dropdown', name: t('settings.hideZones.zones.settingsDropdown') },
    { key: 'settings.cashInfo', name: t('settings.hideZones.zones.settingsCash') },
  ]},
])

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
/** Tab hiện tại trong popup tiền tệ: 'display' | 'base' | 'jpy' */
const currTab = ref('display')
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

<style scoped>
/* Menu list */
.settings__list { display: flex; flex-direction: column; gap: 6px; }
.settings__item { display: flex; align-items: center; gap: 12px; padding: 13px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: background .12s; -webkit-tap-highlight-color: transparent; }
.settings__item:active { background: var(--surface2); }
.settings__item-ico { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; }
.settings__item-label { flex: 1; font-family: var(--sans); font-size: 13px; font-weight: 600; color: var(--text); }
.settings__item-arrow { font-size: 13px; color: var(--muted); flex-shrink: 0; }
.settings__sep { height: 1px; background: var(--border); margin: 4px 0; }
.settings__item--danger { border-color: rgba(var(--danger-rgb),.2); }
.settings__item--danger:active { background: rgba(var(--danger-rgb),.08); }
.settings__item-ico--danger { color: var(--danger); }
.settings__item-label--danger { color: var(--danger); }

/* Sync note */
.settings__sync-note { font-family: var(--mono); font-size: 10px; color: var(--muted); }

/* Limit bar */
.settings__lim-wrap { display: flex; align-items: center; gap: 8px; margin: 9px 0 5px; }
.settings__lim-bar { flex: 1; height: 5px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
.settings__lim-fill { height: 100%; border-radius: 99px; transition: width .4s; }
.settings__lim-fill--safe { background: var(--accent3); }
.settings__lim-fill--warn { background: var(--accent); }
.settings__lim-fill--over { background: var(--accent2); }

/* Rules */
.settings__rule { display: flex; align-items: flex-start; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
.settings__rule:last-child { border-bottom: none; }
.settings__rule-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent2); margin-top: 5px; flex-shrink: 0; }

/* Currency section divider + labels */
.settings__cur-section-label { font-family: var(--sans); font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
.settings__cur-divider { height: 1px; background: var(--border); margin: 14px 0; }

/* Language / Currency selector */
.settings__lang-list { display: flex; flex-direction: column; gap: 6px; }
.settings__lang-item { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px 16px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: all .15s; font-family: var(--sans); font-size: 14px; color: var(--text); }
.settings__lang-item:active { background: rgba(var(--accent-rgb),.08); }
.settings__lang-item--active { border-color: var(--accent); background: rgba(var(--accent-rgb),.06); }
.settings__lang-name { font-weight: 500; }
.settings__lang-check { color: var(--accent); }

/* Danh sách quy tắc có thể scroll khi nhiều items */
.settings__rules-list { display: flex; flex-direction: column; max-height: 280px; overflow-y: auto; }

/* Hide zones treeview */
.settings__hz-tree { display: flex; flex-direction: column; gap: 4px; max-height: 310px; overflow-y: auto; }
.settings__hz-group { margin-bottom: 2px; }
.settings__hz-parent { display: flex; align-items: center; gap: 9px; padding: 8px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 9px; user-select: none; transition: all .15s; }
.settings__hz-group--expanded .settings__hz-parent { border-radius: 9px 9px 4px 4px; }
.settings__hz-parent:hover { border-color: var(--muted); }
.settings__hz-parent--checked { border-color: var(--accent); background: rgba(var(--accent-rgb),.04); }
.settings__hz-parent--partial { border-color: rgba(var(--accent-rgb),.35); background: rgba(var(--accent-rgb),.02); }
.settings__hz-parent-check { display: flex; align-items: center; cursor: pointer; }
.settings__hz-toggle { background: none; border: none; padding: 2px 4px; cursor: pointer; color: var(--muted); font-size: 13px; line-height: 1; transition: color .15s; }
.settings__hz-toggle:hover { color: var(--text); }
.settings__hz-arrow { display: inline-block; transition: transform .2s ease; }
.settings__hz-arrow--open { transform: rotate(90deg); }
.settings__hz-children { display: flex; flex-direction: column; gap: 0; padding-left: 20px; }
.settings__hz-child { display: flex; align-items: center; gap: 9px; padding: 6px 12px; background: var(--bg); border: 1px solid var(--border); border-top: none; cursor: pointer; user-select: none; transition: all .15s; }
.settings__hz-child:last-child { border-radius: 0 0 9px 9px; }
.settings__hz-child:hover { background: var(--surface2); }
.settings__hz-child--checked { background: rgba(var(--accent-rgb),.03); }
.settings__hz-child-name { font-size: 11px; color: var(--muted); }
.settings__hz-child--checked .settings__hz-child-name { color: var(--text); }
.settings__hz-tree input[type=checkbox] { appearance: none; -webkit-appearance: none; width: 15px; height: 15px; border: 2px solid var(--muted); border-radius: 4px; background: transparent; cursor: pointer; flex-shrink: 0; position: relative; transition: all .15s; }
.settings__hz-tree input[type=checkbox]:checked { background: var(--accent); border-color: var(--accent); }
.settings__hz-tree input[type=checkbox]:checked::after { content: '✓'; position: absolute; top: -1px; left: 1.5px; font-size: 10px; font-weight: 700; color: var(--bg); }
.settings__hz-tree input[type=checkbox]:indeterminate { border-color: var(--accent); background: transparent; }
.settings__hz-tree input[type=checkbox]:indeterminate::after { content: '—'; position: absolute; top: -2px; left: 2px; font-size: 11px; font-weight: 700; color: var(--accent); }
.settings__hz-icon { font-size: 14px; flex-shrink: 0; }
.settings__hz-name { font-size: 12px; font-weight: 600; color: var(--text); }

/* Logout confirm */
.settings__logout-icon { display: flex; justify-content: center; padding: 12px 0 8px; }
.settings__logout-msg { text-align: center; font-family: var(--sans); font-size: 14px; font-weight: 700; color: var(--text); margin: 0 0 8px; }
.settings__logout-hint { text-align: center; font-family: var(--sans); font-size: 12px; color: var(--muted); margin: 0; line-height: 1.5; }

/* Popup modifiers (only used here) */
.settings__popup-btn--danger { background: rgba(var(--danger-rgb),.12); color: var(--danger); border: 1px solid rgba(var(--danger-rgb),.25); }
.settings__popup-btn--danger:hover { background: rgba(var(--danger-rgb),.2); opacity: 1; }
.settings__popup-actions--gap { flex-direction: row; gap: 10px; }
.settings__popup-actions--gap .popup-btn { flex: 1; }
</style>
