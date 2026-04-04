/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#1B3A5C',
          700: '#2D5F8A',
          500: '#4A90C4',
          100: '#EAF2FB',
        },
        accent: {
          600: '#F07A2A',
          100: '#FEF0E7',
        },
        success: {
          600: '#0F7B5A',
          100: '#E6F5F0',
        },
        danger: {
          600: '#C0392B',
          100: '#FDECEA',
        },
        warning: {
          600: '#D97706',
          100: '#FEF3C7',
        },
        neutral: {
          900: '#111827',
          700: '#374151',
          500: '#6B7280',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50: '#F9FAFB',
        },
      },
    },
  },
  plugins: [],
};
