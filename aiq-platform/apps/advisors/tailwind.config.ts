import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // AIQ Brand Colors
        bg: {
          DEFAULT: '#0a0f0a',
          secondary: '#0f160f',
          tertiary: '#141c14',
          elevated: '#1a241a',
        },
        gold: {
          DEFAULT: '#c8a84b',
          light: '#d4b86a',
          dark: '#a88a35',
          muted: '#c8a84b33',
        },
        green: {
          DEFAULT: '#3d9e3d',
          light: '#4db54d',
          dark: '#2d7a2d',
          muted: '#3d9e3d22',
        },
        border: {
          DEFAULT: '#1e2a1e',
          subtle: '#162016',
          gold: '#c8a84b33',
        },
        text: {
          primary: '#e8f0e8',
          secondary: '#9aaa9a',
          muted: '#5a6a5a',
          gold: '#c8a84b',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
