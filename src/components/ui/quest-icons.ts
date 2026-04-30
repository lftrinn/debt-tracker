/**
 * quest-icons.ts — Tu Tiên / Kiếm Hiệp icon set.
 * Port 1:1 từ debt-tracker-design/Pages/quest-icons.jsx.
 *
 * Tất cả icon dùng currentColor stroke (kế thừa màu từ parent),
 * viewBox 24×24 (icon thường) hoặc 32×32 / 40×40 (boss glyph).
 * Class & style tự động fallthrough từ template — không cần khai báo prop.
 *
 * Sử dụng:
 *   <script setup lang="ts">
 *     import { IconSword, GlyphHac, SPRITE } from '@/components/ui/quest-icons'
 *     const Sp = SPRITE['food']  // dynamic
 *   </script>
 *   <template>
 *     <IconSword :size="18" class="text-gold" />
 *     <GlyphHac :size="36" />
 *     <component :is="Sp" :size="20" />
 *   </template>
 */

import { h, type FunctionalComponent } from 'vue'

export interface IconProps {
  /** Kích thước square (px). Mặc định 18 cho icon, 32/40 cho glyph. */
  size?: number | string
  /** Stroke width override. Mặc định theo từng icon (1.6 / 2.4 / 2.6 / 1.5 / 1.8). */
  sw?: number | string
}

interface MakeOpts {
  /** Default stroke-width nếu user không override qua `sw` */
  sw?: number
  /** ViewBox SVG. Mặc định "0 0 24 24". */
  vb?: string
  /** Default size (px) nếu user không truyền `size`. */
  defSize?: number
}

/** Helper tạo functional component cho 1 icon. */
function make(
  opts: MakeOpts,
  build: () => ReturnType<typeof h>[],
): FunctionalComponent<IconProps> {
  const sw = opts.sw ?? 1.6
  const vb = opts.vb ?? '0 0 24 24'
  const defSize = opts.defSize ?? 18
  const fn: FunctionalComponent<IconProps> = (props) =>
    h(
      'svg',
      {
        width: props.size ?? defSize,
        height: props.size ?? defSize,
        viewBox: vb,
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': props.sw ?? sw,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      build(),
    )
  return fn
}

// ─── EYE / HIDE ─────────────────────────────────────────────────────────────
export const IconEye = make({}, () => [
  h('path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z' }),
  h('circle', { cx: 12, cy: 12, r: 3 }),
])

export const IconEyeOff = make({}, () => [
  h('path', { d: 'M3 3l18 18' }),
  h('path', {
    d: 'M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 6 10 6a14 14 0 0 1-3.3 4M6.4 6.4A14 14 0 0 0 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8',
  }),
  h('path', { d: 'M14.1 14.1a3 3 0 0 1-4.2-4.2' }),
])

// ─── CURRENCY / COINS · Linh thạch ──────────────────────────────────────────
export const IconCoins = make({}, () => [
  h('ellipse', { cx: 9, cy: 8, rx: 6, ry: 3 }),
  h('path', { d: 'M3 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8' }),
  h('path', { d: 'M3 12v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4' }),
  h('ellipse', { cx: 15.5, cy: 14, rx: 5.5, ry: 2.5, opacity: 0.4 }),
])

// ─── BOSS / SKULL DEMON · Tâm ma ────────────────────────────────────────────
export const IconDemon = make({}, () => [
  h('path', { d: 'M5 4l3 4M19 4l-3 4' }),
  h('path', {
    d: 'M6 13c0-4 2.7-7 6-7s6 3 6 7c0 2-1 3.5-2 4.5v3l-2-1-2 1-2-1-2 1v-3c-1-1-2-2.5-2-4.5Z',
  }),
  h('circle', { cx: 9.5, cy: 13, r: 0.8, fill: 'currentColor' }),
  h('circle', { cx: 14.5, cy: 13, r: 0.8, fill: 'currentColor' }),
  h('path', { d: 'M10 16.5c.5-.4 1.2-.6 2-.6s1.5.2 2 .6' }),
])

// ─── SWORD · Kiếm ───────────────────────────────────────────────────────────
export const IconSword = make({}, () => [
  h('path', { d: 'M14.5 17.5L4 6V4h2l11.5 10.5' }),
  h('path', { d: 'm13 19 6-6' }),
  h('path', { d: 'm16 16 4 4' }),
  h('path', { d: 'm19 21 2-2' }),
])

// ─── SCROLL · Văn thư / Kiếp số ─────────────────────────────────────────────
export const IconScroll = make({}, () => [
  h('path', { d: 'M19 17V5a2 2 0 0 0-2-2H4' }),
  h('path', {
    d: 'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 1 4 0v3',
  }),
  h('path', { d: 'M12 8h6M12 12h6' }),
])

// ─── MAP · Lộ đồ ────────────────────────────────────────────────────────────
export const IconMap = make({}, () => [
  h('path', { d: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z' }),
  h('path', { d: 'M9 3v15M15 6v15' }),
])

// ─── CHART / BARS · Tu vi ký ────────────────────────────────────────────────
export const IconChart = make({}, () => [
  h('path', { d: 'M3 3v18h18' }),
  h('rect', { x: 6, y: 13, width: 3, height: 6 }),
  h('rect', { x: 11, y: 9, width: 3, height: 10 }),
  h('rect', { x: 16, y: 5, width: 3, height: 14 }),
])

// ─── PLUS · Khởi (FAB) ─────────────────────────────────────────────────────
export const IconPlus = make({ sw: 2.6 }, () => [h('path', { d: 'M12 5v14M5 12h14' })])

// ─── CHECK · Thành ─────────────────────────────────────────────────────────
export const IconCheck = make({ sw: 2.4 }, () => [h('path', { d: 'm5 12 5 5L20 7' })])

// ─── X / CLOSE · Phá ───────────────────────────────────────────────────────
export const IconX = make({}, () => [h('path', { d: 'M6 6l12 12M18 6 6 18' })])

// ─── CHEVRON RIGHT · Tiếp ──────────────────────────────────────────────────
export const IconChevronRight = make({}, () => [h('path', { d: 'm9 6 6 6-6 6' })])

// ─── SEARCH · Tầm ──────────────────────────────────────────────────────────
export const IconSearch = make({}, () => [
  h('circle', { cx: 11, cy: 11, r: 7 }),
  h('path', { d: 'm20 20-4-4' }),
])

// ─── SETTINGS · Đạo tâm ────────────────────────────────────────────────────
export const IconSettings = make({}, () => [
  h('circle', { cx: 12, cy: 12, r: 3 }),
  h('path', {
    d: 'M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  }),
])

// ─── WARNING / ALERT · Cảnh ────────────────────────────────────────────────
export const IconWarn = make({}, () => [
  h('path', { d: 'M12 2 2 20h20L12 2Z' }),
  h('path', { d: 'M12 9v5' }),
  h('circle', { cx: 12, cy: 17, r: 0.7, fill: 'currentColor' }),
])

// ─── FLAME · Linh hỏa / Streak ─────────────────────────────────────────────
export const IconFlame = make({}, () => [
  h('path', {
    d: 'M12 22c4 0 7-3 7-7 0-3-2-5-2-8 0 0-3 1-4 4-1-2-3-4-3-6 0 0-5 3-5 9 0 5 3 8 7 8Z',
  }),
  h('path', {
    d: 'M12 17c1 0 2-.8 2-2s-1.5-2-1.5-3.5c0 0-2 1-2 3 0 1.5.8 2.5 1.5 2.5Z',
  }),
])

// ─── MOON / SUN · Nguyệt / Nhật ────────────────────────────────────────────
export const IconMoon = make({}, () => [
  h('path', { d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z' }),
])

export const IconSun = make({}, () => [
  h('circle', { cx: 12, cy: 12, r: 4 }),
  h('path', {
    d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  }),
])

// ─── BELL · Hồng chung ─────────────────────────────────────────────────────
export const IconBell = make({}, () => [
  h('path', { d: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }),
  h('path', { d: 'M10 21a2 2 0 0 0 4 0' }),
])

// ─── CLOUD · Vân trữ ───────────────────────────────────────────────────────
export const IconCloud = make({}, () => [
  h('path', { d: 'M17 18a4 4 0 0 0 0-8h-1a6 6 0 1 0-11 4 4 4 0 0 0 4 4h8Z' }),
])

// ─── EXPORT / SHARE · Xuất ─────────────────────────────────────────────────
export const IconExport = make({}, () => [
  h('path', { d: 'M12 3v13M7 8l5-5 5 5' }),
  h('path', { d: 'M5 21h14' }),
])

// ─── USER · Đạo hữu ────────────────────────────────────────────────────────
export const IconUser = make({}, () => [
  h('circle', { cx: 12, cy: 8, r: 4 }),
  h('path', { d: 'M4 21a8 8 0 0 1 16 0' }),
])

// ─── TARGET · Tâm ấn ───────────────────────────────────────────────────────
export const IconTarget = make({}, () => [
  h('circle', { cx: 12, cy: 12, r: 9 }),
  h('circle', { cx: 12, cy: 12, r: 5 }),
  h('circle', { cx: 12, cy: 12, r: 1.5, fill: 'currentColor' }),
])

// ─── CALENDAR · Lịch pháp ──────────────────────────────────────────────────
export const IconCalendar = make({}, () => [
  h('rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }),
  h('path', { d: 'M3 10h18M8 3v4M16 3v4' }),
])

// ─── TROPHY · Phẩm đỉnh / Achievement ──────────────────────────────────────
export const IconTrophy = make({}, () => [
  h('path', { d: 'M7 4h10v6a5 5 0 0 1-10 0V4Z' }),
  h('path', { d: 'M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3' }),
  h('path', { d: 'M9 17v3h6v-3M8 20h8' }),
])

// ─── CATEGORY · ăn uống / lương thực · Tịch cốc ───────────────────────────
export const IconRice = make({}, () => [
  h('path', { d: 'M3 11h18a8 8 0 0 1-16 0H3Z' }),
  h('path', { d: 'M5 11c0-3 3-6 7-6s7 3 7 6' }),
  h('path', { d: 'M2 19h20' }),
  h('path', { d: 'M9 8c.5-.5 1-1 2-1M14 6c.5 0 1 .2 1.5.5' }),
])

// ─── CATEGORY · mua sắm · Tu vi trang ──────────────────────────────────────
export const IconBag = make({}, () => [
  h('path', { d: 'M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8Z' }),
  h('path', { d: 'M9 8a3 3 0 0 1 6 0' }),
])

// ─── CATEGORY · di chuyển · Phi vân mã (kiếm bay) ─────────────────────────
export const IconHorse = make({}, () => [
  h('path', { d: 'm4 13 6-6 4 4-6 6H4v-4Z' }),
  h('path', { d: 'm11 6 5-3 1 1-3 5' }),
  h('path', { d: 'M14 16c2 0 4-1 6-3M16 19c1 0 3-1 4-2' }),
])

// ─── CATEGORY · hóa đơn · Hộ phù (văn thư) ─────────────────────────────────
export const IconBill = make({}, () => [
  h('path', { d: 'M5 3h11l3 3v15H5z' }),
  h('path', { d: 'M16 3v3h3' }),
  h('path', { d: 'M8 10h8M8 14h8M8 18h5' }),
])

// ─── CATEGORY · giải trí · Cầm tu (đàn cổ) ─────────────────────────────────
export const IconLute = make({}, () => [
  h('circle', { cx: 12, cy: 14, r: 6 }),
  h('circle', { cx: 12, cy: 14, r: 1.5, fill: 'currentColor' }),
  h('path', { d: 'M12 8V3M10 4h4' }),
])

// ─── CATEGORY · sức khỏe · Linh thảo ──────────────────────────────────────
export const IconHerb = make({}, () => [
  h('path', { d: 'M12 21v-9' }),
  h('path', { d: 'M12 12c0-4-3-7-7-7 0 4 3 7 7 7Z' }),
  h('path', { d: 'M12 12c0-4 3-7 7-7 0 4-3 7-7 7Z' }),
])

// ─── PAY · trả nợ · Kim nguyên bảo ─────────────────────────────────────────
export const IconIngot = make({}, () => [
  h('path', { d: 'M4 9 7 6h10l3 3-8 4z' }),
  h('path', { d: 'M4 9c0 4 4 8 8 8s8-4 8-8' }),
])

// ─── LOTUS · Liên hoa / empty state ────────────────────────────────────────
export const IconLotus = make({}, () => [
  h('path', { d: 'M12 21V9' }),
  h('path', { d: 'M12 16c-3 0-5-2-5-5 2 0 5 1 5 5Z' }),
  h('path', { d: 'M12 16c3 0 5-2 5-5-2 0-5 1-5 5Z' }),
  h('path', { d: 'M12 13c-2-1-3-3-3-5 2 0 3 2 3 5Z' }),
  h('path', { d: 'M12 13c2-1 3-3 3-5-2 0-3 2-3 5Z' }),
])

// ═══ BOSS GLYPHS · ác nhân chân dung (32×32 / 40×40) ════════════════════════

// Hắc Sát Tà Vương — gân guốc, mặt nạ ác
export const GlyphHac = make({ sw: 1.5, vb: '0 0 32 32', defSize: 32 }, () => [
  h('path', { d: 'M6 8c0-2 4-3 10-3s10 1 10 3' }),
  h('path', { d: 'M5 11c0 6 4 13 11 13s11-7 11-13' }),
  h('path', { d: 'M4 6l4 4M28 6l-4 4' }),
  h('path', { d: 'M11 14l3 2M21 14l-3 2', 'stroke-width': 2 }),
  h('path', { d: 'M12 20c1 1 2 1.5 4 1.5s3-.5 4-1.5' }),
  h('path', { d: 'M16 17l-1 2h2z', fill: 'currentColor' }),
])

// Huyết Thiền Lão Quái — hình bầu dục, râu dài
export const GlyphHuyet = make({ sw: 1.5, vb: '0 0 32 32', defSize: 32 }, () => [
  h('ellipse', { cx: 16, cy: 16, rx: 11, ry: 10 }),
  h('path', {
    d: 'M11 13c1.5-1 3-1.5 4-1.5M21 13c-1.5-1-3-1.5-4-1.5',
    'stroke-width': 1.8,
  }),
  h('circle', { cx: 12, cy: 14, r: 0.8, fill: 'currentColor' }),
  h('circle', { cx: 20, cy: 14, r: 0.8, fill: 'currentColor' }),
  h('path', { d: 'M11 20c1.5 1.5 3 2 5 2s3.5-.5 5-2' }),
  h('path', { d: 'M9 22l-2 4M23 22l2 4', 'stroke-width': 1.2 }),
])

// Từ Mẫu Khế Ước — mềm mại hơn, hồn nữ già
export const GlyphTuMau = make({ sw: 1.5, vb: '0 0 32 32', defSize: 32 }, () => [
  h('path', { d: 'M16 4c-5 0-9 4-9 9 0 5 3 11 9 15 6-4 9-10 9-15 0-5-4-9-9-9Z' }),
  h('circle', { cx: 13, cy: 14, r: 0.8, fill: 'currentColor' }),
  h('circle', { cx: 19, cy: 14, r: 0.8, fill: 'currentColor' }),
  h('path', { d: 'M13 18c1 .8 2 1 3 1s2-.2 3-1' }),
  h('path', { d: 'M10 9c2-2 4-3 6-3M16 6c2 0 4 1 6 3' }),
])

// Tâm Ma — final boss · skull demon (40×40)
export const GlyphTamMa = make({ sw: 1.8, vb: '0 0 40 40', defSize: 40 }, () => [
  h('path', { d: 'M5 6l5 5M35 6l-5 5' }),
  h('path', {
    d: 'M8 17c0-6 5-11 12-11s12 5 12 11c0 4-2 7-4 9v5l-3-1.5-3 1.5-2-1.5-2 1.5-3-1.5-3 1.5v-5c-2-2-4-5-4-9Z',
  }),
  h('path', { d: 'M14 18l4 2M26 18l-4 2', 'stroke-width': 2.4 }),
  h('path', { d: 'M16 26c1 1 3 1.5 4 1.5s3-.5 4-1.5' }),
  h('path', { d: 'M20 21l-1.5 2.5h3z', fill: 'currentColor' }),
  h('path', { d: 'M2 18l3 1M38 18l-3 1M5 11l-2-2M37 11l2-2' }),
])

// ═══ SPRITE MAP · category-key / boss-key → icon component ══════════════════
// Match design seed: src/composables/data/useTutienNames.ts dùng cùng key.

export const SPRITE: Record<string, FunctionalComponent<IconProps>> = {
  // category sprites
  food: IconRice,
  shop: IconBag,
  fuel: IconHorse,
  bill: IconBill,
  ent: IconLute,
  med: IconHerb,
  pay: IconIngot,
  cash: IconLotus,
  // boss glyphs
  hac: GlyphHac,
  huyet: GlyphHuyet,
  tumau: GlyphTuMau,
  tamma: GlyphTamMa,
}
