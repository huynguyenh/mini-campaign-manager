/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#09242E',
        emerald: {
          100: '#C8E6B7',
          200: '#A9DEA7',
          300: '#98D5AB',
          400: '#70D094',
          500: '#43CE81',
          600: '#26BE73',
          700: '#179F65',
          800: '#0B7C54',
          900: '#04563E',
        },
        firefly: {
          100: '#D8EDF5',
          200: '#C0E0EF',
          300: '#478FB4',
          400: '#30637C',
          500: '#1A3645',
          600: '#09242E',
        },
        ecru: {
          100: '#F6F6E8',
          200: '#EEEED7',
          300: '#E3E2BC',
          400: '#D8D7A3',
        },
        severity: {
          low: '#179F65',
          medium: '#EB7E11',
          high: '#F03333',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(9, 36, 46, 0.04), 0 4px 16px rgba(9, 36, 46, 0.06)',
        'card-hover': '0 1px 2px rgba(9, 36, 46, 0.06), 0 8px 24px rgba(9, 36, 46, 0.10)',
      },
    },
  },
  plugins: [],
};
