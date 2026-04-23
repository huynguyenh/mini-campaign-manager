/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        status: {
          draft: '#9ca3af',
          scheduled: '#3b82f6',
          sending: '#f59e0b',
          sent: '#10b981',
        },
      },
    },
  },
  plugins: [],
};
