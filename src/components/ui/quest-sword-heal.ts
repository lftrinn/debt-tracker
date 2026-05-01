/**
 * quest-sword-heal.ts — SVG illustrations cho 9 sword + 9 heal tiers.
 * Port 1:1 từ debt-tracker-design/Pages/quest-sword-heal.jsx.
 *
 * Mỗi illustration 160×200 viewBox, dùng radialGradient defs + currentColor
 * inheritance. Container set `color: var(--tier-color)` để stroke + fill renders
 * đúng theo tier.
 */

import { h, type FunctionalComponent } from 'vue'
import type { SwordKey, HealKey } from '@/composables/data/useSwordHeal'

export interface StrikeIlloProps {
  size?: number
}

const VBSH = '0 0 160 200'

/** Common SVG wrapper. */
function svg(props: StrikeIlloProps, children: ReturnType<typeof h>[]) {
  const size = props.size ?? 150
  return h(
    'svg',
    {
      width: size * 0.8,
      height: size,
      viewBox: VBSH,
      style: { display: 'block' },
    },
    children,
  )
}

/** Helper: radialGradient def. */
function radial(id: string, opts: { cx?: string; cy?: string; r?: string; stops: Array<{ off: string; color: string; opacity: string }> }) {
  return h(
    'radialGradient',
    { id, cx: opts.cx ?? '50%', cy: opts.cy ?? '50%', r: opts.r ?? '60%' },
    opts.stops.map((s) =>
      h('stop', { offset: s.off, 'stop-color': s.color, 'stop-opacity': s.opacity }),
    ),
  )
}

/** Caption text in Hán-tự (bottom of illustration). */
function caption(text: string, color = 'currentColor', size = 10, opacity = 0.85) {
  return h('text', {
    x: 80,
    y: 186,
    'text-anchor': 'middle',
    fill: color,
    'font-family': 'serif',
    'font-style': 'italic',
    'font-size': size,
    opacity,
  }, text)
}

/**
 * SwBlade — kiếm rendered shape (length × width with guard + pommel).
 * Translated to position via parent <g transform>.
 */
function swBlade(length: number, width: number, glow = true): ReturnType<typeof h>[] {
  const out: ReturnType<typeof h>[] = []
  if (glow) {
    out.push(h('rect', { x: -width - 2, y: -length, width: width * 2 + 4, height: length, fill: 'currentColor', opacity: 0.25, rx: 1 }))
  }
  out.push(h('rect', { x: -width / 2, y: -length + 8, width, height: length - 8, fill: '#fff', opacity: 0.95 }))
  out.push(h('rect', { x: -width / 2, y: -length + 8, width: width / 2, height: length - 8, fill: 'currentColor', opacity: 0.7 }))
  out.push(h('path', { d: `M${-width / 2 - 1} ${-length + 8} L${width / 2 + 1} ${-length + 8} L0 ${-length} Z`, fill: '#fff' }))
  // guard
  out.push(h('rect', { x: -12, y: 0, width: 24, height: 4, fill: 'currentColor' }))
  out.push(h('rect', { x: -3, y: 4, width: 6, height: 14, fill: 'currentColor' }))
  out.push(h('circle', { cx: 0, cy: 20, r: 4, fill: 'currentColor' }))
  return out
}

// ════════════════════════════════════════════════════════════════════════════
// SWORD ILLOS · 9 tiers
// ════════════════════════════════════════════════════════════════════════════

// Tier 0 — Phác Phong: straight thin slash
export const SwordPhacPhong: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw0bg', { cy: '60%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.4' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 100, r: 80, fill: 'url(#sw0bg)' }),
    h('g', { transform: 'translate(80 130) rotate(-25)' }, swBlade(100, 3.5)),
    h('path', { d: 'M40 50 Q80 80 130 130', stroke: '#fff', 'stroke-width': 2, fill: 'none', opacity: 0.85 }),
    h('path', { d: 'M40 50 Q80 80 130 130', stroke: 'currentColor', 'stroke-width': 0.8, fill: 'none', opacity: 0.9 }),
    caption('一閃', 'currentColor', 10, 0.7),
  ])

// Tier 1 — Thanh Phong: wind currents
export const SwordThanhPhong: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw1bg', { stops: [
      { off: '0%', color: 'currentColor', opacity: '0.45' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 80, fill: 'url(#sw1bg)' }),
    h('g', { stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none', opacity: 0.6 }, [
      h('path', { d: 'M10 60 Q40 50 70 60 Q100 70 130 60' }),
      h('path', { d: 'M14 90 Q44 78 74 90 Q104 102 134 90' }),
      h('path', { d: 'M18 120 Q48 108 78 120 Q108 132 138 120' }),
    ]),
    h('g', { transform: 'translate(80 140) rotate(-30)' }, swBlade(108, 4)),
    h('path', { d: 'M30 40 Q70 70 130 130', stroke: '#fff', 'stroke-width': 2.5, fill: 'none', opacity: 0.95 }),
    h('path', { d: 'M28 36 Q70 70 134 134', stroke: 'currentColor', 'stroke-width': 1, fill: 'none', opacity: 0.85 }),
    caption('清風', 'currentColor', 10, 0.7),
  ])

// Tier 2 — Phi Tinh: comet star
export const SwordPhiTinh: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw2bg', { r: '62%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.5' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 80, fill: 'url(#sw2bg)' }),
    h('g', { fill: '#fff' }, [
      h('circle', { cx: 20, cy: 30, r: 1 }),
      h('circle', { cx: 50, cy: 14, r: 1.2 }),
      h('circle', { cx: 120, cy: 22, r: 1 }),
      h('circle', { cx: 140, cy: 60, r: 0.9 }),
    ]),
    h('path', { d: 'M16 32 Q60 70 130 134', stroke: '#fff', 'stroke-width': 3.5, fill: 'none', opacity: 0.9 }),
    h('path', { d: 'M16 32 Q60 70 130 134', stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none', opacity: 0.95 }),
    h('circle', { cx: 130, cy: 134, r: 6, fill: '#fff' }),
    h('circle', { cx: 130, cy: 134, r: 3, fill: 'currentColor' }),
    h('g', { transform: 'translate(60 150) rotate(-50)' }, swBlade(104, 4)),
    h('g', { stroke: '#fff', 'stroke-width': 0.7, opacity: 0.9 }, [
      h('path', { d: 'M130 124 L130 144 M120 134 L140 134' }),
    ]),
    caption('飛星', 'currentColor', 10, 0.7),
  ])

// Tier 3 — Nguy Kiếm: half-moon arc + mountain
export const SwordNguyKiem: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw3bg', { r: '65%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.55' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 82, fill: 'url(#sw3bg)' }),
    h('path', { d: 'M0 180 L40 130 L60 150 L80 110 L100 150 L120 130 L160 180', fill: 'currentColor', opacity: 0.3 }),
    h('path', { d: 'M70 130 L78 156 L72 156 L80 184 L88 156 L82 156 L90 130', fill: 'currentColor', opacity: 0.5 }),
    h('path', { d: 'M16 100 Q80 30 144 100', stroke: '#fff', 'stroke-width': 5, fill: 'none', opacity: 0.95 }),
    h('path', { d: 'M14 100 Q80 26 146 100', stroke: 'currentColor', 'stroke-width': 2.4, fill: 'none', opacity: 0.95 }),
    h('path', { d: 'M16 100 Q80 30 144 100', stroke: '#fff', 'stroke-width': 1.2, fill: 'none', opacity: 1 }),
    h('g', { transform: 'translate(80 150) rotate(0)' }, swBlade(86, 5)),
    caption('危劍', 'currentColor', 10, 0.75),
  ])

// Tier 4 — Cửu Long Hí: 9 dragons swirling
export const SwordCuuLongHi: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw4bg', { r: '68%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.6' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 84, fill: 'url(#sw4bg)' }),
    h('g', { stroke: 'currentColor', 'stroke-width': 1.6, fill: 'none', opacity: 0.85 }, [
      h('path', { d: 'M30 40 Q60 50 50 80 Q40 110 80 100' }),
      h('path', { d: 'M130 40 Q100 50 110 80 Q120 110 80 100' }),
      h('path', { d: 'M16 90 Q40 80 50 110 Q60 140 100 130' }),
      h('path', { d: 'M144 90 Q120 80 110 110 Q100 140 60 130' }),
      h('path', { d: 'M40 20 Q70 40 80 60' }),
      h('path', { d: 'M120 20 Q90 40 80 60' }),
      h('path', { d: 'M30 150 Q60 130 80 140' }),
      h('path', { d: 'M130 150 Q100 130 80 140' }),
      h('path', { d: 'M80 6 L80 70' }),
    ]),
    h('g', { fill: 'currentColor' }, [
      h('circle', { cx: 30, cy: 40, r: 2.5 }),
      h('circle', { cx: 130, cy: 40, r: 2.5 }),
      h('circle', { cx: 16, cy: 90, r: 2.5 }),
      h('circle', { cx: 144, cy: 90, r: 2.5 }),
      h('circle', { cx: 40, cy: 20, r: 2 }),
      h('circle', { cx: 120, cy: 20, r: 2 }),
      h('circle', { cx: 30, cy: 150, r: 2 }),
      h('circle', { cx: 130, cy: 150, r: 2 }),
      h('circle', { cx: 80, cy: 6, r: 2.5 }),
    ]),
    h('g', { transform: 'translate(80 100) rotate(0)' }, swBlade(70, 4.5)),
    caption('九龍戲', 'currentColor', 10, 0.8),
  ])

// Tier 5 — Phi Thiên Nhận: vertical pillar
export const SwordPhiThienNhan: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw5bg', { r: '70%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.65' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 80, r: 86, fill: 'url(#sw5bg)' }),
    h('rect', { x: 74, y: -10, width: 12, height: 160, fill: '#fff', opacity: 0.95 }),
    h('rect', { x: 76, y: -10, width: 8, height: 160, fill: 'currentColor', opacity: 0.95 }),
    h('rect', { x: 79, y: -10, width: 2, height: 160, fill: '#fff' }),
    h('g', { stroke: 'currentColor', 'stroke-width': 1, fill: 'none', opacity: 0.7 }, [
      h('path', { d: 'M40 40 L74 40 M86 40 L120 40' }),
      h('path', { d: 'M30 90 L74 90 M86 90 L130 90' }),
      h('path', { d: 'M40 130 L74 130 M86 130 L120 130' }),
    ]),
    h('g', { fill: '#fff' }, [
      h('circle', { cx: 20, cy: 60, r: 1.5 }),
      h('circle', { cx: 140, cy: 100, r: 1.3 }),
      h('circle', { cx: 30, cy: 110, r: 1 }),
      h('circle', { cx: 130, cy: 50, r: 1.2 }),
    ]),
    h('ellipse', { cx: 80, cy: 160, rx: 60, ry: 10, fill: 'none', stroke: '#fff', 'stroke-width': 1, opacity: 0.6 }),
    h('ellipse', { cx: 80, cy: 160, rx: 40, ry: 6, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2, opacity: 0.7 }),
    caption('飛天刃', 'currentColor', 10, 0.85),
  ])

// Tier 6 — Thái Âm Trượng: radiant gold blade with halo
export const SwordThaiAmTruong: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw6bg', { r: '70%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.7' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 88, fill: 'url(#sw6bg)' }),
    h('g', { stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none', opacity: 0.55 }, [
      h('path', { d: 'M80 0 L80 20 M80 160 L80 180 M0 90 L20 90 M140 90 L160 90' }),
      h('path', { d: 'M20 30 L34 44 M140 30 L126 44 M20 150 L34 136 M140 150 L126 136' }),
      h('path', { d: 'M50 6 L54 24 M110 6 L106 24 M6 50 L24 54 M154 50 L136 54' }),
    ]),
    h('circle', { cx: 80, cy: 90, r: 56, fill: 'none', stroke: '#fff', 'stroke-width': 1.5, opacity: 0.65 }),
    h('circle', { cx: 80, cy: 90, r: 50, fill: 'none', stroke: 'currentColor', 'stroke-width': 1, opacity: 0.85 }),
    h('g', { transform: 'translate(80 158)' }, swBlade(130, 6)),
    h('path', { d: 'M70 22 L80 6 L90 22 L84 22 L80 14 L76 22 Z', fill: 'currentColor' }),
    caption('太陰杖', 'currentColor', 10, 0.85),
  ])

// Tier 7 — Thiên Kiếm Quyết: sword rain
export const SwordThienKiemQuyet: FunctionalComponent<StrikeIlloProps> = (props) => {
  const fallingSwords: ReturnType<typeof h>[] = []
  const trails: ReturnType<typeof h>[] = []
  const xs = [14, 30, 46, 62, 78, 94, 110, 126, 142, 86]
  xs.forEach((x, i) => {
    const len = 20 + (i % 3) * 12
    const y0 = 10 + (i % 4) * 8
    const rot = -8 + (i % 5) * 4
    fallingSwords.push(
      h('g', { key: 'fs' + i, transform: `translate(${x} ${y0 + 30}) rotate(${rot})` }, [
        h('rect', { x: -0.7, y: 0, width: 1.4, height: len, fill: '#fff' }),
        h('path', { d: 'M-1.5 0 L1.5 0 L0 -3 Z', fill: '#fff' }),
        h('rect', { x: -3, y: len, width: 6, height: 1.2, fill: 'currentColor' }),
      ]),
    )
    trails.push(h('path', { key: 'tr' + i, d: `M${x} 0 L${x + ((i % 5) - 2) * 4} ${30 + (i % 4) * 8}` }))
  })
  return svg(props, [
    h('defs', {}, [radial('sw7bg', { r: '72%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.7' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 80, r: 90, fill: 'url(#sw7bg)' }),
    h('g', { stroke: '#fff', 'stroke-width': 0.8, fill: '#fff', opacity: 0.95 }, fallingSwords),
    h('g', { stroke: 'currentColor', 'stroke-width': 0.5, fill: 'none', opacity: 0.65 }, trails),
    h('g', { transform: 'translate(80 168)' }, swBlade(120, 6)),
    h('ellipse', { cx: 80, cy: 170, rx: 70, ry: 8, fill: 'none', stroke: '#fff', 'stroke-width': 1.4, opacity: 0.65 }),
    h('ellipse', { cx: 80, cy: 172, rx: 50, ry: 5, fill: 'none', stroke: 'currentColor', 'stroke-width': 1, opacity: 0.7 }),
    caption('天劍訣', '#fff', 10, 0.85),
  ])
}

// Tier 8 — Hỗn Độn Trảm Vạn Pháp: chaos rift
export const SwordHonDonTracVanPhap: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('sw8bg', { r: '80%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.85' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 80, r: 92, fill: 'url(#sw8bg)' }),
    h('circle', { cx: 80, cy: 80, r: 76, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.6, 'stroke-dasharray': '3 3', opacity: 0.5 }),
    h('circle', { cx: 80, cy: 80, r: 60, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.5, 'stroke-dasharray': '1 5', opacity: 0.6 }),
    h('g', { fill: '#fff', opacity: 0.95 }, [
      h('circle', { cx: 14, cy: 20, r: 1.2 }),
      h('circle', { cx: 146, cy: 22, r: 1 }),
      h('circle', { cx: 6, cy: 60, r: 0.9 }),
      h('circle', { cx: 154, cy: 58, r: 1.1 }),
      h('circle', { cx: 20, cy: 140, r: 1 }),
      h('circle', { cx: 140, cy: 140, r: 1.2 }),
    ]),
    h('path', { d: 'M10 10 L150 170', stroke: '#000', 'stroke-width': 14, fill: 'none' }),
    h('path', { d: 'M10 10 L150 170', stroke: '#fff', 'stroke-width': 3, fill: 'none', opacity: 0.9 }),
    h('path', { d: 'M10 10 L150 170', stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none', opacity: 1 }),
    h('path', { d: 'M40 80 L78 96 M88 64 L120 50', stroke: '#fff', 'stroke-width': 1.2, fill: 'none', opacity: 0.85 }),
    h('path', { d: 'M40 80 L78 96 M88 64 L120 50', stroke: 'currentColor', 'stroke-width': 0.5, fill: 'none' }),
    h('g', { transform: 'translate(40 156) rotate(-45)' }, swBlade(150, 6)),
    h('g', { fill: '#fff', opacity: 0.9 }, [
      h('circle', { cx: 80, cy: 90, r: 3 }),
      h('circle', { cx: 60, cy: 70, r: 2 }),
      h('circle', { cx: 100, cy: 110, r: 2 }),
    ]),
    caption('混沌斬萬法', '#fff', 9, 0.95),
  ])

export const SWORD_ILLOS: Record<SwordKey, FunctionalComponent<StrikeIlloProps>> = {
  phacphong: SwordPhacPhong,
  thanhphong: SwordThanhPhong,
  phitinh: SwordPhiTinh,
  nguykiem: SwordNguyKiem,
  cuulonghi: SwordCuuLongHi,
  phithiennhan: SwordPhiThienNhan,
  thaiamtruong: SwordThaiAmTruong,
  thienkienquyet: SwordThienKiemQuyet,
  hondontrucvanphap: SwordHonDonTracVanPhap,
}

// ════════════════════════════════════════════════════════════════════════════
// HEAL ILLOS · 9 tiers
// ════════════════════════════════════════════════════════════════════════════

// Tier 0 — Tiểu Thần Phù: paper talisman with rising glow
export const HealTieuThanPhu: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('hl0bg', { cy: '60%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.4' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 100, r: 80, fill: 'url(#hl0bg)' }),
    h('rect', { x: 60, y: 50, width: 40, height: 60, fill: 'currentColor', opacity: 0.85, rx: 2 }),
    h('rect', { x: 62, y: 52, width: 36, height: 56, fill: '#fff', opacity: 0.15, rx: 1 }),
    h('path', { d: 'M70 62 L90 62 M70 70 L86 70 M70 78 L90 78 M70 86 L84 86 M70 94 L88 94 M70 102 L82 102', stroke: '#fff', 'stroke-width': 0.8, opacity: 0.9 }),
    h('circle', { cx: 80, cy: 60, r: 4, fill: '#fff' }),
    h('g', { fill: 'currentColor', opacity: 0.7 }, [
      h('circle', { cx: 80, cy: 34, r: 3 }),
      h('circle', { cx: 80, cy: 22, r: 2 }),
      h('circle', { cx: 80, cy: 14, r: 1.2 }),
    ]),
    caption('符', 'currentColor', 10, 0.7),
  ])

// Tier 1 — Thảo Mộc Chỉ: circling leaves
export const HealThaoMocChi: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('hl1bg', { cy: '55%', r: '62%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.45' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 80, fill: 'url(#hl1bg)' }),
    h('path', { d: 'M80 130 L80 70 Q72 60 76 50 Q86 56 80 70 Q88 60 84 50 Q74 56 80 70', stroke: 'currentColor', 'stroke-width': 2, fill: 'currentColor', opacity: 0.85 }),
    h('g', { fill: 'currentColor', opacity: 0.85 }, [
      h('path', { d: 'M30 50 Q40 46 44 56 Q40 60 30 50 Z' }),
      h('path', { d: 'M120 60 Q130 56 132 66 Q124 72 120 60 Z' }),
      h('path', { d: 'M22 110 Q34 108 36 120 Q26 122 22 110 Z' }),
      h('path', { d: 'M126 110 Q116 108 114 120 Q124 122 126 110 Z' }),
      h('path', { d: 'M58 24 Q66 22 70 30 Q62 36 58 24 Z' }),
      h('path', { d: 'M100 24 Q92 22 88 30 Q96 36 100 24 Z' }),
    ]),
    h('path', { d: 'M80 100 Q60 90 50 70 Q40 50 60 30', stroke: 'currentColor', 'stroke-width': 1, fill: 'none', opacity: 0.5, 'stroke-dasharray': '2 2' }),
    caption('草木', 'currentColor', 10, 0.75),
  ])

// Tier 2 — Thanh Tuyền Khí: water swirl
export const HealThanhTuyenKhi: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [radial('hl2bg', { cy: '55%', r: '65%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.5' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 82, fill: 'url(#hl2bg)' }),
    h('ellipse', { cx: 80, cy: 120, rx: 60, ry: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, opacity: 0.7 }),
    h('ellipse', { cx: 80, cy: 120, rx: 46, ry: 10, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2, opacity: 0.6 }),
    h('ellipse', { cx: 80, cy: 120, rx: 32, ry: 7, fill: 'none', stroke: 'currentColor', 'stroke-width': 1, opacity: 0.55 }),
    h('g', { fill: '#fff', opacity: 0.85 }, [
      h('ellipse', { cx: 80, cy: 60, rx: 4, ry: 6 }),
      h('ellipse', { cx: 80, cy: 60, rx: 2, ry: 3, fill: 'currentColor' }),
      h('ellipse', { cx: 50, cy: 80, rx: 3, ry: 5 }),
      h('ellipse', { cx: 110, cy: 80, rx: 3, ry: 5 }),
      h('circle', { cx: 80, cy: 40, r: 2 }),
      h('circle', { cx: 60, cy: 50, r: 1.5 }),
      h('circle', { cx: 100, cy: 50, r: 1.5 }),
    ]),
    h('path', { d: 'M80 130 Q60 100 80 80 Q100 60 80 40 Q66 26 80 14', stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none', opacity: 0.7 }),
    caption('清泉', 'currentColor', 10, 0.8),
  ])

// Tier 3 — Long Huyết Đan: glowing pill / dan
export const HealLongHuyetDan: FunctionalComponent<StrikeIlloProps> = (props) =>
  svg(props, [
    h('defs', {}, [
      radial('hl3bg', { r: '68%', stops: [
        { off: '0%', color: 'currentColor', opacity: '0.6' },
        { off: '100%', color: 'currentColor', opacity: '0' },
      ] }),
      h('radialGradient', { id: 'hl3core', cx: '50%', cy: '40%', r: '50%' }, [
        h('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': '1' }),
        h('stop', { offset: '60%', 'stop-color': 'currentColor', 'stop-opacity': '1' }),
        h('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': '0.7' }),
      ]),
    ]),
    h('circle', { cx: 80, cy: 90, r: 84, fill: 'url(#hl3bg)' }),
    h('circle', { cx: 80, cy: 86, r: 56, fill: 'none', stroke: 'currentColor', 'stroke-width': 1, 'stroke-dasharray': '2 4', opacity: 0.5 }),
    h('circle', { cx: 80, cy: 86, r: 22, fill: 'url(#hl3core)' }),
    h('ellipse', { cx: 74, cy: 78, rx: 6, ry: 4, fill: '#fff', opacity: 0.7 }),
    h('g', { stroke: 'currentColor', 'stroke-width': 1, fill: 'none', opacity: 0.65 }, [
      h('path', { d: 'M80 50 L80 36 M80 122 L80 136 M44 86 L30 86 M116 86 L130 86' }),
      h('path', { d: 'M54 60 L44 50 M106 60 L116 50 M54 112 L44 122 M106 112 L116 122' }),
    ]),
    h('path', { d: 'M30 30 Q50 60 30 90 Q50 120 30 150', stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none', opacity: 0.55 }),
    h('path', { d: 'M130 30 Q110 60 130 90 Q110 120 130 150', stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none', opacity: 0.55 }),
    caption('龍血丹', 'currentColor', 10, 0.85),
  ])

// Tier 4 — Phượng Châu Diễm: phoenix wings + pearl
export const HealPhuongChuDem: FunctionalComponent<StrikeIlloProps> = (props) => {
  const flameRings = [24, 32, 40, 48].map((r, i) =>
    h('circle', { key: 'fr' + i, cx: 80, cy: 84, r, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.8, opacity: 0.6 - i * 0.1 }),
  )
  return svg(props, [
    h('defs', {}, [radial('hl4bg', { r: '70%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.65' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 86, fill: 'url(#hl4bg)' }),
    h('path', { d: 'M80 90 Q40 70 14 100 Q44 90 80 90', fill: 'currentColor', opacity: 0.6 }),
    h('path', { d: 'M80 90 Q120 70 146 100 Q116 90 80 90', fill: 'currentColor', opacity: 0.6 }),
    h('path', { d: 'M80 90 Q40 110 14 80 Q44 90 80 90', fill: 'currentColor', opacity: 0.45 }),
    h('path', { d: 'M80 90 Q120 110 146 80 Q116 90 80 90', fill: 'currentColor', opacity: 0.45 }),
    h('path', { d: 'M80 90 Q70 130 60 160 Q70 140 80 110 Q90 140 100 160 Q90 130 80 90', fill: 'currentColor', opacity: 0.7 }),
    h('circle', { cx: 80, cy: 84, r: 14, fill: '#fff', opacity: 0.95 }),
    h('circle', { cx: 80, cy: 84, r: 14, fill: 'currentColor', opacity: 0.5 }),
    h('circle', { cx: 76, cy: 80, r: 4, fill: '#fff' }),
    ...flameRings,
    h('path', { d: 'M80 64 L74 50 L80 56 L86 50 Z', fill: 'currentColor' }),
    caption('鳳珠焰', 'currentColor', 10, 0.85),
  ])
}

// Tier 5 — Cửu Chuyển Hoàn Hồn: 9 swirling souls
export const HealCuuChuyenHoanHon: FunctionalComponent<StrikeIlloProps> = (props) => {
  const souls: ReturnType<typeof h>[] = []
  for (let i = 0; i < 9; i++) {
    const a = (i * 40) * Math.PI / 180
    const r1 = 70, r2 = 18
    const x1 = 80 + Math.cos(a) * r1
    const y1 = 90 + Math.sin(a) * r1
    const x2 = 80 + Math.cos(a) * r2
    const y2 = 90 + Math.sin(a) * r2
    souls.push(h('g', { key: 's' + i }, [
      h('path', { d: `M${x1} ${y1} Q${(x1 + 80) / 2 + Math.cos(a + 1) * 20} ${(y1 + 90) / 2 + Math.sin(a + 1) * 20} ${x2} ${y2}`, stroke: 'currentColor', 'stroke-width': 1, fill: 'none', opacity: 0.85 }),
      h('circle', { cx: x1, cy: y1, r: 2.5, fill: '#fff' }),
      h('circle', { cx: x1, cy: y1, r: 1.2, fill: 'currentColor' }),
    ]))
  }
  return svg(props, [
    h('defs', {}, [radial('hl5bg', { r: '70%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.65' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 88, fill: 'url(#hl5bg)' }),
    h('ellipse', { cx: 80, cy: 100, rx: 14, ry: 32, fill: 'currentColor', opacity: 0.4 }),
    h('circle', { cx: 80, cy: 74, r: 10, fill: 'currentColor', opacity: 0.55 }),
    ...souls,
    h('circle', { cx: 80, cy: 90, r: 6, fill: '#fff', opacity: 0.95 }),
    h('circle', { cx: 80, cy: 90, r: 3, fill: 'currentColor' }),
    caption('九轉魂', 'currentColor', 10, 0.9),
  ])
}

// Tier 6 — Thiên Quang Liên Hoa: golden lotus
export const HealThienQuangLienHoa: FunctionalComponent<StrikeIlloProps> = (props) => {
  const rays: ReturnType<typeof h>[] = []
  for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const rad = a * Math.PI / 180
    const x1 = 80 + Math.cos(rad) * 40
    const y1 = 90 + Math.sin(rad) * 40
    const x2 = 80 + Math.cos(rad) * 70
    const y2 = 90 + Math.sin(rad) * 70
    rays.push(h('path', { key: 'r' + a, d: `M${x1} ${y1} L${x2} ${y2}` }))
  }
  const petals: ReturnType<typeof h>[] = []
  for (let i = 0; i < 8; i++) {
    const a = (i * 45) * Math.PI / 180
    const cx = 80 + Math.cos(a) * 16
    const cy = 90 + Math.sin(a) * 16
    const tx = 80 + Math.cos(a) * 38
    const ty = 90 + Math.sin(a) * 38
    petals.push(h('g', { key: 'p' + i }, [
      h('path', { d: `M80 90 Q${cx + Math.cos(a + 1.2) * 8} ${cy + Math.sin(a + 1.2) * 8} ${tx} ${ty} Q${cx + Math.cos(a - 1.2) * 8} ${cy + Math.sin(a - 1.2) * 8} 80 90`, fill: 'currentColor', opacity: 0.8 }),
      h('path', { d: `M80 90 Q${cx + Math.cos(a + 1.2) * 8} ${cy + Math.sin(a + 1.2) * 8} ${tx} ${ty}`, stroke: '#fff', 'stroke-width': 0.6, fill: 'none', opacity: 0.7 }),
    ]))
  }
  return svg(props, [
    h('defs', {}, [radial('hl6bg', { r: '70%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.7' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 90, fill: 'url(#hl6bg)' }),
    h('g', { stroke: 'currentColor', 'stroke-width': 1, fill: 'none', opacity: 0.55 }, rays),
    ...petals,
    h('circle', { cx: 80, cy: 90, r: 10, fill: '#fff', opacity: 0.95 }),
    h('circle', { cx: 80, cy: 90, r: 6, fill: 'currentColor' }),
    h('circle', { cx: 80, cy: 90, r: 2, fill: '#fff' }),
    caption('天光蓮', 'currentColor', 10, 0.9),
  ])
}

// Tier 7 — Thiên Thất Chi Ấn: 7-pointed sigil
export const HealThienThatChiAn: FunctionalComponent<StrikeIlloProps> = (props) => {
  const skip: string[] = []
  const dots: ReturnType<typeof h>[] = []
  for (let i = 0; i < 7; i++) {
    const a1 = (i * 360 / 7 - 90) * Math.PI / 180
    const a2 = ((i + 3) * 360 / 7 - 90) * Math.PI / 180
    skip.push(`M${Math.cos(a1) * 36} ${Math.sin(a1) * 36} L${Math.cos(a2) * 36} ${Math.sin(a2) * 36}`)
    const a = (i * 360 / 7 - 90) * Math.PI / 180
    dots.push(h('circle', { key: 'd' + i, cx: Math.cos(a) * 36, cy: Math.sin(a) * 36, r: 2, fill: '#fff' }))
  }
  return svg(props, [
    h('defs', {}, [radial('hl7bg', { r: '72%', stops: [
      { off: '0%', color: 'currentColor', opacity: '0.7' },
      { off: '100%', color: 'currentColor', opacity: '0' },
    ] })]),
    h('circle', { cx: 80, cy: 90, r: 92, fill: 'url(#hl7bg)' }),
    h('circle', { cx: 80, cy: 74, r: 48, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.8, opacity: 0.55 }),
    h('circle', { cx: 80, cy: 74, r: 42, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.5, 'stroke-dasharray': '3 3', opacity: 0.7 }),
    h('g', { transform: 'translate(80 74)' }, [
      h('path', { d: skip.join(' '), stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none', opacity: 0.95 }),
      h('path', { d: skip.join(' '), stroke: '#fff', 'stroke-width': 0.5, fill: 'none' }),
      ...dots,
    ]),
    h('ellipse', { cx: 80, cy: 148, rx: 14, ry: 22, fill: 'currentColor', opacity: 0.45 }),
    h('circle', { cx: 80, cy: 124, r: 8, fill: 'currentColor', opacity: 0.55 }),
    h('path', { d: 'M76 110 L76 124 L84 124 L84 110 Z', fill: '#fff', opacity: 0.5 }),
    caption('七印', 'currentColor', 10, 0.95),
  ])
}

// Tier 8 — Hỗn Độn Sinh Mệnh: universe vortex
export const HealHonDonSinhMenh: FunctionalComponent<StrikeIlloProps> = (props) => {
  const burst: ReturnType<typeof h>[] = []
  for (const a of [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]) {
    const rad = a * Math.PI / 180
    burst.push(h('path', { key: 'b' + a, d: `M${80 + Math.cos(rad) * 22} ${80 + Math.sin(rad) * 22} L${80 + Math.cos(rad) * 36} ${80 + Math.sin(rad) * 36}` }))
  }
  return svg(props, [
    h('defs', {}, [
      radial('hl8bg', { r: '78%', stops: [
        { off: '0%', color: 'currentColor', opacity: '0.85' },
        { off: '100%', color: 'currentColor', opacity: '0' },
      ] }),
      h('radialGradient', { id: 'hl8core', cx: '50%', cy: '40%', r: '55%' }, [
        h('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': '1' }),
        h('stop', { offset: '50%', 'stop-color': 'currentColor', 'stop-opacity': '1' }),
        h('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': '0.7' }),
      ]),
    ]),
    h('circle', { cx: 80, cy: 80, r: 92, fill: 'url(#hl8bg)' }),
    h('g', { stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none', opacity: 0.7 }, [
      h('path', { d: 'M80 80 Q140 80 140 130 Q140 180 80 180 Q20 180 20 130 Q20 80 60 80 Q100 80 100 110 Q100 140 70 140' }),
      h('path', { d: 'M80 80 Q20 80 20 30 Q20 -20 80 -20', opacity: 0.6 }),
      h('path', { d: 'M80 80 Q140 80 140 30 Q140 -20 80 -20', opacity: 0.6 }),
    ]),
    h('g', { fill: '#fff', opacity: 0.95 }, [
      h('circle', { cx: 20, cy: 30, r: 1.2 }),
      h('circle', { cx: 140, cy: 40, r: 1 }),
      h('circle', { cx: 30, cy: 140, r: 1 }),
      h('circle', { cx: 130, cy: 150, r: 1.1 }),
      h('circle', { cx: 60, cy: 20, r: 0.8 }),
      h('circle', { cx: 100, cy: 20, r: 0.9 }),
      h('circle', { cx: 14, cy: 80, r: 0.9 }),
      h('circle', { cx: 146, cy: 80, r: 1 }),
    ]),
    h('g', { stroke: '#fff', 'stroke-width': 0.5, opacity: 0.85 }, [
      h('path', { d: 'M40 50 L40 44 M40 50 L40 56 M34 50 L46 50' }),
      h('path', { d: 'M120 110 L120 104 M120 110 L120 116 M114 110 L126 110' }),
    ]),
    h('ellipse', { cx: 80, cy: 80, rx: 18, ry: 22, fill: 'url(#hl8core)' }),
    h('ellipse', { cx: 74, cy: 72, rx: 5, ry: 7, fill: '#fff', opacity: 0.85 }),
    h('g', { stroke: '#fff', 'stroke-width': 0.7, opacity: 0.75 }, burst),
    caption('混沌生命', '#fff', 9, 0.95),
  ])
}

export const HEAL_ILLOS: Record<HealKey, FunctionalComponent<StrikeIlloProps>> = {
  tieuthanphu: HealTieuThanPhu,
  thaomocchi: HealThaoMocChi,
  thanhtuyenkhi: HealThanhTuyenKhi,
  longhuyetdan: HealLongHuyetDan,
  phongchudem: HealPhuongChuDem,
  cuuchuyenhoanhondan: HealCuuChuyenHoanHon,
  thienquanglienhoa: HealThienQuangLienHoa,
  thienthatchinhan: HealThienThatChiAn,
  hondonsinhmenh: HealHonDonSinhMenh,
}
