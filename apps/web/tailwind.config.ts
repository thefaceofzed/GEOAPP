import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#081118",
        steel: "#11222f",
        mist: "#d7e5ef",
        ember: "#f1823a",
        signal: "#67d7f5",
        tide: "#0f2e41",
      },
      boxShadow: {
        panel: "0 24px 60px rgba(0, 0, 0, 0.35)",
      },
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "sans-serif"],
        body: ["Outfit", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
