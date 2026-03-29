/**
 * Design system colors — single source of truth for JS contexts (Chart.js, computed data).
 * These values MUST match the CSS variables in styles.css :root.
 * Use CSS variables (var(--accent2)) in templates/styles; use this composable in JS logic only.
 */

type RgbColorName = 'accent' | 'accent2' | 'accent3' | 'danger' | 'text'

export function useColors() {
  const colors = {
    bg: '#0a0a0f',
    surface: '#111118',
    surface2: '#1a1a24',
    border: '#2a2a3a',
    accent: '#e8ff47',
    accent2: '#ff6b4a',
    accent3: '#4aefb8',
    accent4: '#a78bfa',
    accent5: '#38bdf8',
    accent6: '#fb923c',
    text: '#f0f0f5',
    muted: '#6b6b85',
    danger: '#ff4a6b',
  }

  // RGB channel values for rgba() in JS
  const rgb: Record<RgbColorName, string> = {
    accent: '232,255,71',
    accent2: '255,107,74',
    accent3: '74,239,184',
    danger: '255,74,107',
    text: '255,255,255',
  }

  /** Create rgba string from a design token name */
  function rgba(name: RgbColorName, alpha: number): string {
    return `rgba(${rgb[name]},${alpha})`
  }

  // Chart.js grid/tick colors (reusable)
  const chartGrid = `rgba(${rgb.text},.04)`
  const chartTick = colors.muted
  const chartFont = { family: 'JetBrains Mono', size: 9 }

  // Palette for multi-series data (pie chart segments, etc.)
  const palette = [colors.accent2, colors.accent, colors.accent3, colors.accent4, colors.accent5, colors.accent6]

  return { colors, rgb, rgba, chartGrid, chartTick, chartFont, palette }
}
