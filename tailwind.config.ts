import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        /* One family across every role — the display alias is kept because ~13
           surfaces reference it, but it no longer resolves to a serif. */
        display: ['var(--font-display)', 'Helvetica', 'Arial', 'sans-serif'],
        ui: ['var(--font-ui)', 'Helvetica', 'Arial', 'sans-serif'],
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
        rule: 'var(--hairline)',
        'rule-strong': 'var(--rule-strong)',
        'status-good': 'var(--status-good)',
        'status-wait': 'var(--status-wait)',
        'status-action': 'var(--status-action)',
        'status-idle': 'var(--status-idle)',
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          faint: 'var(--accent-faint)',
          wash: 'var(--accent-wash)',
          on: 'var(--accent-on)',
          hover: 'var(--accent-hover)',
        },
        admin: {
          bg: 'var(--admin-bg)',
          sidebar: 'var(--paper)',
          card: 'var(--admin-surface)',
          text: 'var(--admin-text)',
          muted: 'var(--admin-muted)',
          border: 'var(--admin-hairline)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
        },
      },
      borderRadius: {
        /* 2px maximum, everywhere, including buttons */
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        '3xl': '2px',
      },
    },
  },
  plugins: [],
}

export default config
