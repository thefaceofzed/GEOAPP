import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#081118",
        steel: "#11222f",
        mist: "#d7e5ef",
        ember: "#f1823a",
        signal: "#67d7f5",
        tide: "#0f2e41",
        surface: {
          DEFAULT: "var(--surface)",
          alt: "var(--surface-alt)",
          raised: "var(--surface-raised)",
        },
        "t-primary": "var(--text-primary)",
        "t-secondary": "var(--text-secondary)",
        "t-tertiary": "var(--text-tertiary)",
        "b-subtle": "var(--border-subtle)",
        "b-default": "var(--border-default)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        "sig-live": "var(--signal-live)",
        "sig-warn": "var(--signal-warn)",
        "sig-danger": "var(--signal-danger)",
        "sig-info": "var(--signal-info)",
      },
      boxShadow: {
        panel: "var(--panel-shadow)",
        card: "var(--card-shadow)",
        raised: "var(--raised-shadow)",
        "glow-accent": "0 0 24px rgba(212, 168, 67, 0.12)",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        body: ["DM Sans", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "Consolas", "monospace"],
      },
      borderRadius: {
        panel: "1.25rem",
        card: "0.875rem",
        btn: "0.625rem",
      },
      backdropBlur: {
        panel: "16px",
      },
    },
  },
  plugins: [],
} satisfies Config;
