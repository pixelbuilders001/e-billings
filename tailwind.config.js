/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDFBF7',
          100: '#F9F4EB',
          200: '#F1E6D3',
          300: '#E4CFB0',
          400: '#D4AF37', // Gold accent
          500: '#B8860B', // Dark golden rod
          600: '#991B1B', // Red maroon
          700: '#800020', // Royal Maroon / Burgundy
          800: '#660019', // Deep Maroon
          900: '#4D0013', // Very deep Maroon
          950: '#2A000A',
        },
        ivory: {
          DEFAULT: '#FCFBF7',
          dark: '#F5F2EB',
          border: '#E8E2D5',
        },
        gold: {
          light: '#F3E5AB',
          DEFAULT: '#D4AF37',
          dark: '#AA820A',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
