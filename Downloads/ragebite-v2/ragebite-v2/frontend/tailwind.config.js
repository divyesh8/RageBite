/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rb: {
          fire: '#FF3C1A', gold: '#FFB800', plus: '#00E676',
          bg: '#080808', surface: '#111', card: '#181818',
          border: '#252525', text: '#F2EEE8', muted: '#666',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        mono: ['"Space Mono"', 'monospace'],
        body: ['"Syne"', 'sans-serif'],
      },
      keyframes: {
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        'slide-up': 'slideUp 0.35s ease both',
        'float': 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
