import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "LogoFinal.png"],
      manifest: {
        name: "StockAbastos Móvil",
        short_name: "Stock Móvil",
        description: "App de recepción y traspaso de tarimas",
        theme_color: "#1a3a2a",
        background_color: "#f0f2f5",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/LogoFinal.png", sizes: "192x192", type: "image/png" },
          { src: "/LogoFinal.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5174,
  },
});
