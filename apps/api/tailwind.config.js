/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          primary: '#0F9347',
          secondary: '#2B3349',
        },
        'action': {
          primary: '#008AE8',
          success: '#10B981',
          danger: '#EF4444',
          warning: '#f19920',
        },
      },
    },
  },
  plugins: [],
} 