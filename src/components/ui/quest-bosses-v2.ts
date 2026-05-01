/**
 * quest-bosses-v2.ts — V2 ILLUSTRATED boss portraits.
 * Port 1:1 từ debt-tracker-design/Pages/quest-bosses-portraits.jsx.
 *
 * Mỗi portrait 80×80 viewBox, dùng radialGradient + multi-layer fills + opacity
 * cho hiệu ứng "painted character card" thay vì line-icon V1. Inherits
 * `currentColor` từ container `.popup-hero[class*="tier-"]` / `.boss-portrait`.
 *
 * Dùng qua `TIER_PORTRAITS_V2[key]` — quest-bosses.ts tự động prefer V2 nếu
 * available, fallback V1.
 */

import { h, type FunctionalComponent } from 'vue'
import type { BossPortraitProps, TierKey } from './quest-bosses'

/** Common SVG wrapper · 80×80 viewBox, currentColor inherit. */
function svg(props: BossPortraitProps, children: ReturnType<typeof h>[]) {
  return h(
    'svg',
    {
      width: props.size ?? 80,
      height: props.size ?? 80,
      viewBox: '0 0 80 80',
      style: { display: 'block' },
    },
    children,
  )
}

/** Helper · build radial gradient def. */
function radial(id: string, opts: { cx?: string; cy?: string; r?: string; stops: Array<{ off: string; color: string; opacity?: string }> }) {
  return h(
    'defs',
    {},
    [
      h(
        'radialGradient',
        { id, cx: opts.cx ?? '50%', cy: opts.cy ?? '50%', r: opts.r ?? '60%' },
        opts.stops.map((s) =>
          h('stop', {
            offset: s.off,
            'stop-color': s.color,
            'stop-opacity': s.opacity ?? '1',
          }),
        ),
      ),
    ],
  )
}

// Tier 0 — Tiểu Yêu (Sprite gremlin) — small ragged ghoul
export const PortraitTieuYeuV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty0bg', { cx: '50%', cy: '60%', r: '60%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.35' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 44, r: 34, fill: 'url(#pty0bg)' }),
    h('path', { d: 'M14 60 Q22 44 40 44 Q58 44 66 60 L66 78 L60 72 L54 78 L48 72 L42 78 L36 72 L30 78 L24 72 L18 78 L14 72 Z', fill: 'currentColor', opacity: 0.6 }),
    h('path', { d: 'M22 56 Q30 42 40 42 Q50 42 58 56 L58 72 L52 66 L46 72 L40 66 L34 72 L28 66 L22 72 Z', fill: 'currentColor', opacity: 0.85 }),
    h('ellipse', { cx: 40, cy: 36, rx: 14, ry: 16, fill: 'currentColor' }),
    h('path', { d: 'M30 24 L28 18 L33 22 Z', fill: 'currentColor' }),
    h('path', { d: 'M50 24 L52 18 L47 22 Z', fill: 'currentColor' }),
    h('ellipse', { cx: 34, cy: 36, rx: 3, ry: 2, fill: '#fff', opacity: 0.95 }),
    h('ellipse', { cx: 46, cy: 36, rx: 3, ry: 2, fill: '#fff', opacity: 0.95 }),
    h('circle', { cx: 34, cy: 36, r: 1.2, fill: '#000' }),
    h('circle', { cx: 46, cy: 36, r: 1.2, fill: '#000' }),
    h('path', { d: 'M33 44 Q40 48 47 44 L46 46 L44 45 L42 47 L40 45 L38 47 L36 45 L34 46 Z', fill: '#1a0a0a' }),
    h('path', { d: 'M37 44 L37 47 M40 44 L40 47.5 M43 44 L43 47', stroke: '#fff', 'stroke-width': 0.6, opacity: 0.8 }),
  ])

// Tier 1 — Sơn Yêu (Mountain spirit) — fox-skull spirit with whiskers
export const PortraitSonYeuV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty1bg', { r: '55%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.4' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 42, r: 36, fill: 'url(#pty1bg)' }),
    h('path', { d: 'M10 70 Q20 50 40 50 Q60 50 70 70 L70 80 L10 80 Z', fill: 'currentColor', opacity: 0.55 }),
    h('path', { d: 'M16 68 Q24 52 40 52 Q56 52 64 68 L64 78 L16 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M22 30 Q22 16 40 14 Q58 16 58 30 Q58 42 50 48 L40 52 L30 48 Q22 42 22 30 Z', fill: 'currentColor' }),
    h('path', { d: 'M22 24 L18 8 L28 18 Z', fill: 'currentColor' }),
    h('path', { d: 'M58 24 L62 8 L52 18 Z', fill: 'currentColor' }),
    h('path', { d: 'M40 14 L38 4 L42 4 Z', fill: 'currentColor', opacity: 0.7 }),
    h('path', { d: 'M40 14 L40 50', stroke: '#1a0a0a', 'stroke-width': 0.5, opacity: 0.4 }),
    h('ellipse', { cx: 32, cy: 32, rx: 4, ry: 3, fill: '#1a0a08' }),
    h('ellipse', { cx: 48, cy: 32, rx: 4, ry: 3, fill: '#1a0a08' }),
    h('circle', { cx: 32, cy: 32, r: 1.5, fill: '#fff' }),
    h('circle', { cx: 48, cy: 32, r: 1.5, fill: '#fff' }),
    h('circle', { cx: 32, cy: 32, r: 0.6, fill: 'currentColor' }),
    h('circle', { cx: 48, cy: 32, r: 0.6, fill: 'currentColor' }),
    h('path', { d: 'M38 40 L40 44 L42 40 Z', fill: '#1a0a08' }),
    h('path', { d: 'M34 46 L40 50 L46 46 L44 47 L42 46 L40 48 L38 46 L36 47 Z', fill: '#1a0a08' }),
    h('path', { d: 'M22 38 L8 36 M22 42 L8 44 M58 38 L72 36 M58 42 L72 44', stroke: 'currentColor', 'stroke-width': 0.8, fill: 'none', opacity: 0.9 }),
    h('circle', { cx: 40, cy: 22, r: 2, fill: '#fff', opacity: 0.85 }),
    h('circle', { cx: 40, cy: 22, r: 0.8, fill: 'currentColor' }),
  ])

// Tier 2 — Hắc Sát (Dark slayer) — hooded swordsman skull
export const PortraitHacSatV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty2bg', { stops: [
      { off: '0%', color: 'currentColor', opacity: '0.5' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 42, r: 38, fill: 'url(#pty2bg)' }),
    h('path', { d: 'M40 4 L38 50 L42 50 Z', fill: 'currentColor', opacity: 0.7 }),
    h('rect', { x: 35, y: 50, width: 10, height: 2, fill: 'currentColor', opacity: 0.85 }),
    h('rect', { x: 38.5, y: 52, width: 3, height: 6, fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M8 78 Q14 44 40 38 Q66 44 72 78 Z', fill: 'currentColor', opacity: 0.55 }),
    h('path', { d: 'M14 78 Q18 48 40 44 Q62 48 66 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M22 50 Q26 30 40 28 Q54 30 58 50 Q54 62 40 64 Q26 62 22 50 Z', fill: '#0a0506' }),
    h('ellipse', { cx: 40, cy: 46, rx: 11, ry: 13, fill: 'currentColor', opacity: 0.9 }),
    h('ellipse', { cx: 35, cy: 44, rx: 3, ry: 3.5, fill: '#0a0506' }),
    h('ellipse', { cx: 45, cy: 44, rx: 3, ry: 3.5, fill: '#0a0506' }),
    h('circle', { cx: 35, cy: 44, r: 1.6, fill: '#fff' }),
    h('circle', { cx: 45, cy: 44, r: 1.6, fill: '#fff' }),
    h('circle', { cx: 35, cy: 44, r: 0.7, fill: 'currentColor' }),
    h('circle', { cx: 45, cy: 44, r: 0.7, fill: 'currentColor' }),
    h('path', { d: 'M39 50 L40 54 L41 50 Z', fill: '#0a0506' }),
    h('path', { d: 'M33 56 L47 56 L46 60 L44 58 L42 60 L40 58 L38 60 L36 58 L34 60 Z', fill: '#0a0506' }),
    h('path', { d: 'M35 56 L35 60 M38 56 L38 60 M40 56 L40 60 M42 56 L42 60 M45 56 L45 60', stroke: 'currentColor', 'stroke-width': 0.4, opacity: 0.6 }),
    h('path', { d: 'M22 46 L14 28 L26 38 Z', fill: 'currentColor' }),
    h('path', { d: 'M58 46 L66 28 L54 38 Z', fill: 'currentColor' }),
  ])

// Tier 3 — Yêu Tướng (Demon general) — armored warrior with helm
export const PortraitYeuTuongV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty3bg', { stops: [
      { off: '0%', color: 'currentColor', opacity: '0.55' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 42, r: 38, fill: 'url(#pty3bg)' }),
    h('path', { d: 'M14 50 Q10 30 18 16 Q16 32 22 40 Q18 22 26 10 Q24 28 30 38 Q26 18 36 6 Q34 26 38 38', fill: 'currentColor', opacity: 0.4 }),
    h('path', { d: 'M66 50 Q70 30 62 16 Q64 32 58 40 Q62 22 54 10 Q56 28 50 38 Q54 18 44 6 Q46 26 42 38', fill: 'currentColor', opacity: 0.4 }),
    h('path', { d: 'M6 68 Q12 56 26 56 L26 78 L6 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M74 68 Q68 56 54 56 L54 78 L74 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M14 56 L12 48 L18 54 Z', fill: 'currentColor' }),
    h('path', { d: 'M66 56 L68 48 L62 54 Z', fill: 'currentColor' }),
    h('rect', { x: 30, y: 56, width: 20, height: 8, fill: 'currentColor', opacity: 0.9 }),
    h('path', { d: 'M30 56 L40 64 L50 56 Z', fill: '#1a0a06' }),
    h('path', { d: 'M22 38 Q22 18 40 16 Q58 18 58 38 L58 56 L22 56 Z', fill: 'currentColor' }),
    h('path', { d: 'M40 16 L36 4 L40 8 L44 4 Z', fill: 'currentColor' }),
    h('path', { d: 'M22 30 Q12 18 8 6 Q14 22 22 36', fill: 'currentColor' }),
    h('path', { d: 'M58 30 Q68 18 72 6 Q66 22 58 36', fill: 'currentColor' }),
    h('path', { d: 'M24 36 Q40 32 56 36 L56 44 Q40 48 24 44 Z', fill: '#1a0a06' }),
    h('ellipse', { cx: 32, cy: 40, rx: 3, ry: 1.5, fill: '#fff' }),
    h('ellipse', { cx: 48, cy: 40, rx: 3, ry: 1.5, fill: '#fff' }),
    h('ellipse', { cx: 32, cy: 40, rx: 1.5, ry: 1, fill: 'currentColor' }),
    h('ellipse', { cx: 48, cy: 40, rx: 1.5, ry: 1, fill: 'currentColor' }),
    h('path', { d: 'M34 48 L33 54 L36 50 Z', fill: '#fff', opacity: 0.95 }),
    h('path', { d: 'M46 48 L47 54 L44 50 Z', fill: '#fff', opacity: 0.95 }),
    h('circle', { cx: 28, cy: 24, r: 1.2, fill: '#1a0a06' }),
    h('circle', { cx: 52, cy: 24, r: 1.2, fill: '#1a0a06' }),
    h('circle', { cx: 40, cy: 20, r: 1.6, fill: '#fff' }),
    h('circle', { cx: 40, cy: 20, r: 0.8, fill: 'currentColor' }),
  ])

// Tier 4 — Ma Quân (Demon lord) — three-eyed warlord with crown
export const PortraitMaQuanV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty4bg', { stops: [
      { off: '0%', color: 'currentColor', opacity: '0.55' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 42, r: 38, fill: 'url(#pty4bg)' }),
    h('ellipse', { cx: 40, cy: 68, rx: 36, ry: 10, fill: 'currentColor', opacity: 0.4 }),
    h('path', { d: 'M6 78 Q10 50 28 50 L28 60 Q22 60 20 70 L20 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M74 78 Q70 50 52 50 L52 60 Q58 60 60 70 L60 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('rect', { x: 34, y: 50, width: 12, height: 10, fill: 'currentColor', opacity: 0.9 }),
    h('path', { d: 'M22 36 Q22 18 30 14 L40 12 L50 14 Q58 18 58 36 Q58 50 40 56 Q22 50 22 36 Z', fill: 'currentColor' }),
    h('path', { d: 'M20 18 L16 4 L22 12 L26 2 L30 12 L36 0 L40 14 L44 0 L50 12 L54 2 L58 12 L64 4 L60 18 Z', fill: 'currentColor' }),
    h('circle', { cx: 40, cy: 8, r: 2, fill: '#fff' }),
    h('circle', { cx: 40, cy: 8, r: 0.9, fill: 'currentColor' }),
    h('circle', { cx: 28, cy: 12, r: 1.2, fill: '#fff', opacity: 0.85 }),
    h('circle', { cx: 52, cy: 12, r: 1.2, fill: '#fff', opacity: 0.85 }),
    h('path', { d: 'M36 22 L40 18 L44 22 L40 28 Z', fill: '#1a0510' }),
    h('ellipse', { cx: 40, cy: 23, rx: 2.5, ry: 1.5, fill: '#fff' }),
    h('circle', { cx: 40, cy: 23, r: 1, fill: 'currentColor' }),
    h('path', { d: 'M26 32 L34 32 L33 36 L27 36 Z', fill: '#1a0510' }),
    h('path', { d: 'M46 32 L54 32 L53 36 L47 36 Z', fill: '#1a0510' }),
    h('ellipse', { cx: 30, cy: 34, rx: 2.5, ry: 1.5, fill: '#fff' }),
    h('ellipse', { cx: 50, cy: 34, rx: 2.5, ry: 1.5, fill: '#fff' }),
    h('circle', { cx: 30, cy: 34, r: 1, fill: 'currentColor' }),
    h('circle', { cx: 50, cy: 34, r: 1, fill: 'currentColor' }),
    h('path', { d: 'M38 38 L40 44 L42 38 L40 42 Z', fill: '#1a0510', opacity: 0.7 }),
    h('path', { d: 'M30 46 Q40 50 50 46 L48 50 L46 47 L44 51 L42 47 L40 51 L38 47 L36 51 L34 47 L32 50 Z', fill: '#1a0510' }),
    h('path', { d: 'M34 46 L33 52 L36 48 Z', fill: '#fff' }),
    h('path', { d: 'M46 46 L47 52 L44 48 Z', fill: '#fff' }),
    h('path', { d: 'M26 40 L30 42 M50 42 L54 40', stroke: '#1a0510', 'stroke-width': 0.8 }),
  ])

// Tier 5 — Tà Vương (Heretic king) — chained demon king with cracked face
export const PortraitTaVuongV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty5bg', { stops: [
      { off: '0%', color: 'currentColor', opacity: '0.6' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 42, r: 38, fill: 'url(#pty5bg)' }),
    h('g', { opacity: 0.7, stroke: 'currentColor', 'stroke-width': 1, fill: 'none' }, [
      h('circle', { cx: 6, cy: 20, r: 2.5, fill: 'currentColor' }),
      h('circle', { cx: 74, cy: 20, r: 2.5, fill: 'currentColor' }),
      h('circle', { cx: 10, cy: 26, r: 2 }),
      h('circle', { cx: 70, cy: 26, r: 2 }),
      h('circle', { cx: 14, cy: 32, r: 2 }),
      h('circle', { cx: 66, cy: 32, r: 2 }),
      h('path', { d: 'M8 22 L12 26 M16 30 L20 34 M68 22 L64 26 M60 30 L56 34' }),
    ]),
    h('path', { d: 'M4 78 Q8 48 22 48 L22 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M76 78 Q72 48 58 48 L58 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M20 56 Q30 54 40 54 Q50 54 60 56 L60 78 L20 78 Z', fill: 'currentColor', opacity: 0.95 }),
    h('path', { d: 'M30 50 L33 56 L37 50 L40 56 L43 50 L47 56 L50 50 L48 60 L32 60 Z', fill: 'currentColor' }),
    h('path', { d: 'M22 38 Q20 16 30 12 L40 10 L50 12 Q60 16 58 38 L56 50 Q40 56 24 50 Z', fill: 'currentColor' }),
    h('path', { d: 'M22 24 Q10 14 4 0 Q12 18 20 30 Z', fill: 'currentColor' }),
    h('path', { d: 'M58 24 Q70 14 76 0 Q68 18 60 30 Z', fill: 'currentColor' }),
    h('path', { d: 'M30 12 L26 4 L32 8 Z', fill: 'currentColor' }),
    h('path', { d: 'M50 12 L54 4 L48 8 Z', fill: 'currentColor' }),
    h('path', { d: 'M40 12 L38 22 L42 30 L38 40 L42 48', stroke: '#fff', 'stroke-width': 0.6, fill: 'none', opacity: 0.5 }),
    h('ellipse', { cx: 30, cy: 26, rx: 3, ry: 1.5, fill: '#1a020a' }),
    h('ellipse', { cx: 50, cy: 26, rx: 3, ry: 1.5, fill: '#1a020a' }),
    h('ellipse', { cx: 30, cy: 34, rx: 3.5, ry: 2, fill: '#1a020a' }),
    h('ellipse', { cx: 50, cy: 34, rx: 3.5, ry: 2, fill: '#1a020a' }),
    h('circle', { cx: 30, cy: 26, r: 1, fill: '#fff' }),
    h('circle', { cx: 50, cy: 26, r: 1, fill: '#fff' }),
    h('circle', { cx: 30, cy: 34, r: 1.3, fill: '#fff' }),
    h('circle', { cx: 50, cy: 34, r: 1.3, fill: '#fff' }),
    h('circle', { cx: 30, cy: 34, r: 0.6, fill: 'currentColor' }),
    h('circle', { cx: 50, cy: 34, r: 0.6, fill: 'currentColor' }),
    h('path', { d: 'M28 42 Q40 48 52 42 L50 48 L48 44 L46 49 L44 44 L42 50 L40 44 L38 50 L36 44 L34 49 L32 44 L30 48 Z', fill: '#1a020a' }),
    h('path', { d: 'M32 42 L31 50 L34 46 Z M48 42 L49 50 L46 46 Z', fill: '#fff' }),
    h('path', { d: 'M37 44 L37 50 M43 44 L43 50', stroke: '#fff', 'stroke-width': 0.5, opacity: 0.85 }),
    h('path', { d: 'M14 44 Q24 50 40 50 Q56 50 66 44', stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none', opacity: 0.8, 'stroke-dasharray': '2 1' }),
  ])

// Tier 6 — Yêu Đế (Demon emperor) — golden masked emperor
export const PortraitYeuDeV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty6bg', { stops: [
      { off: '0%', color: 'currentColor', opacity: '0.6' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 42, r: 38, fill: 'url(#pty6bg)' }),
    h('g', { opacity: 0.5, stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none' }, [
      h('path', { d: 'M40 0 L40 8 M0 40 L8 40 M80 40 L72 40 M12 12 L18 18 M68 12 L62 18 M12 68 L18 62 M68 68 L62 62' }),
    ]),
    h('path', { d: 'M2 78 Q10 50 28 48 L28 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M78 78 Q70 50 52 48 L52 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M22 56 Q30 52 40 52 Q50 52 58 56 L62 78 L18 78 Z', fill: 'currentColor', opacity: 0.9 }),
    h('path', { d: 'M30 62 Q40 58 50 62 Q40 66 30 62 Z', fill: '#1a1408', opacity: 0.8 }),
    h('circle', { cx: 40, cy: 62, r: 1.5, fill: '#fff', opacity: 0.9 }),
    h('path', { d: 'M22 36 Q22 18 30 12 L40 10 L50 12 Q58 18 58 36 Q58 48 40 54 Q22 48 22 36 Z', fill: 'currentColor' }),
    h('path', { d: 'M16 18 L12 0 L20 12 L24 -2 L28 14 L32 0 L36 14 L40 -2 L44 14 L48 0 L52 14 L56 -2 L60 12 L68 0 L64 18 Z', fill: 'currentColor' }),
    h('ellipse', { cx: 40, cy: 6, rx: 3, ry: 4, fill: '#fff', opacity: 0.95 }),
    h('ellipse', { cx: 40, cy: 6, rx: 1.5, ry: 2, fill: 'currentColor' }),
    h('circle', { cx: 28, cy: 10, r: 1.5, fill: '#fff' }),
    h('circle', { cx: 52, cy: 10, r: 1.5, fill: '#fff' }),
    h('circle', { cx: 20, cy: 12, r: 1, fill: '#fff', opacity: 0.8 }),
    h('circle', { cx: 60, cy: 12, r: 1, fill: '#fff', opacity: 0.8 }),
    h('path', { d: 'M40 14 L40 50', stroke: '#1a1408', 'stroke-width': 0.4, opacity: 0.5 }),
    h('path', { d: 'M22 30 Q40 26 58 30', stroke: '#1a1408', 'stroke-width': 0.4, opacity: 0.4, fill: 'none' }),
    h('path', { d: 'M40 22 L36 26 L40 32 L44 26 Z', fill: '#1a1408' }),
    h('ellipse', { cx: 40, cy: 26, rx: 2, ry: 3, fill: '#fff' }),
    h('ellipse', { cx: 40, cy: 26, rx: 0.8, ry: 1.5, fill: 'currentColor' }),
    h('path', { d: 'M24 32 Q30 30 34 33 L33 36 Q28 38 24 36 Z', fill: '#1a1408' }),
    h('path', { d: 'M56 32 Q50 30 46 33 L47 36 Q52 38 56 36 Z', fill: '#1a1408' }),
    h('ellipse', { cx: 29, cy: 34, rx: 2, ry: 1.4, fill: '#fff' }),
    h('ellipse', { cx: 51, cy: 34, rx: 2, ry: 1.4, fill: '#fff' }),
    h('circle', { cx: 29, cy: 34, r: 0.9, fill: 'currentColor' }),
    h('circle', { cx: 51, cy: 34, r: 0.9, fill: 'currentColor' }),
    h('path', { d: 'M22 36 L18 42 M58 36 L62 42', stroke: 'currentColor', 'stroke-width': 0.8 }),
    h('path', { d: 'M38 40 L40 46 L42 40 L40 44 Z', fill: '#1a1408', opacity: 0.6 }),
    h('path', { d: 'M32 48 Q40 50 48 48 L46 50 L44 49 L42 51 L40 49 L38 51 L36 49 L34 50 Z', fill: '#1a1408' }),
    h('path', { d: 'M36 48 L36 51 M44 48 L44 51', stroke: '#fff', 'stroke-width': 0.4, opacity: 0.7 }),
    h('path', { d: 'M26 22 L30 24 M50 24 L54 22', stroke: '#fff', 'stroke-width': 0.8, opacity: 0.6 }),
  ])

// Tier 7 — Thiên Ma (Heavenly demon) — six-eyed cosmic entity
export const PortraitThienMaV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    radial('pty7bg', { stops: [
      { off: '0%', color: 'currentColor', opacity: '0.7' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] }),
    h('circle', { cx: 40, cy: 42, r: 40, fill: 'url(#pty7bg)' }),
    h('ellipse', { cx: 40, cy: 42, rx: 36, ry: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.8, opacity: 0.5, 'stroke-dasharray': '2 2', transform: 'rotate(-15 40 42)' }),
    h('g', { fill: '#fff', opacity: 0.9 }, [
      h('circle', { cx: 10, cy: 14, r: 0.8 }),
      h('circle', { cx: 68, cy: 20, r: 0.6 }),
      h('circle', { cx: 6, cy: 50, r: 0.7 }),
      h('circle', { cx: 74, cy: 48, r: 0.8 }),
      h('circle', { cx: 18, cy: 6, r: 0.5 }),
      h('circle', { cx: 62, cy: 8, r: 0.5 }),
    ]),
    h('path', { d: 'M2 78 Q8 54 24 50 L24 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M78 78 Q72 54 56 50 L56 78 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M20 60 Q40 56 60 60 L60 78 L20 78 Z', fill: 'currentColor', opacity: 0.95 }),
    h('path', { d: 'M20 38 Q18 14 30 8 L40 6 L50 8 Q62 14 60 38 L56 56 Q40 60 24 56 Z', fill: 'currentColor' }),
    h('path', { d: 'M20 22 Q4 8 -2 -4 Q8 16 18 30 Z', fill: 'currentColor' }),
    h('path', { d: 'M60 22 Q76 8 82 -4 Q72 16 62 30 Z', fill: 'currentColor' }),
    h('path', { d: 'M28 8 L24 -4 L32 4 Z', fill: 'currentColor' }),
    h('path', { d: 'M52 8 L56 -4 L48 4 Z', fill: 'currentColor' }),
    h('path', { d: 'M40 6 L38 -4 L42 -4 Z', fill: 'currentColor' }),
    h('path', { d: 'M36 18 L40 12 L44 18 L40 26 Z', fill: '#08001a' }),
    h('ellipse', { cx: 40, cy: 20, rx: 2.5, ry: 2, fill: '#fff' }),
    h('circle', { cx: 40, cy: 20, r: 1, fill: 'currentColor' }),
    h('ellipse', { cx: 28, cy: 26, rx: 2.5, ry: 1.2, fill: '#08001a' }),
    h('ellipse', { cx: 52, cy: 26, rx: 2.5, ry: 1.2, fill: '#08001a' }),
    h('ellipse', { cx: 26, cy: 34, rx: 3, ry: 1.8, fill: '#08001a' }),
    h('ellipse', { cx: 54, cy: 34, rx: 3, ry: 1.8, fill: '#08001a' }),
    h('ellipse', { cx: 30, cy: 42, rx: 2.5, ry: 1.4, fill: '#08001a' }),
    h('ellipse', { cx: 50, cy: 42, rx: 2.5, ry: 1.4, fill: '#08001a' }),
    h('circle', { cx: 28, cy: 26, r: 0.8, fill: '#fff' }),
    h('circle', { cx: 52, cy: 26, r: 0.8, fill: '#fff' }),
    h('circle', { cx: 26, cy: 34, r: 1.1, fill: '#fff' }),
    h('circle', { cx: 54, cy: 34, r: 1.1, fill: '#fff' }),
    h('circle', { cx: 30, cy: 42, r: 0.9, fill: '#fff' }),
    h('circle', { cx: 50, cy: 42, r: 0.9, fill: '#fff' }),
    h('path', { d: 'M28 48 Q40 54 52 48 L50 54 L48 49 L46 55 L44 49 L42 55 L40 49 L38 55 L36 49 L34 55 L32 49 L30 54 Z', fill: '#08001a' }),
    h('path', { d: 'M32 48 L31 56 L34 51 Z', fill: '#fff' }),
    h('path', { d: 'M48 48 L49 56 L46 51 Z', fill: '#fff' }),
    h('path', { d: 'M22 42 L18 48 M58 42 L62 48 M24 38 Q22 42 20 44', stroke: '#fff', 'stroke-width': 0.4, fill: 'none', opacity: 0.5 }),
  ])

// Tier 8 — Hỗn Độn Tâm Ma (Chaos heart-demon) — void incarnate, fractal
export const PortraitHonDonV2: FunctionalComponent<BossPortraitProps> = (props) =>
  svg(props, [
    h('defs', {}, [
      h('radialGradient', { id: 'pty8bg', cx: '50%', cy: '50%', r: '65%' }, [
        h('stop', { offset: '0%', 'stop-color': 'currentColor', 'stop-opacity': '0.85' }),
        h('stop', { offset: '60%', 'stop-color': 'currentColor', 'stop-opacity': '0.3' }),
        h('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': '0' }),
      ]),
      h('radialGradient', { id: 'pty8core', cx: '50%', cy: '50%', r: '50%' }, [
        h('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': '1' }),
        h('stop', { offset: '40%', 'stop-color': 'currentColor', 'stop-opacity': '1' }),
        h('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': '1' }),
      ]),
    ]),
    h('circle', { cx: 40, cy: 42, r: 40, fill: 'url(#pty8bg)' }),
    h('circle', { cx: 40, cy: 42, r: 34, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.6, 'stroke-dasharray': '3 3', opacity: 0.5 }),
    h('circle', { cx: 40, cy: 42, r: 28, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.4, 'stroke-dasharray': '1 4', opacity: 0.6 }),
    h('g', { fill: '#fff', opacity: 0.9 }, [
      h('circle', { cx: 8, cy: 12, r: 0.8 }),
      h('circle', { cx: 72, cy: 14, r: 0.7 }),
      h('circle', { cx: 6, cy: 56, r: 0.6 }),
      h('circle', { cx: 76, cy: 50, r: 0.8 }),
      h('circle', { cx: 14, cy: 74, r: 0.5 }),
      h('circle', { cx: 68, cy: 74, r: 0.6 }),
      h('circle', { cx: 2, cy: 34, r: 0.5 }),
      h('circle', { cx: 78, cy: 32, r: 0.7 }),
    ]),
    h('g', { stroke: 'currentColor', 'stroke-width': 0.8, fill: 'none', opacity: 0.6 }, [
      h('circle', { cx: 6, cy: 16, r: 2, fill: 'currentColor' }),
      h('circle', { cx: 74, cy: 16, r: 2, fill: 'currentColor' }),
      h('circle', { cx: 6, cy: 68, r: 2, fill: 'currentColor' }),
      h('circle', { cx: 74, cy: 68, r: 2, fill: 'currentColor' }),
      h('path', { d: 'M8 18 L14 24 M66 24 L72 18 M8 66 L14 60 M66 60 L72 66' }),
    ]),
    h('path', { d: 'M-2 80 Q4 56 22 50 L22 80 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M82 80 Q76 56 58 50 L58 80 Z', fill: 'currentColor', opacity: 0.85 }),
    h('path', { d: 'M16 60 Q40 56 64 60 L64 80 L16 80 Z', fill: 'currentColor', opacity: 0.95 }),
    h('path', { d: 'M18 40 Q14 12 26 4 L40 0 L54 4 Q66 12 62 40 L60 56 Q40 62 20 56 Z', fill: 'currentColor' }),
    h('path', { d: 'M18 24 Q-2 6 -8 -10 Q2 12 16 32 Z', fill: 'currentColor' }),
    h('path', { d: 'M62 24 Q82 6 88 -10 Q78 12 64 32 Z', fill: 'currentColor' }),
    h('path', { d: 'M26 4 L20 -8 L28 0 Z', fill: 'currentColor' }),
    h('path', { d: 'M54 4 L60 -8 L52 0 Z', fill: 'currentColor' }),
    h('path', { d: 'M34 0 L32 -8 L38 -2 Z', fill: 'currentColor' }),
    h('path', { d: 'M46 0 L48 -8 L42 -2 Z', fill: 'currentColor' }),
    h('circle', { cx: 40, cy: 22, r: 6, fill: 'url(#pty8core)' }),
    h('circle', { cx: 40, cy: 22, r: 3.5, fill: '#000' }),
    h('circle', { cx: 40, cy: 22, r: 1.5, fill: '#fff' }),
    h('ellipse', { cx: 26, cy: 20, rx: 2, ry: 1, fill: '#000' }),
    h('ellipse', { cx: 54, cy: 20, rx: 2, ry: 1, fill: '#000' }),
    h('ellipse', { cx: 22, cy: 30, rx: 2.5, ry: 1.5, fill: '#000' }),
    h('ellipse', { cx: 58, cy: 30, rx: 2.5, ry: 1.5, fill: '#000' }),
    h('ellipse', { cx: 24, cy: 40, rx: 2.5, ry: 1.5, fill: '#000' }),
    h('ellipse', { cx: 56, cy: 40, rx: 2.5, ry: 1.5, fill: '#000' }),
    h('ellipse', { cx: 30, cy: 48, rx: 2, ry: 1.2, fill: '#000' }),
    h('ellipse', { cx: 50, cy: 48, rx: 2, ry: 1.2, fill: '#000' }),
    h('circle', { cx: 26, cy: 20, r: 0.7, fill: '#fff' }),
    h('circle', { cx: 54, cy: 20, r: 0.7, fill: '#fff' }),
    h('circle', { cx: 22, cy: 30, r: 0.9, fill: '#fff' }),
    h('circle', { cx: 58, cy: 30, r: 0.9, fill: '#fff' }),
    h('circle', { cx: 24, cy: 40, r: 0.9, fill: '#fff' }),
    h('circle', { cx: 56, cy: 40, r: 0.9, fill: '#fff' }),
    h('circle', { cx: 30, cy: 48, r: 0.7, fill: '#fff' }),
    h('circle', { cx: 50, cy: 48, r: 0.7, fill: '#fff' }),
    h('path', { d: 'M26 52 Q40 60 54 52 L52 60 L50 53 L48 61 L46 53 L44 62 L42 53 L40 62 L38 53 L36 62 L34 53 L32 61 L30 53 L28 60 Z', fill: '#000' }),
    h('path', { d: 'M30 52 L29 62 L33 56 Z', fill: '#fff' }),
    h('path', { d: 'M50 52 L51 62 L47 56 Z', fill: '#fff' }),
    h('path', { d: 'M40 56 L38 64 L42 64 Z', fill: '#fff', opacity: 0.8 }),
    h('path', { d: 'M14 36 Q4 38 -2 30 M66 36 Q76 38 82 30 M16 50 Q4 56 -2 62 M64 50 Q76 56 82 62', stroke: '#fff', 'stroke-width': 0.4, fill: 'none', opacity: 0.4 }),
  ])

/** V2 portrait map keyed by tier.key. */
export const TIER_PORTRAITS_V2: Record<TierKey, FunctionalComponent<BossPortraitProps>> = {
  tieuyeu: PortraitTieuYeuV2,
  sonyeu: PortraitSonYeuV2,
  hacsat: PortraitHacSatV2,
  yeutuong: PortraitYeuTuongV2,
  maquan: PortraitMaQuanV2,
  tavuong: PortraitTaVuongV2,
  yeude: PortraitYeuDeV2,
  thienma: PortraitThienMaV2,
  hondon: PortraitHonDonV2,
}
