/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.jsx',
    './main.jsx',
    './**/*.{js,jsx}',
    '!./node_modules/**',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
