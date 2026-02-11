/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'binance-bg-primary': '#0b0e11',
        'binance-bg-secondary': '#181a20',
        'binance-bg-tertiary': '#1e2329',
        'binance-text-primary': '#eaecef',
        'binance-text-secondary': '#848e9c',
        'binance-yellow': '#f0b90b',
        'binance-yellow-hover': '#fcd535',
        'binance-border': '#2b3139',
        'binance-success': '#0ecb81',
        'binance-danger': '#f6465d',
      },
    },
  },
  plugins: [],
}
