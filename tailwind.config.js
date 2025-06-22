/** @type {import('tailwindcss').Config} */
module.exports = {
  // Modo oscuro basado en clase
  darkMode: 'class',
  
  // Configuración optimizada de purga de CSS
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  
  theme: {
    // Contenedor centrado con padding responsivo
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
      },
    },
    
    extend: {
      // Paleta de colores semántica optimizada
      colors: {
        primary: {
          50: '#f8f9ff',
          100: '#e8eaff',
          200: '#c5caff',
          300: '#a2a9ff',
          400: '#7f89ff',
          500: '#5c68ff',
          600: '#3947ff',
          700: '#1627ff',
          800: '#0012f2',
          900: '#000ec5',
          DEFAULT: '#5c68ff',
          dark: '#3947ff',
          light: '#e8eaff',
        },
        secondary: '#6366f1',
        accent: '#f59e0b',
        neutral: {
          light: '#f3f4f6',
          DEFAULT: '#6b7280',
          dark: '#1f2937',
        },
        success: '#10b981',
        warning: '#f97316',
        error: '#ef4444',
      },

      // Fuentes optimizadas
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },

      // Espaciados personalizados comunes
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },

      // Breakpoints optimizados
      screens: {
        '2xl': '1400px',
      },
      
      // Animaciones optimizadas y reducidas
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-200%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-slow': 'pulse 2s infinite',
      },
    },
  },

  // Plugins para funcionalidad adicional
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
  
  // Optimizaciones para producción
  experimental: {
    optimizeUniversalDefaults: true,
  },
}; 