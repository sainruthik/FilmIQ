import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Values live in app/globals.css per data-theme.
      colors: {
        paper: "var(--paper)",
        sheet: "var(--sheet)",
        ink: "var(--ink)",
        graphite: "var(--graphite)",
        rule: "var(--rule)",
        goldenrod: "var(--goldenrod)",
        cherry: "var(--cherry)",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        doc: ["var(--font-doc)", "Courier New", "monospace"],
      },
      // Major third on 16px, 13px floor.
      fontSize: {
        "13": "0.8125rem",
        "16": "1rem",
        "20": "1.25rem",
        "25": "1.5625rem",
        "31": "1.9375rem",
        "39": "2.4375rem",
        display: "clamp(2.4375rem, 1.6rem + 3.4vw, 3.8rem)",
      },
      spacing: {
        "18": "4.5rem",
      },
      borderRadius: {
        DEFAULT: "2px",
      },
      boxShadow: {
        sheet: "var(--shadow-sheet)",
      },
    },
  },
  plugins: [],
};

export default config;
