import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// En GitHub Pages el sitio vive en /<repo>/ (VITE_BASE=/Seguridad_Col_5.0/); en local o servido por la API, "/".
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/sw",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: "Identifica tu fraude",
        short_name: "Identifica",
        description: "Agente de orientación frente al fraude digital: analiza mensajes, enlaces, capturas y audios.",
        lang: "es-CO",
        dir: "ltr",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        scope: base,
        theme_color: "#5b1a8a",
        background_color: "#f5eefb",
        categories: ["security", "utilities"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Recibir mensajes, enlaces y audios desde "Compartir" (Android con la app instalada).
        share_target: {
          action: `${base}compartir`,
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [{ name: "audio", accept: ["audio/*", ".ogg", ".opus", ".m4a", ".mp3", ".aac", ".wav"] }],
          },
        },
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
  preview: { port: 4173 },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // ECharts y Tesseract se cargan aparte para que la primera pantalla sea liviana.
        manualChunks: { echarts: ["echarts/core", "echarts/charts", "echarts/components", "echarts/renderers"] },
      },
    },
  },
});
