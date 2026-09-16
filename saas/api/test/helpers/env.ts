/**
 * Roda antes de cada arquivo de teste (setupFiles do Vitest).
 *
 * `src/config.ts` lê `process.env` no momento do import e `src/db/client.ts`
 * abre a conexão a partir dele. Apontar as variáveis aqui, antes de qualquer
 * import dos módulos da API, é o que garante que os testes nunca toquem o
 * banco de desenvolvimento.
 */

process.env.NODE_ENV = "test";

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (process.env.TEST_REDIS_URL) {
  process.env.REDIS_URL = process.env.TEST_REDIS_URL;
}
