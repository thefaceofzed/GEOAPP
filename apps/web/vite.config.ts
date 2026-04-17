import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1900,
    rollupOptions: {
      output: {
        manualChunks: {
          "app-vendor": [
            "react",
            "react-dom",
            "react-router-dom",
            "@tanstack/react-query",
            "axios",
            "zustand",
          ],
          "planet-meta": ["world-countries", "world-atlas/countries-110m.json"],
          "planet-renderer": ["react-globe.gl", "three", "topojson-client"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
