/**
 * LinkGuard-inspired dashboard palette: charcoal surfaces + neon green accent.
 * Use dark.* for isDark branches; light.* for light mode.
 */
export const adminTheme = {
  dark: {
    bg: '#080c08',
    sidebar: '#0e110e',
    card: '#1a1d1a',
    text: '#ffffff',
    muted: '#8f9a8f',
    border: '#2d3530',
    surfaceHover: '#2a322a',
    accent: '#3ef07d',
    accentHover: '#2dd869',
    accentOn: '#080c08',
  },
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    muted: '#64748b',
    border: '#e2e8f0',
    surfaceHover: '#f1f5f9',
    accent: '#3ef07d',
    accentHover: '#26c46b',
    accentOn: '#080c08',
  },
} as const;
