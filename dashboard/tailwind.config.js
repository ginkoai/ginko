/**
 * @fileType: config
 * @status: current
 * @updated: 2025-12-09
 * @tags: [tailwind, css, styling, ui, theme, design-system, ginko-brand]
 * @related: [globals.css, layout components, components/ui/]
 * @priority: high
 * @complexity: low
 * @dependencies: [tailwindcss, shadcn/ui]
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Shadcn/UI semantic colors (from CSS variables)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Ginko Brand Palette - Direct hex values for convenience
        ginko: {
          green: '#C1F500',
          'green-hover': '#addc00',
          'green-dark': '#99c200',
          'green-light': 'rgba(193, 245, 0, 0.15)',
          bg: '#31332B',
          surface: '#101010',
          'surface-hover': '#1a1a1a',
          text: '#FAFAFA',
          'text-secondary': '#C5C5B8',
          'text-tertiary': '#9A9A8A',
          border: '#2a2a2a',
          'border-strong': '#3a3a3a',
        },

        // Terminal colors
        terminal: {
          bg: '#101010',
          header: '#1a1a1a',
          text: '#D4D4D4',
          prompt: '#C1F500',
          comment: '#737373',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Spacing scale aligned with marketing site (extends Tailwind defaults)
      spacing: {
        '4.5': '1.125rem', // 18px - between 4 and 5
        '13': '3.25rem',   // 52px
        '15': '3.75rem',   // 60px
        '18': '4.5rem',    // 72px
      },
      // Shadows using CSS variables for dark mode optimization
      boxShadow: {
        'ginko-sm': 'var(--shadow-sm)',
        'ginko-md': 'var(--shadow-md)',
        'ginko-lg': 'var(--shadow-lg)',
        'ginko-xl': 'var(--shadow-xl)',
      },
      // Transition durations aligned with marketing site
      transitionDuration: {
        'fast': '150ms',
        'base': '250ms',
        'slow': '350ms',
      },
      transitionTimingFunction: {
        'ginko': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
