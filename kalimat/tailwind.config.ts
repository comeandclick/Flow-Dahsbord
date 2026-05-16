import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F8F7F4',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#1a1a2e',
          light: '#2a2a4e',
        },
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1d4ed8',
        },
        success: '#16a34a',
        error: '#dc2626',
        border: '#E5E5E0',
        muted: '#6B7280',
      },
      fontFamily: {
        arabic: ['"Noto Sans Arabic"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
