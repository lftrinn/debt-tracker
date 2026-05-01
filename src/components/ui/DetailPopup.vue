<template>
  <Transition name="popup">
    <div v-if="item && isUpcoming" class="popup-overlay" @click.self="$emit('close')">
      <div class="popup-sheet">
        <div class="popup-handle"><div class="popup-handle-bar"></div></div>

        <!-- Header · Khai Chiến -->
        <div class="popup-hdr">
          <span class="popup-title">
            <IconSword :size="16" />
            Khai Chiến
          </span>
          <button class="popup-close" @click="$emit('close')"><Icon name="x" :size="18" /></button>
        </div>

        <!-- Tier-aware hero · port từ design PayQuestPopup -->
        <div
          v-if="tierDescriptor"
          :class="['popup-hero', `tier-${tierDescriptor.tier.key}`]"
          :style="{ '--tier-color': tierDescriptor.tier.color, '--tier-glow': tierDescriptor.tier.glow }"
        >
          <div class="tier-badge">{{ tierDescriptor.tier.classn }} · {{ tierDescriptor.tier.rank }}</div>
          <div class="portrait tier-portrait">
            <component :is="tierDescriptor.portrait" :size="44" />
          </div>
          <div class="danger-pips center">
            <span v-for="i in 9" :key="i" :class="{ on: i <= tierDescriptor.tier.danger }"></span>
          </div>
          <div class="nm">{{ heroName }}</div>
          <div class="popup-realm">{{ tierDescriptor.tier.realm }} · {{ tierDescriptor.tier.desc }}</div>
          <div class="amt">
            <span class="cu">đ</span>
            <template v-if="hide"><span class="masked">{{ MASK_GLYPHS }}</span></template>
            <template v-else>{{ fN(heroAmt) }}</template>
          </div>
        </div>

        <!-- Real-data block (▾ Nguồn thật) khi useDisplay -->
        <div v-if="useTutien && (rawName || note)" class="popup-realdata">
          <div class="lab">▾ Nguồn thật</div>
          <div v-if="rawName" class="rn">{{ rawName }}</div>
          <div v-if="note" class="dn">{{ note }}</div>
        </div>

        <!-- 4-stat grid theo design -->
        <div class="popup-stats">
          <div class="popup-stat">
            <div class="l">Tổn thương</div>
            <div class="v hp">−{{ hide ? MASK_SHORT : fmtShort(heroAmt) }}đ</div>
          </div>
          <div class="popup-stat">
            <div class="l">Hạn kiếp</div>
            <div class="v gd">{{ dueShort }}</div>
          </div>
          <div class="popup-stat">
            <div class="l">Phần thưởng</div>
            <div class="v gn">+{{ xpReward }} tu vi</div>
          </div>
          <div class="popup-stat">
            <div class="l">Tình trạng</div>
            <div class="v" :style="{ color: item.urg ? 'var(--crimson)' : 'var(--gold)' }">
              {{ item.paid ? 'Đã trảm' : statusLabel }}
            </div>
          </div>
        </div>

        <!-- Action buttons · Pay / Hoãn / Né tránh -->
        <div class="popup-actions">
          <button
            class="popup-btn attack"
            :disabled="!!item.paid || (availCash ?? 0) < heroAmt"
            @click="onPay"
          >{{ item.paid ? 'Đã trảm' : 'Xuất Kiếm Tấn Công' }}</button>
          <button class="popup-btn flee" @click="$emit('delete', item)">Né tránh</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { IconSword } from './quest-icons'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useDisplayMode } from '../../composables/ui/useDisplayMode'
import { tierForAmount, nameForBoss, type BossTier } from '../../composables/data/useBossTiers'
import { TIER_PORTRAITS, type BossPortraitProps } from './quest-bosses'
import { MASK_GLYPHS, MASK_SHORT } from '../../composables/ui/usePrivacy'
import { getLocalized } from '../../composables/data/useI18nData'
import type { FunctionalComponent } from 'vue'

const { fN } = useFormatters()
const { mode: displayMode } = useDisplayMode()
const useTutien = computed(() => displayMode.value === 'tutien')

interface PopupItem {
  _variant?: string
  _key?: string
  _date?: string
  _category?: string | null
  name?: string
  desc?: string
  nameI18n?: Record<string, string>
  amt?: number
  amount?: number
  paid?: boolean
  urg?: string
  overdueDays?: number
  note?: string | null
}

const props = defineProps<{
  item: PopupItem | null
  availCash?: number
  hide?: boolean
}>()

const emit = defineEmits<{
  close: []
  'toggle-paid': [key: string, amount: number, name: string]
  delete: [item: PopupItem]
}>()

/** Chỉ render khi variant=upcoming (design không có tx detail popup). */
const isUpcoming = computed(() => props.item?._variant === 'upcoming')

const heroName = computed(() => {
  if (!props.item) return ''
  return getLocalized(props.item, 'name')
})

/** Raw name (gốc, không qua i18n) để hiển thị trong popup-realdata. */
const rawName = computed(() => {
  const i = props.item
  if (!i || !i.name) return ''
  const localized = getLocalized(i, 'name')
  return localized !== i.name ? i.name : ''
})

const note = computed(() => props.item?.note || '')

const heroAmt = computed(() => props.item?.amt ?? props.item?.amount ?? 0)

interface TierDesc {
  tier: BossTier
  portrait: FunctionalComponent<BossPortraitProps>
}

const tierDescriptor = computed<TierDesc | null>(() => {
  if (!props.item) return null
  const tier = tierForAmount(heroAmt.value)
  return {
    tier,
    portrait: TIER_PORTRAITS[tier.key],
  }
})

const dueShort = computed(() => {
  const i = props.item
  if (!i || !i._date) return '—'
  const d = new Date(i._date)
  if (isNaN(d.getTime())) return i._date
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
})

const statusLabel = computed(() => {
  const i = props.item
  if (!i || !i._date) return '—'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(i._date)
  d.setHours(0, 0, 0, 0)
  const days = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (days < 0) return `${Math.abs(days)}d · trễ`
  if (days === 0) return 'Hôm nay'
  if (i.urg === 'urgent' || i.urg === 'overdue') return `${days}d · gấp`
  return `${days} ngày`
})

/** XP reward heuristic — same as QuestList. */
const xpReward = computed(() => Math.max(10, Math.min(200, Math.floor(heroAmt.value / 50_000))))

function fmtShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return (a / 1e3).toFixed(0) + 'K'
  return String(Math.round(a))
}

function onPay(): void {
  if (!props.item || props.item.paid) return
  emit('toggle-paid', props.item._key || '', heroAmt.value, props.item.name || '')
}
</script>
