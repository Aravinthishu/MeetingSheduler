// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Important: use class-based dark mode
  theme: {
    extend: {
      colors: {
        // Existing dark theme colors (unchanged)
        navy: {
          50: '#e8f0f9',
          100: '#c5d6ed',
          200: '#9fb8df',
          300: '#7999d1',
          400: '#5a80c6',
          500: '#3b67bb',
          600: '#2e5299',
          700: '#1f3d73',
          800: '#0f244a',
          900: '#0a1a33',
        },
        blue: {
          primary: '#388add',
          light: '#6bb3f0',
          lighter: '#c2e0ff',
          dark: '#2a6bb0',
          darker: '#1a4a80',
        },
        // Light theme colors (optional - can just use Tailwind built-in colors)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}