/**
 * usePrivacy — Tàng số · privacy mask glyphs (taoist coin row).
 *
 * Thay vì `●●●` bullets vô tri, dùng glyph `⌘` (taoist coin) + spacing để
 * privacy display vẫn giữ lăng kính tu-tiên. Long form `⌘ ⌘ ⌘ ⌘ ⌘` cho big
 * amount fields, short form `⌘⌘⌘` cho narrow stats / pills.
 *
 * Apply qua class `.masked` (defined in styles.css) để có shimmer animation.
 */

/** Big-amount mask: 5 taoist coin glyphs với spaces. */
export const MASK_GLYPHS = '⌘ ⌘ ⌘ ⌘ ⌘'

/** Narrow stat mask: 3 glyphs no space. */
export const MASK_SHORT = '⌘⌘⌘'
