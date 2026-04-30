<template>
  <div class="section-h">
    <div class="section-tag">
      <component v-if="icon" :is="icon" :size="16" class="ic" />
      {{ title }}
      <span v-if="vn" class="vn">· {{ vn }}</span>
    </div>
    <div v-if="act" class="section-act" @click="$emit('click-act')">{{ act }}</div>
  </div>
</template>

<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import type { IconProps } from '@/components/ui/quest-icons'

defineProps<{
  /** Icon component bên trái title (theme jade). */
  icon?: FunctionalComponent<IconProps>
  /** Tiêu đề chính (Hán-Việt thi vị, vd. "Kiếp Số"). */
  title: string
  /** Subtitle nhỏ in mono, vd. "quests" / "achievement". */
  vn?: string
  /** Action label bên phải, vd. "Tất cả" / "+ Triệu hồi". */
  act?: string
}>()

defineEmits<{
  'click-act': []
}>()
</script>

<style scoped>
/* ─── SECTION HEADER · port từ design ───────────────────────────────────── */
.section-h {
  display: flex; align-items: center; justify-content: space-between;
  margin: 22px 2px 10px;
}
.section-tag {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 14px; color: var(--gold);
  letter-spacing: 0.05em;
}
.section-tag :deep(.ic) { color: var(--jade); display: inline-flex; }
.section-tag .vn {
  font-family: var(--serif-vn); font-style: normal; font-weight: 500;
  font-size: 11px; color: var(--muted);
  letter-spacing: 0.02em;
}
.section-act {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 11px; color: var(--violet);
  letter-spacing: 0.04em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.section-act::after { content: ' →'; }
.section-act:active { opacity: 0.7; }
</style>
