import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Aponta DATABASE_URL/REDIS_URL para a infra de teste antes de qualquer
    // import de src/ — src/config.ts lê o ambiente no momento do import.
    setupFiles: ["./test/helpers/env.ts"],
    // Os testes de integração compartilham um único banco: rodar arquivos em
    // paralelo faria um truncar as tabelas do outro no meio da execução.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
