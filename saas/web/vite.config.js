/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    // O cliente HTTP guarda tokens no localStorage, então os testes precisam
    // de DOM — não dá para rodar no ambiente node.
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
});
