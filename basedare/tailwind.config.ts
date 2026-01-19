import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme"; // Correct v4/v3 compat import

const config: Config = {
  darkMode: "class", // Changed from ["class"] to "class"
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        // Additional font families preserved
        serif: ["var(--font-cinzel)", ...defaultTheme.fontFamily.serif],
        inter: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // THE VOID
        background: "#020204", 
        foreground: "#ffffff",
        
        // BASEDARE BRAND
        brand: {
          gold: "#FACC15",    // Toxic Gold
          purple: "#A855F7",  // Neon Purple
          void: "#050505",    // Card Background
          error: "#EF4444",   // Fail Red
        },
      },
      backgroundImage: {
        'honey-gradient': 'linear-gradient(180deg, rgba(250, 204, 21, 0.2) 0%, rgba(2, 2, 4, 0) 100%)',
        'glass-shine': 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%)',
      },
      boxShadow: {
        'neon-gold': '0 0 20px -5px rgba(250, 204, 21, 0.4)',
        'neon-purple': '0 0 20px -5px rgba(168, 85, 247, 0.4)',
      },
      animation: {
        'drip': 'drip 3s infinite ease-in-out',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'chrome-shine': 'chromeShine 5s ease-in-out infinite',
        'chromeFlow': 'chromeFlow 12s ease-in-out infinite',
        'spotlightPulse': 'spotlightPulse 8s ease-in-out infinite alternate',
        'float-slow': 'float 6s ease-in-out infinite',
        'god-pulse': 'godPulse 8s ease-in-out infinite',
        'basketball-bounce': 'basketballBounce 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        drip: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px -5px rgba(250, 204, 21, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px -5px rgba(250, 204, 21, 0.6)' },
        },
        chromeShine: {
          '0%, 100%': { backgroundPosition: '200% center' },
          '50%': { backgroundPosition: '-200% center' },
        },
        chromeFlow: {
          '0%, 100%': { backgroundPosition: '50% 50%' },
          '50%': { backgroundPosition: '100% 100%' },
        },
        spotlightPulse: {
          '0%': { opacity: '0.6', transform: 'translate(-50%, -50%) scale(1)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }, // Moves up 20px
        },
        godPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.1)' },
        },
        basketballBounce: {
          '0%': {
            transform: 'translateY(0) scaleY(1) scaleX(1)',
          },
          '20%': {
            transform: 'translateY(-80px) scaleY(0.85) scaleX(1.1)', // Big rebound + squash/stretch
          },
          '40%': {
            transform: 'translateY(0) scaleY(1.15) scaleX(0.9)', // Hit + stretch
          },
          '55%': {
            transform: 'translateY(-40px) scaleY(0.95) scaleX(1.05)', // Medium bounce
          },
          '70%': {
            transform: 'translateY(0) scaleY(1.05) scaleX(0.95)',
          },
          '85%': {
            transform: 'translateY(-15px)',
          },
          '100%': {
            transform: 'translateY(0) scaleY(1) scaleX(1)',
          },
        },
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

