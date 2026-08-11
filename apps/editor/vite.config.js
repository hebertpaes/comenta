import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O FFmpeg.wasm (versão multithread) usa SharedArrayBuffer, que exige
// que a página seja "cross-origin isolated". Por isso definimos os
// cabeçalhos COOP/COEP tanto no servidor de dev quanto no de preview.
const crossOriginIsolation = {
  name: "cross-origin-isolation",
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((_req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), crossOriginIsolation],
  optimizeDeps: {
    // Evita que o Vite tente pré-empacotar os binários wasm do FFmpeg.
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
});
