<template>
  <Teleport to="body">
    <Transition name="strike">
      <div
        v-if="visible && descriptor"
        :class="['strike-toast', `tier-${descriptor.tier.key}`, descriptor.kind]"
        :style="{ '--tier-color': descriptor.tier.color, '--tier-glow': descriptor.tier.glow }"
        @click="close"
      >
        <div class="strike-toast__inner">
          <div class="strike-toast__rank">{{ descriptor.tier.rank }} · {{ descriptor.tier.school }}</div>
          <div class="strike-toast__name">{{ descriptor.chieu }}</div>
          <div class="strike-toast__art">
            <component :is="descriptor.illo" :size="160" />
          </div>
          <div class="strike-toast__desc">{{ descriptor.tier.desc }}</div>
          <div class="strike-toast__tier">{{ descriptor.tier.name }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StrikeDescriptor } from '@/composables/data/useSwordHeal'

const props = defineProps<{
  /** Trigger to show: when descriptor changes (or stays same with new key), display starts. */
  descriptor: StrikeDescriptor | null
  /** Auto-dismiss duration ms (default 1600). */
  duration?: number
}>()

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.descriptor,
  (desc) => {
    if (desc) {
      visible.value = false
      // double rAF để Vue commit DOM trước khi re-show (clean transition restart)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          visible.value = true
          if (timer) clearTimeout(timer)
          timer = setTimeout(close, props.duration ?? 1600)
        })
      })
    }
  },
)

function close(): void {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}
</script>

<style scoped>
.strike-toast {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  pointer-events: auto;
  color: var(--tier-color);
}

.strike-toast__inner {
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
  padding: 32px 24px;
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--tier-color) 22%, transparent) 0%, transparent 70%),
    var(--ink);
  border: 1px solid var(--tier-color);
  border-radius: 12px;
  max-width: 320px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 40px color-mix(in srgb, var(--tier-glow) 40%, transparent),
    0 12px 48px rgba(0, 0, 0, 0.6);
}
.strike-toast__inner::before {
  content: ''; position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: conic-gradient(from 0deg at 50% 50%,
    transparent 0deg,
    color-mix(in srgb, var(--tier-glow) 12%, transparent) 60deg,
    transparent 120deg,
    color-mix(in srgb, var(--tier-color) 10%, transparent) 240deg,
    transparent 360deg);
  animation: strike-spin 6s linear infinite;
  pointer-events: none;
}

.strike-toast__rank {
  position: relative; z-index: 2;
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 10px;
  color: var(--tier-color);
  letter-spacing: 0.18em; text-transform: uppercase;
  text-shadow: 0 0 6px color-mix(in srgb, var(--tier-glow) 40%, transparent);
}

.strike-toast__name {
  position: relative; z-index: 2;
  font-family: var(--serif-vn); font-weight: 700;
  font-size: 22px;
  color: var(--tier-color);
  letter-spacing: 0.02em;
  margin-top: 6px;
  text-shadow: 0 0 16px color-mix(in srgb, var(--tier-glow) 60%, transparent);
}

.strike-toast__art {
  position: relative; z-index: 2;
  margin: 14px 0;
  color: var(--tier-color);
  filter: drop-shadow(0 0 24px color-mix(in srgb, var(--tier-glow) 50%, transparent));
}

.strike-toast__desc {
  position: relative; z-index: 2;
  font-family: var(--serif); font-style: italic;
  font-size: 12px;
  color: var(--text-2);
  letter-spacing: 0.04em;
  line-height: 1.5;
  max-width: 240px;
}

.strike-toast__tier {
  position: relative; z-index: 2;
  margin-top: 10px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 11px;
  color: var(--tier-color);
  letter-spacing: 0.16em; text-transform: uppercase;
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--tier-color) 50%, transparent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--tier-color) 8%, var(--ink));
}

@keyframes strike-spin {
  to { transform: rotate(360deg); }
}

/* ─── Slide-up + fade transition ─── */
.strike-enter-from {
  opacity: 0;
}
.strike-enter-from .strike-toast__inner {
  transform: scale(0.85) translateY(20px);
}
.strike-enter-active {
  transition: opacity 0.25s ease-out;
}
.strike-enter-active .strike-toast__inner {
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.strike-leave-to {
  opacity: 0;
}
.strike-leave-to .strike-toast__inner {
  transform: scale(0.92) translateY(-8px);
  filter: blur(2px);
}
.strike-leave-active {
  transition: opacity 0.35s ease-in;
}
.strike-leave-active .strike-toast__inner {
  transition: transform 0.35s ease-in, filter 0.35s ease-in;
}

@media (prefers-reduced-motion: reduce) {
  .strike-toast__inner::before { animation: none; }
}
</style>
