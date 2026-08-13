import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        cinema: {
          dark: '#020617',
          card: '#0f172a',
          accent: '#fbbf24',
        },
        /** Zenda product brand (from official logo SVG) */
        zenda: {
          primary: '#3534C9',
          dark: '#1E2070',
          deep: '#030412',
          light: '#5B5AD6',
          muted: '#3C3BD4',
          container: '#E8E8FA',
          growth: '#4DB83D',
          growthDark: '#2D9B3A',
          growthLight: '#6BC962',
          growthContainer: '#E8F8E6',
          navy: '#05050B',
          navyMid: '#11145A',
          bg: '#F7F7FA',
          surface: '#FFFFFF',
          expense: '#E53935',
          debt: '#E67E22',
          warning: '#E67E22',
          text: '#05050B',
          textSecondary: '#5B6178',
          border: '#E2E4EF',
        },
        primary: {
          50: '#E8E8FA',
          100: '#D4D4F5',
          200: '#A9A8EB',
          300: '#7E7DE0',
          400: '#5B5AD6',
          500: '#3534C9',
          600: '#2C2BA8',
          700: '#1E2070',
          800: '#11145A',
          900: '#030412',
        },
      },
    },
  },
  plugins: [],
}
export default config
