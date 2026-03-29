<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="`toast--${type}`">
      <Icon :name="type === 'ok' ? 'circle-check' : 'circle-x'" :size="16" />
      <span class="toast__text">{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  message: String,
  type: { type: String, default: 'ok' },
  trigger: Number,
})

const visible = ref(false)
let timer = null

watch(() => props.trigger, () => {
  if (!props.message) return
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, 2200)
})
</script>

<style scoped>
.toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-family: var(--sans); font-size: 12px; font-weight: 600; z-index: 9999; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 4px 20px rgba(0,0,0,.4); white-space: nowrap; max-width: calc(100vw - 32px); }
.toast--ok { background: rgba(var(--accent3-rgb),.15); border: 1px solid rgba(var(--accent3-rgb),.3); color: var(--accent3); }
.toast--err { background: rgba(var(--danger-rgb),.15); border: 1px solid rgba(var(--danger-rgb),.3); color: var(--danger); }
.toast-enter-active { transition: all .3s ease; }
.toast-leave-active { transition: all .25s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
</style>
