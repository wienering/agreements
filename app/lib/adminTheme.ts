/**
 * Charcoal surfaces + muted sage green accent (easier on the eyes than neon).
 * Use dark.* for isDark branches; light.* for light mode.
 *
 * Brand green tokens: a single source of truth lives in two places kept
 * deliberately in sync — `--accent` / `--accent-soft` / `--accent-faint`
 * in app/globals.css (for CSS / inline styles) and `accentTokens` below
 * (for contexts that need a literal color string, e.g. SVG attributes
 * on recharts, which do not resolve CSS variables).
 */
export const accentTokens = {
  accent: '#1D9E75',
  soft: '#5DCAA5',
  faint: '#9FE1CB',
} as const;

export const adminTheme = {
  dark: {
    bg: '#080c08',
    sidebar: '#0e110e',
    card: '#1a1d1a',
    text: '#ffffff',
    muted: '#8f9a8f',
    border: '#2d3530',
    surfaceHover: '#2a322a',
    accent: 'var(--accent)',
    accentHover: 'var(--accent)',
    accentOn: '#0a0f0c',
  },
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    muted: '#64748b',
    border: '#e2e8f0',
    surfaceHover: '#f1f5f9',
    accent: 'var(--accent)',
    accentHover: 'var(--accent)',
    accentOn: '#0a0f0c',
  },
} as const;

/** Page header only: "+ New …" / "+ Add …" (not inline row actions like + Add Event) */
export const adminHeaderAddButton = {
  bg: '#343f34',
  hover: '#404c40',
} as const;
