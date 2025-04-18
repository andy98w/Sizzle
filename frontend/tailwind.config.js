/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f8f7',
          100: '#e0ece9',
          200: '#c2dbd5',
          300: '#9bc3b8',
          400: '#6da596',
          500: '#4e897c',
          600: '#3d6e65',
          700: '#335953',
          800: '#2d4a45',
          900: '#273e3a',
          950: '#142321',
        },
      },
    },
  },
  plugins: [],
}