<template>
  <div class="tabbar" role="tablist">
    <div
      v-for="t in tabs"
      :key="t.id"
      :class="['tab', { active: tab === t.id, fab: t.fab }]"
      role="tab"
      :aria-selected="tab === t.id"
      :title="$t('app.tabs.' + t.lbKey)"
      @click="$emit('set-tab', t.id)"
    >
      <div class="ic">
        <component :is="t.Ic" :size="t.fab ? 26 : 18" />
      </div>
      <div class="lb">{{ $t('app.tabs.' + t.lbKey) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import {
  IconSword,
  IconScroll,
  IconPlus,
  IconChart,
  IconMap,
  type IconProps,
} from '@/components/ui/quest-icons'

export type TabId = 'home' | 'inv' | 'add' | 'cht' | 'map'

interface TabDef {
  id: TabId
  Ic: FunctionalComponent<IconProps>
  /** Khoá i18n trong app.tabs.* */
  lbKey: string
  /** True → hiển thị dạng FAB (gold tròn, lift -22px) */
  fab?: boolean
}

defineProps<{
  /** Tab đang active. 'cfg' không có button trên bar nên không match. */
  tab: string
}>()

defineEmits<{
  'set-tab': [id: TabId]
}>()

/** Thứ tự cố định theo design — không thay đổi runtime. */
const tabs: ReadonlyArray<TabDef> = [
  { id: 'home', Ic: IconSword, lbKey: 'home' },
  { id: 'inv', Ic: IconScroll, lbKey: 'inv' },
  { id: 'add', Ic: IconPlus, lbKey: 'strike', fab: true },
  { id: 'cht', Ic: IconChart, lbKey: 'cht' },
  { id: 'map', Ic: IconMap, lbKey: 'map' },
]
</script>

<style scoped>
/* ─── TABBAR · port 1:1 từ design/Debt Tracker.html ─────────────────────── */
.tabbar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
  padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px));
  background: rgba(12, 10, 22, 0.92);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  border-top: 1px solid var(--line-2);
  display: flex; justify-content: space-around; align-items: center;
}
.tabbar::before {
  content: ''; position: absolute; top: 0; left: 50%;
  transform: translateX(-50%);
  width: 100px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

/* ─── TAB · 4 tab thường ────────────────────────────────────────────────── */
.tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 7px 2px; cursor: pointer; color: var(--muted);
  position: relative; transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.tab.active { color: var(--gold); }
.tab.active::before {
  content: ''; position: absolute; top: 0; left: 50%;
  transform: translateX(-50%);
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 8px var(--gold);
}
.tab .ic { display: flex; align-items: center; justify-content: center; }
.tab .lb {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 10px; letter-spacing: 0.04em;
}

/* ─── FAB · trung tâm, vàng tròn, lift -22px ────────────────────────────── */
.tab.fab {
  margin: -22px 6px 0; flex: 0 0 60px;
  background: radial-gradient(circle at 30% 30%, var(--gold-2), var(--gold) 50%, var(--gold-3));
  border-radius: 50%;
  width: 60px; height: 60px; padding: 0;
  border: 2px solid var(--ink);
  box-shadow:
    0 0 0 1px var(--gold),
    0 4px 16px rgba(196, 164, 108, 0.5),
    0 0 24px rgba(196, 164, 108, 0.3);
  color: var(--ink);
}
.tab.fab .ic { color: var(--ink); }
.tab.fab .lb {
  color: var(--ink); font-weight: 700;
}
.tab.fab::before { display: none; }
.tab.fab::after {
  content: ''; position: absolute; top: 6px; left: 12px;
  width: 8px; height: 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  filter: blur(2px);
}
.tab.fab:active {
  transform: translateY(1px) scale(0.97);
  box-shadow:
    0 0 0 1px var(--gold),
    0 2px 8px rgba(196, 164, 108, 0.4);
}
</style>
