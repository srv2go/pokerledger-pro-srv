/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d',950:'#052e16' },
        gold: { 400:'#facc15',500:'#eab308',600:'#ca8a04' },
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
