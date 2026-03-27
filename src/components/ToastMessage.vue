<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      <Icon :name="type === 'ok' ? 'circle-check' : 'circle-x'" :size="16" />
      <span class="toast-text">{{ message }}</span>
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
