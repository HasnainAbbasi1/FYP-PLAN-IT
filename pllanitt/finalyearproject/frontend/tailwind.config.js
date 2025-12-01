/** @type {import('tailwindcss').Config} */

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        base: "#2B4D5F",      
        accent: "#4588AD",
        'accent-light': 'rgba(69, 136, 173, 0.08)',
        'accent-light-border': 'rgba(69, 136, 173, 0.15)',
        'accent-dark': 'rgba(69, 136, 173, 0.1)',
        'accent-dark-border': 'rgba(69, 136, 173, 0.2)',
        white81: "rgba(255, 255, 255, 0.81)",
        
        // CSS Variable mappings for shadcn/ui compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        // Sidebar colors
        sidebar: {
          background: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          'primary-foreground': "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          'accent-foreground': "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        
        // Theme semantic colors
        theme: {
          dark: "hsl(var(--theme-dark))",
          primary: "hsl(var(--theme-primary))",
          secondary: "hsl(var(--theme-secondary))",
          accent: "hsl(var(--theme-accent))",
          highlight: "hsl(var(--theme-highlight))",
          success: "hsl(var(--theme-success))",
          warning: "hsl(var(--theme-warning))",
          danger: "hsl(var(--theme-danger))",
        },
        
        // Text colors
        'text-primary': "hsl(var(--theme-text-primary))",
        'text-secondary': "hsl(var(--theme-text-secondary))",
        'text-muted': "hsl(var(--theme-text-muted))",
        
        // Chart colors
        chart: {
          blue: "hsl(var(--theme-chart-blue))",
          green: "hsl(var(--theme-chart-green))",
          purple: "hsl(var(--theme-chart-purple))",
          orange: "hsl(var(--theme-chart-orange))",
          red: "hsl(var(--theme-chart-red))",
          yellow: "hsl(var(--theme-chart-yellow))",
        },
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
      },
      fontSize: {
        "heading-1": ["24px", { lineHeight: "32px", fontWeight: "700" }], 
        "heading-2": ["20px", { lineHeight: "28px", fontWeight: "600" }], 
        "body": ["16px", { lineHeight: "24px", fontWeight: "400" }],       
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],   
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],  
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'gradient-base': 'linear-gradient(135deg, #2B4D5F 0%, #4588AD 100%)',
        'gradient-base-hover': 'linear-gradient(135deg, #1f3a47 0%, #3a7399 100%)',
        'gradient-primary': 'var(--primary-gradient)',
        'gradient-primary-text': 'var(--primary-gradient-text)',
        'gradient-accent': 'var(--accent-gradient)',
      },
      boxShadow: {
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 20px 40px -10px rgba(69, 136, 173, 0.3)',
        'button': '0 4px 12px rgba(69, 136, 173, 0.4)',
        'button-hover': '0 8px 20px rgba(69, 136, 173, 0.5)',
        'sidebar': '2px 0 8px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        'sidebar': '18rem',
        'sidebar-lg': '20rem',
        'sidebar-xl': '22rem',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'spin': 'spin 1s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1s infinite',
        'grid-move': 'gridMove 20s linear infinite',
        'icon-float': 'iconFloat 3s ease-in-out infinite',
        'pulse-scale': 'pulse 2s ease-out infinite',
        'typing': 'typing 1.4s infinite ease-in-out',
        'loading': 'loading 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeIn: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInLeft: {
          'from': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        slideInRight: {
          'from': {
            opacity: '0',
            transform: 'translateX(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        slideIn: {
          'from': {
            opacity: '0',
            transform: 'translateY(-20px) scale(0.95)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'accordion-down': {
          'from': { height: '0' },
          'to': { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          'from': { height: 'var(--radix-accordion-content-height)' },
          'to': { height: '0' },
        },
        'caret-blink': {
          '0%,100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        gridMove: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(50px, 50px)' },
        },
        iconFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulse: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        typing: {
          '0%, 80%, 100%': { transform: 'scale(0.8)', opacity: '0.5' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        loading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};

