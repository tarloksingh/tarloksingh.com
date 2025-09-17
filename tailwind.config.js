/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'avant-garde': ['ITC Avant Garde Gothic Std', 'sans-serif'],
        'sans': ['ITC Avant Garde Gothic Std', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        '200': '200',  // Extra Light
        '300': '300',  // Book
        '400': '400',  // Medium
        '600': '600',  // Demi
        '700': '700',  // Bold
      }
    },
  },
  plugins: [],
}
