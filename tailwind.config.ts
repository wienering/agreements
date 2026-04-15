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
      colors: {
        admin: {
          bg: '#080c08',
          sidebar: '#0e110e',
          card: '#1a1d1a',
          muted: '#8f9a8f',
          border: '#2d3530',
          accent: '#4a9e72',
          'accent-hover': '#3d8560',
        },
        /** Softer than default Tailwind emerald (less neon) — used by portal & marketing */
        emerald: {
          50: '#f0f7f3',
          100: '#dceee3',
          200: '#b8dcc8',
          300: '#8fc4a8',
          400: '#6aa88a',
          500: '#4a9e72',
          600: '#438a66',
          700: '#3d8560',
          800: '#2f6b4d',
          900: '#234d3a',
          950: '#122920',
        },
      },
    },
  },
  plugins: [],
}

export default config


