/**
 * Admin theme — see DESIGN.md.
 *
 * Light only. There is no dark branch.
 *
 * Everything that can read a CSS custom property does. The literals below exist
 * only for Recharts, which passes its colour props straight through to SVG
 * fill/stroke attributes where var() does not resolve. These hex values are the
 * same colours as the matching tokens in globals.css and must change with them.
 */

/** Mirrors --accent / --accent-soft / --accent-faint in globals.css. */
export const accentTokens = {
  accent: '#1e3b31',
  soft: '#35594b',
  faint: '#c6cfc9',
} as const;

/**
 * Chart literals. Series colours are the status palette, so a bar in a chart
 * and a badge in a table say the same thing with the same colour.
 */
export const chartTokens = {
  /** Prior-month and secondary series. Same hex as --accent-faint. */
  neutral: '#c6cfc9',
  /** Current month, and any series the eye should land on first. --accent */
  accent: '#1e3b31',
  /** --hairline */
  grid: '#e3e3de',
  /** --muted */
  axis: '#5e5e58',
  /** --admin-surface */
  surface: '#ffffff',
  /** --ink */
  ink: '#1a1a18',
} as const;

/** Agreement pipeline. Every one of these is paired with its written label. */
export const statusTokens = {
  idle: '#6b6b64',
  wait: '#2c5878',
  waitLight: '#5a88a8',
  good: '#2f6a4c',
  strong: '#1e3b31',
  action: '#9e2b2b',
} as const;

export const adminTheme = {
  admin: {
    bg: 'var(--admin-bg)',
    sidebar: 'var(--paper)',
    card: 'var(--admin-surface)',
    text: 'var(--admin-text)',
    muted: 'var(--admin-muted)',
    border: 'var(--admin-hairline)',
    surfaceHover: 'var(--admin-surface-raised)',
    accent: 'var(--accent)',
    accentHover: 'var(--accent-hover)',
    accentOn: 'var(--accent-on)',
  },
} as const;

/** Page header only: "+ New …" / "+ Add …" (not inline row actions like + Add Event) */
export const adminHeaderAddButton = {
  bg: 'var(--admin-surface-raised)',
  hover: 'var(--panel)',
} as const;
