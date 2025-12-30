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
      },
      keyframes: {
        drip: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px -5px rgba(250, 204, 21, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px -5px rgba(250, 204, 21, 0.6)' },
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

