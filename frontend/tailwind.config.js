/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TipTune Brand Colors
        'primary-blue': '#6366F1',
        'secondary-indigo': '#4338CA',
        'accent-gold': '#FBBF24',
        'deep-slate': '#1E293B',
        'pure-white': '#FFFFFF',
        // Legacy colors (keeping for compatibility)
        navy: '#0B1C2D',
        'blue-primary': '#4DA3FF',
        'ice-blue': '#6EDCFF',
        mint: '#9BF0E1',
        gold: '#FFD166',
      },
      fontFamily: {
        helvetica: ['Helvetica', 'Arial', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'ui-sans-serif', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      keyframes: {
        // Coin flies upward and fades out
        'coin-fly': {
          '0%': { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: '1' },
          '60%': { opacity: '1' },
          '100%': { transform: 'translateY(-80px) scale(0.5) rotate(var(--coin-rotate, 20deg))', opacity: '0' },
        },
        // Slide in from right with a subtle bounce
        'slide-in-bounce': {
          '0%': { transform: 'translateX(110%)', opacity: '0' },
          '60%': { transform: 'translateX(-8px)', opacity: '1' },
          '80%': { transform: 'translateX(4px)' },
          '100%': { transform: 'translateX(0)' },
        },
        // Quick pop for success states
        'success-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        // Fade and rise from below
        'fade-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Shimmer sweep for loading states
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Ripple ring expanding outward
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        // Rank badge subtle pulse glow
        'rank-glow': {
          '0%, 100%': { boxShadow: '0 0 6px 2px rgba(255,209,102,0.4)' },
          '50%': { boxShadow: '0 0 14px 6px rgba(255,209,102,0.7)' },
        },
        // Checkmark stroke draw
        'draw-check': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        // Blockchain bar fills left to right
        'fill-bar': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        // Currency label flips (Y-axis)
        'flip-in': {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        // Bottom sheet slide up
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Backdrop fade in
        'backdrop-fade': {
          '0%': { backgroundColor: 'rgba(0, 0, 0, 0)' },
          '100%': { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        },
        // Slide down and fade out
        'slide-down-fade': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        // Pulse for loading states
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        // Phone notification slide
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'coin-fly': 'coin-fly 0.7s ease-out forwards',
        'slide-bounce': 'slide-in-bounce 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'success-pop': 'success-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        'fade-up': 'fade-up 0.35s ease-out both',
        'shimmer': 'shimmer 1.5s linear infinite',
        'ripple': 'ripple 0.6s ease-out forwards',
        'rank-glow': 'rank-glow 2s ease-in-out infinite',
        'draw-check': 'draw-check 0.5s ease-out forwards',
        'fill-bar': 'fill-bar 1.8s ease-in-out forwards',
        'flip-in': 'flip-in 0.3s ease-out both',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) both',
        'backdrop-fade': 'backdrop-fade 0.3s ease-out both',
        'slide-down-fade': 'slide-down-fade 0.3s cubic-bezier(0.32, 0.72, 0, 1) both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-down': 'slide-down 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}
