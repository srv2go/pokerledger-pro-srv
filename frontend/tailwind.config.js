/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
        accent: {
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
        },
        error: {
          400: '#EF5350',
          500: '#F44336',
          600: '#E53935',
        },
        warning: {
          400: '#FFB74D',
          500: '#FF9800',
          600: '#FB8C00',
        },
        success: {
          400: '#81C784',
          500: '#4CAF50',
          600: '#388E3C',
        },
        gold: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04' },
      },
      animation: { 'slide-up':'slideUp .3s ease-out','fade-in':'fadeIn .2s ease-out' },
      keyframes: {
        slideUp: { from:{transform:'translateY(100%)',opacity:0}, to:{transform:'translateY(0)',opacity:1} },
        fadeIn: { from:{opacity:0}, to:{opacity:1} },
      },
    },
  },
  plugins: [],
};
