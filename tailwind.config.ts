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
          accent: '#3ef07d',
          'accent-hover': '#2dd869',
        },
      },
    },
  },
  plugins: [],
}

export default config


