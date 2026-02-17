/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-blue': '#00D9FF',
        'cyber-dark': '#0A1628',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0, 217, 255, 0.5)',
        'neon-blue-lg': '0 0 30px rgba(0, 217, 255, 0.6)',
      },
    },
  },
  plugins: [],
}
