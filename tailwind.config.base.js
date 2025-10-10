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
        // Brand Colors - Green Theme (Clean & Less Eye-Straining)
        'brand': {
          primary: '#4CAF50',    // Primary green - softer, less saturated
          secondary: '#81C784',  // Secondary green - pastel
        },
        // Action Colors - Reduced Saturation
        'action': {
          primary: '#4CAF50',    // Main green - same as brand-primary
          success: '#2E7D32',    // Darker green for success
          danger: '#E53935',     // Softer red for danger
          warning: '#FFC107',    // Yellow for warnings
        },
        // Text Colors - Better Contrast
        'text': {
          primary: '#212121',    // Dark gray for headings
          secondary: '#757575',  // Medium gray for descriptions
          tertiary: '#9E9E9E',  // Light gray for tertiary text
          inverted: '#FFFFFF',   // White text
        },
        // Background Colors - Softer, Less Eye-Straining
        'bg': {
          primary: '#F8FAFC',   // Very light blue-gray
          secondary: '#F1F5F9', // Slightly darker background
          tertiary: '#E2E8F0',  // Medium background
          card: '#FFFFFF',      // Pure white for cards
        },
        // Navigation Colors
        'nav': {
          background: '#1E1E1E', // Dark gray for navigation
          tint: '#FFFFFF',       // White text on nav
        },
        // Border Colors - Softer
        'border': {
          DEFAULT: '#E2E8F0',   // Light blue-gray borders
        },
        // Status Colors - Following Your Suggestions
        'status': {
          pending: '#FFC107',    // Yellow - pending
          confirmed: '#4CAF50',  // Green - confirmed
          'in-progress': '#2196F3', // Blue - in progress
          completed: '#2E7D32',  // Dark green - completed
          cancelled: '#F44336',  // Red - cancelled
          overdue: '#E53935',    // Dark red - overdue
          refunded: '#9E9E9E',  // Gray - refunded
          active: '#4CAF50',     // Green - active
          inactive: '#9E9E9E',   // Gray - inactive
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