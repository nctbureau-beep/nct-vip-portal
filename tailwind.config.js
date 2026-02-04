/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a365d', light: '#2d5a87' },
        accent: { DEFAULT: '#d4a574', light: '#e8c9a0' },
      },
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Noto Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
