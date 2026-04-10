/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './public/index.html',
    './src/**/*.{vue,js}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff6b81',
        'primary-light': '#ff9fad',
        secondary: '#7bed9f',
        accent: '#70a1ff'
      }
    }
  },
  plugins: []
}
