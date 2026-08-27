import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // <-- NEW
import path from "path/win32";
export default defineConfig({
  plugins: [react(), tailwindcss()], // <-- tailwindcss() is NEW
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
