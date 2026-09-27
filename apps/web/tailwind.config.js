/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tarmac: {
          DEFAULT: '#0B0F12',
          950: '#070A0C',
          900: '#0B0F12',
          800: '#141A20',
          700: '#1D252E',
          600: '#2A3440',
        },
        parchment: {
          DEFAULT: '#E8ECF0',
          50: '#F7F9FA',
          100: '#EFF2F5',
          200: '#E8ECF0',
          300: '#D5DDE4',
          400: '#BAC6D1',
        },
        cargo: {
          DEFAULT: '#FF6B35',
          400: '#FF8657',
          500: '#FF6B35',
          600: '#E8551F',
          700: '#C74110',
        },
        concourse: {
          DEFAULT: '#1E3A34',
          400: '#2D564D',
          500: '#1E3A34',
          600: '#152925',
          700: '#0D1A17',
        },
        signal: {
          DEFAULT: '#F2C94C',
          400: '#F5D46F',
          500: '#F2C94C',
          600: '#D9B036',
          700: '#B89222',
        },
        iron: {
          DEFAULT: '#263038',
          400: '#3A4854',
          500: '#263038',
          600: '#1C242A',
          700: '#12181C',
        },
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'transit-card': '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.6)',
        'signal-glow': '0 0 16px -2px rgba(242, 201, 76, 0.45)',
        'cargo-glow': '0 0 16px -2px rgba(255, 107, 53, 0.45)',
      },
      animation: {
        'radar-sweep': 'radarSweep 4s linear infinite',
        'stamp-impact': 'stampImpact 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        stampImpact: {
          '0%': { transform: 'scale(2.2) rotate(-15deg)', opacity: '0' },
          '70%': { transform: 'scale(0.95) rotate(-6deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-6deg)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
