<template>
  <div class="sticky-hdr" :class="{ compact: scrolled }">
    <div class="hdr">
      <div class="hdr-left">
        <Icon name="credit-card" :size="18" class="hdr-icon" />
        <span class="hdr-title-text" :class="{ hidden: scrolled }">Debt Tracker</span>
        <transition name="hdr-fade">
          <div v-if="scrolled" class="hdr-sync-compact">
            <div class="sync-dot-sm" :class="syncStatus"></div>
            <span v-if="syncTime" class="hdr-sync-time">{{ syncTime }}</span>
            <span v-if="syncTime" class="hdr-sep">·</span>
            <span class="hdr-date-compact">{{ today }}</span>
            <span class="hdr-sep">·</span>
            <Icon :name="limIcon" :size="12" class="hdr-lim-ico" :class="[limSt, { blink: limBlink }]" @click="$emit('scroll-alert')" />
          </div>
        </transition>
      </div>
      <div class="hdr-r">
        <button class="btn-ico btn-eye" :class="{ active: hideAmounts }" @click="$emit('toggle-hide')" :title="hideAmounts ? 'Hiện số tiền' : 'Ẩn số tiền'">
          <Icon :name="hideAmounts ? 'eye-off' : 'eye'" :size="18" />
        </button>
        <button class="btn-ico" @click="$emit('reload')" title="Cập nhật phiên bản mới">
          <Icon name="refresh-cw" :size="16" />
        </button>
        <button class="btn-ico" @click="$emit('logout')" title="Đăng xuất">
          <Icon name="log-out" :size="16" />
        </button>
      </div>
      <transition name="over-slide">
        <div v-if="overBanner" class="over-banner">
          <Icon name="alert-triangle" :size="14" class="over-banner-ico" />
          <span class="over-banner-msg">{{ overMsg }}</span>
          <button class="over-banner-btn" @click="$emit('dismiss-over')">
            <Icon name="check" :size="14" />
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  today: String,
  hideAmounts: Boolean,
  scrolled: Boolean,
  syncStatus: String,
  syncMsg: String,
  syncTime: String,
  limSt: String,
  limBlink: Boolean,
  overBanner: Boolean,
  overMsg: String,
})

const limIcon = computed(() =>
  props.limSt === 'over' ? 'alert-triangle' : props.limSt === 'warn' ? 'alert-triangle' : 'check'
)
defineEmits(['reload', 'logout', 'toggle-hide', 'scroll-alert', 'dismiss-over'])
</script>
