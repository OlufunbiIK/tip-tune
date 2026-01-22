/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1C2D',
        'blue-primary': '#4DA3FF',
        'ice-blue': '#6EDCFF',
        mint: '#9BF0E1',
        gold: '#FFD166',
      },
    },
  },
  plugins: [],
}
