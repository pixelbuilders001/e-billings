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
          850: '#520014',
          900: '#3D0010', // Imperial Burgundy
          950: '#220008', // Deep Obsidian Maroon
        },
        ivory: {
          DEFAULT: '#FCFBF7',
          dark: '#F5F2EB',
          border: '#E8E2D5',
        },
        gold: {
          light: '#FDF4D4',
          DEFAULT: '#D4AF37',
          dark: '#AA820A',
          amber: '#F59E0B',
        }
      },
      boxShadow: {
        'luxury': '0 10px 30px -5px rgba(61, 0, 16, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'luxury-lg': '0 20px 40px -10px rgba(61, 0, 16, 0.12), 0 6px 18px -3px rgba(0, 0, 0, 0.06)',
        'gold-glow': '0 0 25px -3px rgba(212, 175, 55, 0.35)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
