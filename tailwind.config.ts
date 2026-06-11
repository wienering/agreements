import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Semantic tokens — resolve per data-surface in globals.css */
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        coral: 'var(--coral)',
        gold: 'var(--gold)',
        panel: 'var(--panel)',
        hairline: 'var(--hairline)',
        muted: 'var(--muted)',
        surface: 'var(--admin-surface)',
        'surface-raised': 'var(--admin-surface-raised)',
        success: 'var(--success)',
        warn: 'var(--warn)',
        alert: 'var(--alert)',
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          faint: 'var(--accent-faint)',
        },
        admin: {
          bg: 'var(--admin-bg)',
          sidebar: 'var(--admin-surface)',
          card: 'var(--admin-surface)',
          text: 'var(--admin-text)',
          muted: 'var(--admin-muted)',
          border: 'var(--admin-hairline)',
          accent: 'var(--gold)',
          'accent-hover': 'var(--gold)',
        },
      },
    },
  },
  plugins: [],
}

export default config
