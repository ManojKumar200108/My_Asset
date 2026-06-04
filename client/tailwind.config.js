/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a360e',
          900: '#7c2d12',
        },
        primary: '#f97316',
        'primary-dark': '#ea580c',
        'primary-light': '#fed7aa',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'md': '0 4px 16px rgba(249, 115, 22, 0.12)',
        'lg': '0 8px 24px rgba(249, 115, 22, 0.15)',
        'xl': '0 16px 36px rgba(249, 115, 22, 0.2)',
      },
    },
  },
  plugins: [],
}
