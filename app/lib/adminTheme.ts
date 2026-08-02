/**
 * Admin theme — see DESIGN.md.
 *
 * The admin surface is light: a --paper sidebar panel against white content
 * areas on a --app-bg page ground, divided by hairlines.
 *
 * Everything that can read a CSS custom property does. The literals below exist
 * only for Recharts, which passes its colour props straight through to SVG
 * fill/stroke attributes where var() does not resolve. This file is the single
 * source of those literals: they mirror globals.css and must be changed with it.
 */

/** Mirrors --accent / --accent-soft / --accent-faint in globals.css. */
export const accentTokens = {
  accent: '#1E3B31',
  soft: '#35594B',
  faint: '#C6CFC9',
} as const;

/**
 * Chart literals. Series colours are the status palette, so a bar in a chart
 * and a badge in a table say the same thing with the same colour.
 */
export const chartTokens = {
  /** Prior-month and secondary series. Reads as a quiet neutral beside accent. */
  neutral: '#C6CFC9',
  /** Current month, and any series the eye should land on first. */
  accent: '#1E3B31',
  grid: '#E3E3DE',
  axis: '#5E5E58',
  surface: '#FFFFFF',
  ink: '#1A1A18',
} as const;

/** Agreement pipeline. Every one of these is paired with its written label. */
export const statusTokens = {
  idle: '#6B6B64',
  wait: '#2C5878',
  waitLight: '#5A88A8',
  good: '#2F6A4C',
  strong: '#1E3B31',
  action: '#9E2B2B',
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
