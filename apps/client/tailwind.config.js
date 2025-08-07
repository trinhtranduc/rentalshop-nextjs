/** @type {import('tailwindcss').Config} */
module.exports = {
  ...require('../../tailwind.config.clean.js'),
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} 