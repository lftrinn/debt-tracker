/**
 * quest-bosses.ts — 9 V1 line-icon portraits cho boss tier system.
 * Port 1:1 từ debt-tracker-design/Pages/quest-bosses.jsx (V1 portraits).
 *
 * Each portrait inherits currentColor — wrap với container đặt
 * `color: var(--tier-color)` để stroke + fill renders đúng tier color.
 *
 * V2 illustrated portraits (Phase B) sẽ có cùng signature, override TIER_PORTRAITS map.
 */

import { h, type FunctionalComponent } from 'vue'

export interface BossPortraitProps {
  size?: number | string
}

export type TierKey =
  | 'tieuyeu' | 'sonyeu' | 'hacsat' | 'yeutuong' | 'maquan'
  | 'tavuong' | 'yeude' | 'thienma' | 'hondon'

interface MakeOpts {
  vb: string
  defSize: number
  sw?: number
}

/** Helper: tạo functional component portrait. */
function make(opts: MakeOpts, build: () => ReturnType<typeof h>[]): FunctionalComponent<BossPortraitProps> {
  const sw = opts.sw ?? 1.4
  const fn: FunctionalComponent<BossPortraitProps> = (props) =>
    h(
      'svg',
      {
        width: props.size ?? opts.defSize,
        height: props.size ?? opts.defSize,
        viewBox: opts.vb,
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': sw,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      build(),
    )
  return fn
}

// Tier 0 — Tiểu Yêu: simple sprite mask
export const PortraitTieuYeu = make({ vb: '0 0 40 40', defSize: 40 }, () => [
  h('ellipse', { cx: 20, cy: 22, rx: 11, ry: 12 }),
  h('path', { d: 'M14 16l3-3M26 16l-3-3' }),
  h('circle', { cx: 16, cy: 22, r: 1.2, fill: 'currentColor' }),
  h('circle', { cx: 24, cy: 22, r: 1.2, fill: 'currentColor' }),
  h('path', { d: 'M17 28c1 .5 2 .8 3 .8s2-.3 3-.8' }),
])

// Tier 1 — Sơn Yêu: animal-spirit mask with whiskers
export const PortraitSonYeu = make({ vb: '0 0 40 40', defSize: 40 }, () => [
  h('path', { d: 'M10 14l3-5M30 14l-3-5' }),
  h('path', { d: 'M9 19c0-6 5-10 11-10s11 4 11 10c0 7-5 13-11 13S9 26 9 19Z' }),
  h('path', { d: 'M14 22l3 1.5M26 22l-3 1.5', 'stroke-width': 1.8 }),
  h('circle', { cx: 15, cy: 22.5, r: 0.9, fill: 'currentColor' }),
  h('circle', { cx: 25, cy: 22.5, r: 0.9, fill: 'currentColor' }),
  h('path', { d: 'M16 28c1 1 2.5 1.5 4 1.5s3-.5 4-1.5' }),
  h('path', { d: 'M3 23l5-1M37 23l-5-1M5 27l4-1M35 27l-4-1', 'stroke-width': 1 }),
])

// Tier 2 — Hắc Sát: skull with horns + fang
export const PortraitHacSat = make({ vb: '0 0 40 40', defSize: 40 }, () => [
  h('path', { d: 'M8 8l5 6M32 8l-5 6' }),
  h('path', { d: 'M8 18c0-6 5-10 12-10s12 4 12 10c0 4-2 7-3 9v4l-3-1.5-3 1.5-3-1.5-3 1.5v-4c-1-2-3-5-3-9Z' }),
  h('path', { d: 'M14 20l4 2M26 20l-4 2', 'stroke-width': 2.2 }),
  h('circle', { cx: 16, cy: 21, r: 1, fill: 'currentColor' }),
  h('circle', { cx: 24, cy: 21, r: 1, fill: 'currentColor' }),
  h('path', { d: 'M20 24l-1.5 3h3z', fill: 'currentColor' }),
  h('path', { d: 'M16 30c1 .8 2.5 1.2 4 1.2s3-.4 4-1.2' }),
])

// Tier 3 — Yêu Tướng: helmet + fangs + pauldrons
export const PortraitYeuTuong = make({ vb: '0 0 44 44', defSize: 44, sw: 1.5 }, () => [
  h('path', { d: 'M7 6l4 7M37 6l-4 7' }),
  h('path', { d: 'M22 4l-3 4h6z', fill: 'currentColor' }),
  h('path', { d: 'M9 20c0-7 6-12 13-12s13 5 13 12c0 5-2 9-4 11v4l-3-1.5-3 1.5-3-1.5-3 1.5-3-1.5v-4c-2-2-4-6-4-11Z' }),
  h('path', { d: 'M14 22l5 2.5M30 22l-5 2.5', 'stroke-width': 2.4 }),
  h('circle', { cx: 16.5, cy: 23, r: 1.3, fill: 'currentColor' }),
  h('circle', { cx: 27.5, cy: 23, r: 1.3, fill: 'currentColor' }),
  h('path', { d: 'M22 27l-2 4h4z', fill: 'currentColor' }),
  h('path', { d: 'M17 33c1.5 1 3 1.5 5 1.5s3.5-.5 5-1.5' }),
  h('path', { d: 'M3 30l4 2M41 30l-4 2M2 24l5 1M42 24l-5 1' }),
])

// Tier 4 — Ma Quân: ornate crown + 3-eye
export const PortraitMaQuan = make({ vb: '0 0 48 48', defSize: 48, sw: 1.5 }, () => [
  h('path', { d: 'M8 12l3-7M40 12l-3-7M24 6v-4M16 9l1-5M32 9l-1-5' }),
  h('path', { d: 'M9 22c0-8 7-14 15-14s15 6 15 14c0 6-3 11-5 13v4l-3-1-3 1-2-1-2 1-3-1-3 1-2-1v-4c-2-2-4-6-4-13h-3z', 'stroke-width': 1.6 }),
  h('path', { d: 'M21 16l3-3 3 3-3 4z', fill: 'currentColor' }),
  h('path', { d: 'M14 25l5 2.5M34 25l-5 2.5', 'stroke-width': 2.6 }),
  h('circle', { cx: 17, cy: 26, r: 1.4, fill: 'currentColor' }),
  h('circle', { cx: 31, cy: 26, r: 1.4, fill: 'currentColor' }),
  h('path', { d: 'M19 32l-2 3 3 1 2-2 2 2 3-1-2-3z', fill: 'currentColor' }),
  h('path', { d: 'M18 36c2 1.5 4 2 6 2s4-.5 6-2' }),
  h('circle', { cx: 6, cy: 28, r: 1 }),
  h('circle', { cx: 42, cy: 28, r: 1 }),
  h('path', { d: 'M3 22l3 1M45 22l-3 1M4 35l4-1M44 35l-4-1' }),
])

// Tier 5 — Tà Vương: chained, multi-eye, asymmetric
export const PortraitTaVuong = make({ vb: '0 0 52 52', defSize: 52, sw: 1.5 }, () => [
  h('path', { d: 'M9 10l5-8M43 10l-5-8M18 7l2-5M34 7l-2-5M26 4v-3' }),
  h('path', { d: 'M10 22c0-9 7-15 16-15s16 6 16 15c0 6-3 12-5 14l1 4-3-1-3 1-2-1-3 1-2-1-3 1-2-1-2 1-3-1 1-4c-2-2-5-8-5-14z', 'stroke-width': 1.6 }),
  h('path', { d: 'M14 25l4 2M38 25l-4 2', 'stroke-width': 2.2 }),
  h('path', { d: 'M14 31l4 1.5M38 31l-4 1.5', 'stroke-width': 1.8 }),
  h('circle', { cx: 17, cy: 26, r: 1.3, fill: 'currentColor' }),
  h('circle', { cx: 35, cy: 26, r: 1.3, fill: 'currentColor' }),
  h('circle', { cx: 17, cy: 32, r: 1, fill: 'currentColor' }),
  h('circle', { cx: 35, cy: 32, r: 1, fill: 'currentColor' }),
  h('path', { d: 'M20 36l-3 4h2l1 2 2-2 2 2 1-2 2 2 2-2h2l-3-4z', fill: 'currentColor' }),
  h('circle', { cx: 6, cy: 14, r: 2 }),
  h('circle', { cx: 46, cy: 14, r: 2 }),
  h('circle', { cx: 3, cy: 20, r: 1.5 }),
  h('circle', { cx: 49, cy: 20, r: 1.5 }),
  h('path', { d: 'M7 16l-3 3M45 16l3 3' }),
  h('path', { d: 'M4 38l5-2M48 38l-5-2' }),
])

// Tier 6 — Yêu Đế: imperial crown + sun rays
export const PortraitYeuDe = make({ vb: '0 0 56 56', defSize: 56 }, () => [
  h('path', { d: 'M28 4v-3M14 8L11 3M42 8l3-5M5 18l-4-2M51 18l4-2M3 32l-2 1M53 32l2 1' }),
  h('path', { d: 'M12 13l4 9 4-7 4 8 4-8 4 7 4-9-2 13H14z', 'stroke-width': 1.5 }),
  h('circle', { cx: 28, cy: 13, r: 1.5, fill: 'currentColor' }),
  h('circle', { cx: 20, cy: 15, r: 1, fill: 'currentColor' }),
  h('circle', { cx: 36, cy: 15, r: 1, fill: 'currentColor' }),
  h('path', { d: 'M14 28c0-7 6-12 14-12s14 5 14 12c0 6-3 12-5 14l1 5-3-1.5-3 1.5-2-1-3 1-3-1-3 1-2-1.5-3 1.5 1-5c-2-2-5-8-5-14z', 'stroke-width': 1.5 }),
  h('ellipse', { cx: 28, cy: 22, rx: 2.5, ry: 2 }),
  h('circle', { cx: 28, cy: 22, r: 1, fill: 'currentColor' }),
  h('path', { d: 'M17 30l5 2.5M39 30l-5 2.5', 'stroke-width': 2.6 }),
  h('circle', { cx: 20, cy: 31, r: 1.5, fill: 'currentColor' }),
  h('circle', { cx: 36, cy: 31, r: 1.5, fill: 'currentColor' }),
  h('path', { d: 'M21 38l-2 5 2-1 2 2 2-1 2 1 2-2 2 1-2-5z', fill: 'currentColor' }),
  h('path', { d: 'M19 45c2 1.5 5 2 9 2s7-.5 9-2' }),
  h('path', { d: 'M22 49v3M28 50v4M34 49v3' }),
])

// Tier 7 — Thiên Ma: cosmic, multi-eye galactic
export const PortraitThienMa = make({ vb: '0 0 60 60', defSize: 60 }, () => [
  h('circle', { cx: 30, cy: 30, r: 27, 'stroke-dasharray': '2 3', opacity: 0.5 }),
  h('path', { d: 'M10 12l8-10M50 12l-8-10M22 7l3-7M38 7l-3-7M30 4v-4' }),
  h('path', { d: 'M14 26c0-9 7-16 16-16s16 7 16 16c0 8-3 14-6 16l1 6-3-1-3 1-2-1-3 1-3-1-3 1-2-1-3 1 1-6c-3-2-6-8-6-16z', 'stroke-width': 1.5 }),
  h('path', { d: 'M18 22l5 2M42 22l-5 2', 'stroke-width': 2 }),
  h('path', { d: 'M17 30l6 2.5M43 30l-6 2.5', 'stroke-width': 2.4 }),
  h('path', { d: 'M19 38l4 1.5M41 38l-4 1.5', 'stroke-width': 1.8 }),
  h('circle', { cx: 20, cy: 22.5, r: 1, fill: 'currentColor' }),
  h('circle', { cx: 40, cy: 22.5, r: 1, fill: 'currentColor' }),
  h('circle', { cx: 21, cy: 31, r: 1.4, fill: 'currentColor' }),
  h('circle', { cx: 39, cy: 31, r: 1.4, fill: 'currentColor' }),
  h('circle', { cx: 22, cy: 39, r: 0.9, fill: 'currentColor' }),
  h('circle', { cx: 38, cy: 39, r: 0.9, fill: 'currentColor' }),
  h('path', { d: 'M22 44l-2 6 2-1 2 2 2-1 2 1 2-2 2 1 2-1-2-6z', fill: 'currentColor' }),
  h('circle', { cx: 6, cy: 20, r: 1, fill: 'currentColor' }),
  h('circle', { cx: 54, cy: 20, r: 1, fill: 'currentColor' }),
  h('circle', { cx: 8, cy: 40, r: 0.7, fill: 'currentColor' }),
  h('circle', { cx: 52, cy: 40, r: 0.7, fill: 'currentColor' }),
  h('circle', { cx: 3, cy: 30, r: 0.6, fill: 'currentColor' }),
  h('circle', { cx: 57, cy: 30, r: 0.6, fill: 'currentColor' }),
])

// Tier 8 — Hỗn Độn Tâm Ma: void core + cosmic chains
export const PortraitHonDon = make({ vb: '0 0 64 64', defSize: 64 }, () => [
  h('circle', { cx: 32, cy: 32, r: 29, 'stroke-dasharray': '3 4', opacity: 0.4 }),
  h('circle', { cx: 32, cy: 32, r: 24, 'stroke-dasharray': '1 5', opacity: 0.6 }),
  h('path', { d: 'M9 14l9-12M55 14l-9-12M22 8l3-7M42 8l-3-7M32 5v-5' }),
  h('path', { d: 'M16 5l-2 4M48 5l2 4' }),
  h('path', { d: 'M14 28c0-10 8-17 18-17s18 7 18 17c0 9-3 16-6 18l1 7-3-1-3 1-3-1-3 1-3-1-3 1-3-1-3 1 1-7c-3-2-6-9-6-18z', 'stroke-width': 1.5 }),
  h('circle', { cx: 32, cy: 30, r: 6, fill: 'currentColor', opacity: 0.25 }),
  h('circle', { cx: 32, cy: 30, r: 3, fill: 'currentColor' }),
  h('circle', { cx: 20, cy: 22, r: 1.2, fill: 'currentColor' }),
  h('circle', { cx: 44, cy: 22, r: 1.2, fill: 'currentColor' }),
  h('circle', { cx: 18, cy: 32, r: 1.4, fill: 'currentColor' }),
  h('circle', { cx: 46, cy: 32, r: 1.4, fill: 'currentColor' }),
  h('circle', { cx: 20, cy: 40, r: 1.1, fill: 'currentColor' }),
  h('circle', { cx: 44, cy: 40, r: 1.1, fill: 'currentColor' }),
  h('circle', { cx: 26, cy: 44, r: 0.9, fill: 'currentColor' }),
  h('circle', { cx: 38, cy: 44, r: 0.9, fill: 'currentColor' }),
  h('path', { d: 'M22 48l-2 7 3-1 2 2 2-1 3 2 2-1 3 1 2-2 3 1-2-7z', fill: 'currentColor' }),
  h('circle', { cx: 6, cy: 18, r: 2.5 }),
  h('circle', { cx: 58, cy: 18, r: 2.5 }),
  h('circle', { cx: 3, cy: 32, r: 2 }),
  h('circle', { cx: 61, cy: 32, r: 2 }),
  h('circle', { cx: 6, cy: 46, r: 2.5 }),
  h('circle', { cx: 58, cy: 46, r: 2.5 }),
  h('path', { d: 'M8 18l5 1M56 18l-5 1M5 32l5 0M59 32l-5 0M8 46l5-1M56 46l-5-1' }),
  h('circle', { cx: 12, cy: 8, r: 0.7, fill: 'currentColor' }),
  h('circle', { cx: 52, cy: 8, r: 0.7, fill: 'currentColor' }),
  h('circle', { cx: 14, cy: 56, r: 0.7, fill: 'currentColor' }),
  h('circle', { cx: 50, cy: 56, r: 0.7, fill: 'currentColor' }),
])

/** V1 line-icon portrait map (fallback). */
export const TIER_PORTRAITS_V1: Record<TierKey, FunctionalComponent<BossPortraitProps>> = {
  tieuyeu: PortraitTieuYeu,
  sonyeu: PortraitSonYeu,
  hacsat: PortraitHacSat,
  yeutuong: PortraitYeuTuong,
  maquan: PortraitMaQuan,
  tavuong: PortraitTaVuong,
  yeude: PortraitYeuDe,
  thienma: PortraitThienMa,
  hondon: PortraitHonDon,
}

// V2 illustrated portraits — re-export đã định nghĩa ở quest-bosses-v2.ts
// Import lazy bằng cách dùng Proxy để tránh circular: quest-bosses-v2 import
// types từ quest-bosses, vẫn ổn vì chỉ types không phải value.
import { TIER_PORTRAITS_V2 } from './quest-bosses-v2'

/** Default tier portraits — prefer V2 illustrated, fallback V1 line-icons. */
export const TIER_PORTRAITS: Record<TierKey, FunctionalComponent<BossPortraitProps>> = {
  tieuyeu: TIER_PORTRAITS_V2.tieuyeu ?? TIER_PORTRAITS_V1.tieuyeu,
  sonyeu: TIER_PORTRAITS_V2.sonyeu ?? TIER_PORTRAITS_V1.sonyeu,
  hacsat: TIER_PORTRAITS_V2.hacsat ?? TIER_PORTRAITS_V1.hacsat,
  yeutuong: TIER_PORTRAITS_V2.yeutuong ?? TIER_PORTRAITS_V1.yeutuong,
  maquan: TIER_PORTRAITS_V2.maquan ?? TIER_PORTRAITS_V1.maquan,
  tavuong: TIER_PORTRAITS_V2.tavuong ?? TIER_PORTRAITS_V1.tavuong,
  yeude: TIER_PORTRAITS_V2.yeude ?? TIER_PORTRAITS_V1.yeude,
  thienma: TIER_PORTRAITS_V2.thienma ?? TIER_PORTRAITS_V1.thienma,
  hondon: TIER_PORTRAITS_V2.hondon ?? TIER_PORTRAITS_V1.hondon,
}
