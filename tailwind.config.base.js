/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
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
        // Brand Colors - Green Theme
        'brand': {
          primary: '#22C55E',    // Green 500 - primary green
          secondary: '#4ADE80',  // Green 400 - lighter green
          dark: '#15803D',       // Green 700 - deep green
          light: '#86EFAC',      // Green 300 - light green
          lightest: '#DCFCE7',   // Green 100 - very light green background
        },
        // Action Colors - Green Theme
        'action': {
          primary: '#22C55E',    // Green 500 (same as brand primary)
          success: '#10B981',    // Emerald green
          danger: '#EF4444',     // Red
          warning: '#F59E0B',    // Amber
          info: '#3B82F6',       // Blue 500
        },
        // Text Colors - Ocean Blue Theme
        'text': {
          primary: '#1E293B',    // Slate 800 - main text
          secondary: '#64748B',  // Slate 500 - secondary text
          tertiary: '#94A3B8',   // Slate 400 - tertiary text
          inverted: '#FFFFFF',   // White text
          muted: '#CBD5E1',      // Slate 300 - muted text
        },
        // Background Colors - Ocean Blue Theme
        'bg': {
          primary: '#F8FAFC',    // Slate 50 - main background
          secondary: '#F1F5F9',  // Slate 100 - secondary background
          tertiary: '#E2E8F0',   // Slate 200 - tertiary background
          card: '#FFFFFF',       // White - card background
          dark: '#0F172A',       // Slate 900 - dark background
        },
        // Navigation Colors - Green Theme
        'nav': {
          background: '#0F172A',      // Dark slate
          backgroundHover: '#1E293B', // Slate 800
          text: '#FFFFFF',            // White
          textActive: '#86EFAC',      // Green 300 - light green
          textHover: '#DCFCE7',       // Green 100 - very light green
          border: '#334155',          // Slate 700
          icon: '#94A3B8',            // Slate 400
          iconActive: '#22C55E',      // Green 500
        },
        // Border Colors - Green Theme
        'border': {
          DEFAULT: '#E2E8F0',    // Slate 200
          light: '#F1F5F9',      // Slate 100
          dark: '#CBD5E1',       // Slate 300
          focus: '#22C55E',      // Green 500
        },
        // Status Colors - Green Theme
        'status': {
          // Order statuses
          reserved: '#3B82F6',   // Blue 500
          pickuped: '#F59E0B',   // Amber 500
          returned: '#10B981',   // Emerald 500
          completed: '#6366F1',  // Indigo 500
          cancelled: '#EF4444',  // Red 500
          // General statuses
          pending: '#F59E0B',    // Amber 500
          active: '#22C55E',     // Green 500
          inactive: '#64748B',   // Slate 500
          success: '#22C55E',    // Green 500
          warning: '#F59E0B',    // Amber 500
          error: '#EF4444',      // Red 500
          info: '#3B82F6',       // Blue 500
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
        "progress": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "circular-progress": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "25" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "progress": "progress 1.5s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "circular-progress": "circular-progress 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 