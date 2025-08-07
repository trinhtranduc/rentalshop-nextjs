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
        // Brand Colors - More Vibrant
        'brand': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',    // Primary - Bright Green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          primary: '#22c55e',    // APP_TONE_COLOR
          secondary: '#1e293b',  // APP_TONE_NAV_COLOR - Slate
        },
        // Action Colors - More Vibrant
        'action': {
          primary: '#3b82f6',    // Bright Blue
          secondary: '#8b5cf6',  // Purple
          success: '#10b981',    // Emerald
          danger: '#ef4444',     // Red
          warning: '#f59e0b',    // Amber
          info: '#06b6d4',       // Cyan
        },
        // Text Colors - Enhanced
        'text': {
          primary: '#1e293b',    // Slate 800
          secondary: '#64748b',  // Slate 500
          tertiary: '#94a3b8',   // Slate 400
          inverted: '#ffffff',
          muted: '#cbd5e1',      // Slate 300
        },
        // Background Colors - Enhanced
        'bg': {
          primary: '#f8fafc',    // Slate 50
          secondary: '#f1f5f9',  // Slate 100
          tertiary: '#e2e8f0',   // Slate 200
          card: '#ffffff',
          dark: '#0f172a',       // Slate 900
        },
        // Navigation Colors
        'nav': {
          background: '#1e293b', // Slate 800
          tint: '#ffffff',
          hover: '#334155',      // Slate 700
        },
        // Border Colors
        'border': {
          DEFAULT: '#e2e8f0',    // Slate 200
          dark: '#cbd5e1',       // Slate 300
          light: '#f1f5f9',      // Slate 100
        },
        // Status Colors - Enhanced
        'status': {
          active: '#22c55e',     // Green
          inactive: '#94a3b8',   // Slate 400
          pending: '#f59e0b',    // Amber
          error: '#ef4444',      // Red
          success: '#10b981',    // Emerald
          warning: '#f59e0b',    // Amber
        },
        // Gradient Colors
        'gradient': {
          primary: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          secondary: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          accent: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          warm: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          cool: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        },
        // Shadcn/ui Colors
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
      // Enhanced Font Options
      fontFamily: {
        // Modern Sans-Serif Options
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'poppins': ['Poppins', 'system-ui', 'sans-serif'],
        'roboto': ['Roboto', 'system-ui', 'sans-serif'],
        'open-sans': ['Open Sans', 'system-ui', 'sans-serif'],
        'nunito': ['Nunito', 'system-ui', 'sans-serif'],
        'montserrat': ['Montserrat', 'system-ui', 'sans-serif'],
        'raleway': ['Raleway', 'system-ui', 'sans-serif'],
        'source-sans': ['Source Sans Pro', 'system-ui', 'sans-serif'],
        
        // Display Fonts for Headings
        'display': ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        'heading': ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        
        // Default Sans
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        
        // Monospace for Code
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      // Enhanced Font Sizes - Larger and More Varied
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
        // Custom Large Sizes
        'hero': ['4rem', { lineHeight: '1.1' }],
        'mega': ['5rem', { lineHeight: '1.1' }],
        'giga': ['6rem', { lineHeight: '1.1' }],
      },
      // Enhanced Font Weights
      fontWeight: {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
      },
      // Enhanced Spacing - Larger Sizes
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
        '192': '48rem',
        '256': '64rem',
      },
      // Enhanced Border Radius
      borderRadius: {
        'none': '0px',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
        // Custom radius
        'large': '1rem',
        'xl-large': '1.5rem',
        '2xl-large': '2rem',
      },
      // Enhanced Shadows
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 10px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      // Enhanced Keyframes
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-gentle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      // Enhanced Animations
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "bounce-gentle": "bounce-gentle 2s infinite",
        "pulse-gentle": "pulse-gentle 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 