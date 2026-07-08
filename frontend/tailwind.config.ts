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
        // "Trade Paper" design system
        paper: "#f7f3ec",
        card: "#fffdf9",
        "card-alt": "#f2ede2",
        ink: "#1a160f",
        body: "#3a352b",
        muted: "#5c564a",
        faint: "#837b6c",
        ghost: "#b3aa99",
        accent: {
          DEFAULT: "#c94f32",
        },
        pursue: "#2f7d52",
        caution: "#a97a1c",
        pass: "#c94f32",
        "web-source": "#5878a0",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "fq-up": "fq-up 0.6s ease both",
        "fq-dot": "fq-dot 1.6s ease infinite",
        "fq-shimmer": "fq-shimmer 2.2s linear infinite",
        "fq-blink": "fq-blink 1s step-end infinite",
        "fq-float": "fq-float 5s ease-in-out infinite",
      },
      keyframes: {
        "fq-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fq-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".25" },
        },
        "fq-shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "fq-blink": {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "fq-float": {
          "0%, 100%": { transform: "rotate(1.6deg) translateY(0)" },
          "50%": { transform: "rotate(1.6deg) translateY(-7px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
