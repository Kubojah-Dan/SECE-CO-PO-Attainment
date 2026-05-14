/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#0F1235',
          900: '#1A1F4E',
          700: '#2E3580',
          500: '#4A52A3',
          300: '#9398B0',
          100: '#E8EAF2',
          50:  '#F5F6FD',
        },
        teal: {
          600: '#0D6E5A',
          400: '#1D9E88',
          50:  '#E0F7F2',
        },
        amber: {
          700: '#8A5200',
          400: '#B7760A',
          50:  '#FEF4E4',
        },
        surface: '#F7F8FA',
        white:   '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'input': '8px',
        'card':  '10px',
        'panel': '14px',
      },
      fontSize: {
        base: ['14px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
}
