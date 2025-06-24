/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        snapYellow: '#FFD700',
        snapBlue: '#0CADE6',
        snapPurple: '#7C3AED',
        snapBlack: '#000000',
        snapGray: '#1a1a1a',
      },
    },
  },
  plugins: [],
} 