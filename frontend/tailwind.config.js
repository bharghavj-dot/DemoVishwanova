/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e6f0f0',
          100: '#b3d4d3',
          200: '#80b8b6',
          300: '#4d9c99',
          400: '#26867d',
          500: '#1B4D4B',
          600: '#174241',
          700: '#133837',
          800: '#0f2d2d',
          900: '#0b2323',
        },
        clinical: {
          bg: '#F0F4F4',
          card: '#FFFFFF',
          border: '#E2E8E8',
          muted: '#94A3A8',
          text: '#1A2C2C',
          subtle: '#F7FAFA',
        },
        accent: {
          teal: '#00D4AA',
          purple: '#9B8FE8',
          amber: '#D4A017',
          red: '#DC4444',
          green: '#22C55E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'clinical': '0 2px 12px rgba(27, 77, 75, 0.08)',
        'clinical-lg': '0 8px 32px rgba(27, 77, 75, 0.12)',
        'clinical-hover': '0 12px 40px rgba(27, 77, 75, 0.16)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'progress': 'progress 1s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 212, 170, 0.4)' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
      },
    },
  },
  plugins: [],
}
