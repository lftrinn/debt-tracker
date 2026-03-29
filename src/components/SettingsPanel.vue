<template>
  <div>
    <div class="cfg-list">
      <div class="cfg-item" @click="open = 'lim'">
        <span class="cfg-item-ico"><Icon name="chart-no-axes-column" :size="16" /></span>
        <span class="cfg-item-label">{{ $t('settings.menu.limit') }}</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'hz'">
        <span class="cfg-item-ico"><Icon name="lock" :size="16" /></span>
        <span class="cfg-item-label">{{ $t('settings.menu.hideZones') }}</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'rules'">
        <span class="cfg-item-ico"><Icon name="list" :size="16" /></span>
        <span class="cfg-item-label">{{ $t('settings.menu.rules') }}</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'json'">
        <span class="cfg-item-ico"><Icon name="refresh-ccw" :size="16" /></span>
        <span class="cfg-item-label">{{ $t('settings.menu.json') }}</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'lang'">
        <span class="cfg-item-ico"><Icon name="globe" :size="16" /></span>
        <span class="cfg-item-label">{{ $t('settings.menu.language') }}</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="openCurrency">
        <span class="cfg-item-ico"><Icon name="dollar-sign" :size="16" /></span>
        <span class="cfg-item-label">{{ $t('settings.menu.currency') }}</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-sep"></div>
      <div class="cfg-item cfg-item--danger" @click="open = 'logout'">
        <span class="cfg-item-ico cfg-item-ico--danger"><Icon name="log-out" :size="16" /></span>
        <span class="cfg-item-label cfg-item-label--danger">{{ $t('settings.menu.logout') }}</span>
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
              <div v-if="!rules.length" class="empty">{{ $t('settings.rules.empty') }}</div>
              <div v-for="r in rules" :key="r" class="rule-item">
                <div class="rule-dot"></div><span>{{ r }}</span>
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

          <!-- LANGUAGE SELECTOR -->
          <template v-if="open === 'lang'">
            <div class="popup-body">
              <div class="lang-list">
                <button
                  v-for="loc in LOCALES"
                  :key="loc"
                  class="lang-item"
                  :class="{ active: currentLocale === loc }"
                  @click="selectLocale(loc)"
                >
                  <span class="lang-name">{{ $t('settings.language.' + loc) }}</span>
                  <Icon v-if="currentLocale === loc" name="check" :size="14" class="lang-check" />
                </button>
              </div>
            </div>
          </template>

          <!-- CURRENCY SELECTOR -->
          <template v-if="open === 'currency'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:8px">{{ $t('settings.currency.display') }}</div>
              <div class="lang-list">
                <button
                  v-for="cur in CURRENCIES"
                  :key="cur"
                  class="lang-item"
                  :class="{ active: currentCurrency === cur }"
                  @click="selectCurrency(cur)"
                >
                  <span class="lang-name">{{ $t('settings.currency.' + cur) }}</span>
                  <Icon v-if="currentCurrency === cur" name="check" :size="14" class="lang-check" />
                </button>
              </div>
              <div v-if="currentCurrency === 'JPY'" style="margin-top:12px">
                <div class="hint" style="margin-bottom:6px">{{ $t('settings.currency.jpyNotation') }}</div>
                <div style="display:flex;gap:4px">
                  <button :class="['tab-btn', currentJpyNotation === 'standard' ? 'active' : '']" style="flex:1" @click="selectJpyNotation('standard')">{{ $t('settings.currency.jpyStandard') }}</button>
                  <button :class="['tab-btn', currentJpyNotation === 'kanji' ? 'active' : '']" style="flex:1" @click="selectJpyNotation('kanji')">{{ $t('settings.currency.jpyKanji') }}</button>
                </div>
              </div>
              <div v-if="currentCurrency !== 'VND'" style="margin-top:10px;text-align:center" class="small-n">
                <template v-if="ratesLoading">{{ $t('settings.currency.rateLoading') }}</template>
                <template v-else-if="ratesError">{{ $t('settings.currency.rateError') }}</template>
                <template v-else>{{ $t('settings.currency.rateInfo') }}</template>
              </div>
            </div>
          </template>

          <!-- LOGOUT CONFIRM -->
          <template v-if="open === 'logout'">
            <div class="popup-body">
              <div class="logout-confirm-icon">
                <Icon name="log-out" :size="32" color="var(--danger)" />
              </div>
              <p class="logout-confirm-msg">{{ $t('settings.logout.confirm') }}</p>
              <p class="logout-confirm-hint">{{ $t('settings.logout.hint') }}</p>
            </div>
            <div class="popup-actions popup-actions--gap">
              <button class="popup-btn" @click="closePopup">{{ $t('settings.logout.cancel') }}</button>
              <button class="popup-btn popup-btn--danger" @click="$emit('logout')">{{ $t('settings.logout.button') }}</button>
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
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'
import { LOCALES, setLocale } from '../i18n'
import { useCurrency, CURRENCIES } from '../composables/useCurrency'

const { fN } = useFormatters()
const { t, locale: i18nLocale } = useI18n()
const { displayCurrency, jpyNotation, ratesLoading, ratesError, fetchRates, setDisplayCurrency, setJpyNotation, fCurrFull } = useCurrency()

const currentLocale = computed(() => i18nLocale.value)
const currentCurrency = computed(() => displayCurrency.value)
const currentJpyNotation = computed(() => jpyNotation.value)

function selectLocale(loc) {
  setLocale(loc)
  closePopup()
}

function selectCurrency(cur) {
  setDisplayCurrency(cur)
}

function selectJpyNotation(n) {
  setJpyNotation(n)
}

function openCurrency() {
  open.value = 'currency'
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
  lang: t('settings.menu.language'),
  currency: t('settings.menu.currency'),
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
