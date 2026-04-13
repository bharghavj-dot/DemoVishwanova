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
        'glow-teal': '0 0 20px rgba(0, 212, 170, 0.4), 0 0 40px rgba(0, 212, 170, 0.15)',
        'glow-primary': '0 0 20px rgba(27, 77, 75, 0.3), 0 0 40px rgba(27, 77, 75, 0.1)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(.25,.46,.45,.94) both',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(.25,.46,.45,.94) both',
        'fade-in-down': 'fadeInDown 0.5s cubic-bezier(.25,.46,.45,.94) both',
        'slide-up': 'slideUp 0.6s cubic-bezier(.25,.46,.45,.94) both',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.4s cubic-bezier(.25,.46,.45,.94) both',
        'pulse-glow': 'pulseGlow 2s infinite',
        'progress': 'progress 1s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out infinite reverse',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'stagger-1': 'fadeInUp 0.6s cubic-bezier(.25,.46,.45,.94) 0.1s both',
        'stagger-2': 'fadeInUp 0.6s cubic-bezier(.25,.46,.45,.94) 0.2s both',
        'stagger-3': 'fadeInUp 0.6s cubic-bezier(.25,.46,.45,.94) 0.3s both',
        'stagger-4': 'fadeInUp 0.6s cubic-bezier(.25,.46,.45,.94) 0.4s both',
        'stagger-5': 'fadeInUp 0.6s cubic-bezier(.25,.46,.45,.94) 0.5s both',
        'stagger-6': 'fadeInUp 0.6s cubic-bezier(.25,.46,.45,.94) 0.6s both',
        'count-up': 'countUp 1s ease-out both',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(.25,.46,.45,.94) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
          '0%': { opacity: '0', transform: 'scale(0.9)' },
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
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-15px) rotate(1deg)' },
          '66%': { transform: 'translateY(8px) rotate(-1deg)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'clinical': 'cubic-bezier(.25,.46,.45,.94)',
      },
    },
  },
  plugins: [],
}
