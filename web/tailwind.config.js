/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PrepVerse Brand
        prepverse: {
          red: '#E53935',
          'red-glow': 'rgba(229, 57, 53, 0.4)',
          'red-deep': '#B71C1C',
          'red-light': '#FF6F60',
        },
        // Dark Theme
        void: '#0A0A0C',
        deep: '#121218',
        surface: '#1A1A24',
        elevated: '#252532',
        hover: '#2E2E3D',
        // Accents
        electric: '#00FFD1',
        plasma: '#B388FF',
        solar: '#FFD54F',
        cosmic: '#536DFE',
        // Subject Colors
        math: '#FF6B6B',
        physics: '#4ECDC4',
        chemistry: '#9B59B6',
        biology: '#27AE60',
        science: '#3498DB', // Class 10 combined science (blue)
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display-lg': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['3.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-sm': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading-lg': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading-md': ['1.5rem', { lineHeight: '1.4' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.5' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'label': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(229, 57, 53, 0.3)',
        'glow-md': '0 0 20px rgba(229, 57, 53, 0.4), 0 0 40px rgba(229, 57, 53, 0.2)',
        'glow-lg': '0 0 30px rgba(229, 57, 53, 0.5), 0 0 60px rgba(229, 57, 53, 0.3)',
        'inner-glow': 'inset 0 0 30px rgba(229, 57, 53, 0.1)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 12px 48px rgba(229, 57, 53, 0.15)',
      },
      backgroundImage: {
        'gradient-verse': 'linear-gradient(135deg, #0A0A0C 0%, #1a0a0f 50%, #121218 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-cosmic': 'linear-gradient(180deg, rgba(83, 109, 254, 0.1) 0%, rgba(179, 136, 255, 0.1) 100%)',
        'gradient-brand': 'linear-gradient(135deg, #E53935 0%, #FF6F60 50%, #FFD54F 100%)',
        'gradient-dark': 'linear-gradient(180deg, #1A1A24 0%, #0A0A0C 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'spin-slow': 'spin 20s linear infinite',
        'bounce-subtle': 'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snap': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
}
