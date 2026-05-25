import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#c9a84c",
          light: "#e8c87a",
          dim: "rgba(201,168,76,0.25)",
          glow: "rgba(201,168,76,0.12)",
          muted: "#8a7035",
        },
        surface: {
          50: "#1e1e1e",
          100: "#161616",
          200: "#111111",
          300: "#0d0d0d",
          400: "#080808",
          500: "#070707",
        },
        cream: "#f0ece0",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-gold": "pulse-gold 2.5s ease-in-out infinite",
        shimmer: "shimmer 2.2s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out forwards",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(201,168,76,0.5), 0 0 20px rgba(201,168,76,0.3)",
          },
          "50%": {
            boxShadow:
              "0 0 0 1px #c9a84c, 0 0 40px rgba(201,168,76,0.55), 0 0 80px rgba(201,168,76,0.15)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #c9a84c 0%, #e8c87a 50%, #c9a84c 100%)",
        "surface-gradient":
          "linear-gradient(180deg, #111111 0%, #070707 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
