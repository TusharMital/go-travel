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
          950: '#050709',
          900: '#0B0F12',
          850: '#141A1F',
          800: '#1E252B',
          700: '#263038',
          600: '#37444F',
          500: '#5A6874',
          400: '#8C9BA8',
          300: '#C5D0D9',
        },
        cargo: {
          600: '#CC4F1E',
          550: '#E85D26',
          500: '#FF6B35',
          400: '#FF8859',
          300: '#FFA580',
        },
        pine: {
          950: '#0C1715',
          900: '#132622',
          800: '#1E3A34',
          700: '#2A524A',
          600: '#396E63',
          500: '#52988B',
        },
        parchment: {
          50: '#FFFFFF',
          100: '#FAF9F5',
          200: '#F2EFE9',
          300: '#E8ECF0',
          400: '#D5D2C7',
          500: '#B8B4A7',
        },
        signal: {
          amber: '#F2C94C',
          green: '#27AE60',
        }
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
