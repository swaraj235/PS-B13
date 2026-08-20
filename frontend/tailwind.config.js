/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050A14',
          900: '#0A0F1E',
          800: '#0D1320',
          700: '#111827',
          600: '#1F2937',
          500: '#374151',
        },
        electric: {
          DEFAULT: '#00D4FF',
          dim: '#0099BB',
          glow: 'rgba(0,212,255,0.3)',
        },
        fault: {
          critical: '#EF4444',
          warning:  '#F59E0B',
          normal:   '#22C55E',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        head:  ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-red':    '0 0 20px rgba(239,68,68,0.4)',
        'glow-green':  '0 0 20px rgba(34,197,94,0.4)',
        'glow-blue':   '0 0 20px rgba(0,212,255,0.3)',
        'glow-amber':  '0 0 20px rgba(245,158,11,0.4)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-red':   'glowRed 2s ease-in-out infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
      },
      keyframes: {
        glowRed: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(239,68,68,0.3)' },
          '50%':      { boxShadow: '0 0 30px rgba(239,68,68,0.7)' },
        },
        slideIn: {
          from: { transform: 'translateX(-10px)', opacity: '0' },
          to:   { transform: 'translateX(0)',     opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
