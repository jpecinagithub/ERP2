import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e7ff',
          200: '#b9d2ff',
          300: '#8db3ff',
          400: '#5789ff',
          500: '#2f63f1',
          600: '#1848cf',
          700: '#1538a8',
          800: '#172f83',
          900: '#1a2b67'
        },
        surface: {
          950: '#0a1020',
          900: '#0f172a',
          800: '#172033',
          700: '#25304a'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99, 102, 241, 0.2), 0 16px 40px -12px rgba(15, 23, 42, 0.8)',
        panel: '0 20px 50px -24px rgba(8, 13, 30, 0.9)'
      },
      backgroundImage: {
        'mesh-dark': 'radial-gradient(circle at 8% 10%, rgba(49, 99, 241, 0.22) 0, transparent 38%), radial-gradient(circle at 86% 15%, rgba(14, 165, 233, 0.18) 0, transparent 35%), radial-gradient(circle at 45% 85%, rgba(99, 102, 241, 0.14) 0, transparent 40%)'
      },
      animation: {
        'fade-in': 'fadeIn 350ms ease-out',
        'slide-up': 'slideUp 350ms ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.6' }
        }
      }
    }
  },
  plugins: [forms]
};
