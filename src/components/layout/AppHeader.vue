<template>
  <div class="app-header" :class="{ 'app-header--compact': scrolled }">
    <div class="app-header__inner">
      <div class="app-header__left">
        <Icon name="credit-card" :size="18" class="app-header__icon" />
        <span class="app-header__title" :class="{ 'app-header__title--hidden': scrolled }">Debt Tracker</span>
        <transition name="hdr-fade">
          <div v-if="scrolled" class="app-header__sync">
            <div class="app-header__sync-dot" :class="`app-header__sync-dot--${syncStatus}`"></div>
            <span v-if="syncTime" class="app-header__sync-time">{{ syncTime }}</span>
            <span v-if="syncTime" class="app-header__sep">·</span>
            <span class="app-header__date">{{ today }}</span>
            <span class="app-header__sep">·</span>
            <Icon :name="limIcon" :size="12" class="app-header__lim-icon" :class="[`app-header__lim-icon--${limSt}`, { 'app-header__lim-icon--blink': limBlink }]" @click="$emit('scroll-alert')" />
            <span v-if="cashDaysLeft !== null && cashDaysLeft < dToSalary" class="app-header__days-badge" @click="$emit('scroll-alert')">{{ hideAlert ? '•/•' : cashDaysLeft + '/' + dToSalary }}</span>
          </div>
        </transition>
      </div>
      <div class="app-header__actions">
        <!-- Nút chọn ngôn ngữ -->
        <button class="app-header__btn" @click="langOpen = true" :title="$t('settings.menu.language')">
          <Icon name="globe" :size="16" />
        </button>
        <button class="app-header__btn app-header__btn--eye" :class="{ 'app-header__btn--eye-active': hideAmounts }" @click="$emit('toggle-hide')" :title="hideAmounts ? $t('header.showAmounts') : $t('header.hideAmounts')">
          <Icon :name="hideAmounts ? 'eye-off' : 'eye'" :size="18" />
        </button>
        <button class="app-header__btn" @click="$emit('reload')" :title="$t('header.reload')">
          <Icon name="refresh-cw" :size="16" />
        </button>
      </div>

      <!-- Popup chọn ngôn ngữ — z-index cao hơn header để hiện lên trên -->
      <Transition name="popup">
        <div v-if="langOpen" class="popup-overlay" style="z-index:9100" @click.self="langOpen = false">
          <div class="popup-sheet">
            <div class="popup-handle"><div class="popup-handle-bar"></div></div>
            <div class="popup-hdr">
              <span class="popup-title">{{ $t('settings.menu.language') }}</span>
              <button class="popup-close" @click="langOpen = false"><Icon name="x" :size="18" /></button>
            </div>
            <div class="popup-body">
              <div class="app-header__lang-list">
                <button
                  v-for="loc in LOCALES"
                  :key="loc"
                  class="app-header__lang-item"
                  :class="{ 'app-header__lang-item--active': currentLocale === loc }"
                  @click="selectLocale(loc)"
                >
                  <span>{{ $t('settings.language.' + loc) }}</span>
                  <Icon v-if="currentLocale === loc" name="check" :size="14" class="app-header__lang-check" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
      <transition name="over-slide">
        <div v-if="overBanner" class="app-header__banner">
          <Icon name="alert-triangle" :size="14" class="app-header__banner-icon" />
          <span class="app-header__banner-msg">{{ overMsg }}</span>
          <button class="app-header__banner-btn" @click="$emit('dismiss-over')">
            <Icon name="check" :size="14" />
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { LOCALES, setLocale } from '../../i18n'

const { locale: i18nLocale } = useI18n()

/** Trạng thái popup chọn ngôn ngữ */
const langOpen = ref(false)
const currentLocale = computed(() => i18nLocale.value)

/** Chọn ngôn ngữ và đóng popup */
function selectLocale(loc) {
  setLocale(loc)
  langOpen.value = false
}

/** Khoá scroll body khi popup mở */
watch(langOpen, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})

const props = defineProps({
  today: String,
  hideAmounts: Boolean,
  hideAlert: Boolean,
  scrolled: Boolean,
  syncStatus: String,
  syncMsg: String,
  syncTime: String,
  limSt: String,
  limBlink: Boolean,
  overBanner: Boolean,
  overMsg: String,
  cashDaysLeft: Number,
  dToSalary: Number,
})

const limIcon = computed(() =>
  props.limSt === 'over' ? 'alert-triangle' : props.limSt === 'warn' ? 'alert-triangle' : 'check'
)
defineEmits(['reload', 'toggle-hide', 'scroll-alert', 'dismiss-over'])
</script>

<style scoped>
.app-header { position: sticky; top: 0; z-index: 9000; background: var(--bg); border-bottom: 1px solid var(--border); padding-top: env(safe-area-inset-top, 0px); }
.app-header__inner { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; max-width: 480px; margin: 0 auto; padding: 14px 16px; transition: padding .25s ease; }
.app-header--compact .app-header__inner { padding: 8px 16px; }
.app-header--compact .app-header__icon { transform: scale(.85); }
.app-header--compact .app-header__btn { width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; }
.app-header--compact .app-header__btn :deep(svg) { width: 13px; height: 13px; }
.app-header__left { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; overflow: hidden; }
.app-header__icon { flex-shrink: 0; color: var(--muted); transition: transform .25s ease; }
.app-header__title { font-weight: 800; font-size: 12px; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); white-space: nowrap; transition: opacity .2s, max-width .25s, margin .25s; max-width: 120px; overflow: hidden; }
.app-header__title--hidden { opacity: 0; max-width: 0; margin: 0; }
.app-header__sync { display: flex; align-items: center; gap: 5px; font-family: var(--mono); font-size: 10px; color: var(--muted); white-space: nowrap; overflow: hidden; }
.app-header__sync-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.app-header__sync-dot--syncing { background: var(--accent); animation: pulse 1s infinite; }
.app-header__sync-dot--synced { background: var(--accent3); }
.app-header__sync-dot--error { background: var(--accent2); }
.app-header__sync-time { color: var(--muted); }
.app-header__sep { color: var(--border); }
.app-header__date { color: var(--muted); }
.app-header__lim-icon { flex-shrink: 0; cursor: pointer; }
.app-header__lim-icon--safe { color: var(--accent3); }
.app-header__lim-icon--warn { color: var(--accent6); }
.app-header__lim-icon--over { color: var(--danger); }
.app-header__lim-icon--blink { animation: lim-blink 1s ease-in-out infinite; }
.app-header__days-badge { padding: 1px 6px; border-radius: 6px; background: rgba(var(--danger-rgb),.18); color: var(--accent2); font-size: 9px; font-weight: 700; font-family: var(--mono); cursor: pointer; }
@keyframes lim-blink { 0%,100% { opacity: 1; } 50% { opacity: .2; } }
.app-header__actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.app-header__btn { background: none; border: 1px solid var(--border); border-radius: 7px; color: var(--muted); font-size: 13px; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: width .25s ease, height .25s ease, border-color .2s, color .2s; }
.app-header__btn:hover { color: var(--text); }
.app-header__btn--eye-active { color: var(--accent); border-color: var(--accent); }
.app-header__banner { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; gap: 8px; padding: 0 16px; background: rgba(var(--danger-rgb),.12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.app-header__banner-icon { color: var(--danger); flex-shrink: 0; animation: lim-blink 1s ease-in-out infinite; }
.app-header__banner-msg { flex: 1; font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--danger); }
.app-header__banner-btn { background: none; border: 1px solid rgba(var(--danger-rgb),.3); border-radius: 6px; color: var(--danger); padding: 3px 8px; cursor: pointer; flex-shrink: 0; transition: all .2s; display: flex; align-items: center; }
.app-header__banner-btn:hover { background: rgba(var(--danger-rgb),.15); }
.hdr-fade-enter-active { transition: opacity .2s ease .1s; }
.hdr-fade-leave-active { transition: opacity .15s ease; }
.hdr-fade-enter-from, .hdr-fade-leave-to { opacity: 0; }
.over-slide-enter-active { transition: transform .3s cubic-bezier(.22,1,.36,1); }
.over-slide-leave-active { transition: transform .25s ease-in; }
.over-slide-enter-from, .over-slide-leave-to { transform: translateY(-100%); }
.over-slide-enter-to, .over-slide-leave-from { transform: translateY(0); }

/* Popup ngôn ngữ — dùng class chung từ styles.css, chỉ thêm list style */
.app-header__lang-list { display: flex; flex-direction: column; gap: 6px; }
.app-header__lang-item { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px 16px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: all .15s; font-family: var(--sans); font-size: 14px; color: var(--text); }
.app-header__lang-item:active { background: rgba(var(--accent-rgb),.08); }
.app-header__lang-item--active { border-color: var(--accent); background: rgba(var(--accent-rgb),.06); font-weight: 600; }
.app-header__lang-check { color: var(--accent); }
</style>
