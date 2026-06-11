/**
 * Admin warm-charcoal palette — values from docs/design-direction.md.
 * Dark-only surface (Light Mode removed in stage 2).
 *
 * Literal accentTokens remain for SVG/chart attributes that cannot use CSS vars.
 */
export const accentTokens = {
  accent: '#C6A04D',
  soft: '#D4B96A',
  faint: '#E5D4A8',
} as const;

export const adminTheme = {
  dark: {
    bg: 'var(--admin-bg)',
    sidebar: 'var(--admin-surface)',
    card: 'var(--admin-surface)',
    text: 'var(--admin-text)',
    muted: 'var(--admin-muted)',
    border: 'var(--admin-hairline)',
    surfaceHover: 'var(--admin-surface-raised)',
    accent: 'var(--accent)',
    accentHover: 'var(--accent)',
    accentOn: '#2A2724',
  },
} as const;

/** Page header only: "+ New …" / "+ Add …" (not inline row actions like + Add Event) */
export const adminHeaderAddButton = {
  bg: 'var(--admin-surface-raised)',
  hover: '#3F3A34',
} as const;
