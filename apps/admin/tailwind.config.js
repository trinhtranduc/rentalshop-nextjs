/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Brand Colors
        'brand': {
          primary: '#0F9347',    // APP_TONE_COLOR
          secondary: '#2B3349',  // APP_TONE_NAV_COLOR
        },
        // Action Colors
        'action': {
          primary: '#008AE8',    // APP_BUTTON_BG_COLOR
          success: '#10B981',
          danger: '#EF4444',
          warning: '#f19920',    // APP_ORANGE_COLOR
        },
        // Text Colors
        'text': {
          primary: '#323334',    // APP_TEXT_COLOR
          secondary: '#6B7280',
          tertiary: '#999999',   // APP_GRAY_COLOR
          inverted: '#FFFFFF',
        },
        // Background Colors
        'bg': {
          primary: '#F5F5F5',    // APP_BG_COLOR
          secondary: '#E7F0F5',  // APP_TONE_LINE_BG_COLOR
          tertiary: '#F9FAFB',
          card: '#FFFFFF',
        },
        // Navigation Colors
        'nav': {
          background: '#2B3349', // APP_TONE_NAV_COLOR
          tint: '#FFFFFF',
        },
        // Border Colors
        'border': {
          DEFAULT: '#E5EAED',    // APP_BORDER_COLOR
        },
        // Status Colors
        'status': {
          active: '#0F9347',
          inactive: '#999999',
          pending: '#f19920',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontWeight: {
        'light': '300',      // Inter-Thin
        'normal': '400',     // Inter-Regular
        'medium': '500',     // Inter-Medium
        'bold': '700',       // Inter-Bold
        'extrabold': '800',  // Inter-Extra-Bold
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 