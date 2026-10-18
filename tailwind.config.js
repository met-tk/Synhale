/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        titanium: {
          950: '#0a0b0d',
          900: '#121418',
          800: '#1a1d24',
          700: '#262a34',
          600: '#3b4252',
        },
      },
    },
  },
  plugins: [],
};
