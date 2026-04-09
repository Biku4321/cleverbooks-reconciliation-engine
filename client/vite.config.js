import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    // Proxy API calls to Express during development
    // so you don't need CORS headers or hardcoded ports in fetch calls
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    // Raise chunk-size warning threshold to 600 KB (recharts is large)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ["react", "react-dom"],
          charts:   ["recharts"],
        },
      },
    },
  },

  // Allow absolute imports from src/
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});