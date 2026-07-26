import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import postgres from "postgres";

/**
 * Banco dos testes de integração.
 *
 * Os testes rodam contra um Postgres de verdade, não contra um mock: o que
 * eles verificam — isolamento entre empresas — é justamente o que um mock de
 * banco não conseguiria provar, porque a garantia está nos `where companyId`
 * das queries.
 *
 * O endereço vem de TEST_DATABASE_URL. Sem essa variável os testes de
 * integração não rodam (veja `hasTestDatabase`), e quem chama avisa em vez de
 * passar em silêncio.
 */

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDatabase = Boolean(TEST_DATABASE_URL);

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Cria as tabelas no banco de teste a partir do schema Drizzle. */
export function pushSchema(): void {
  execFileSync("npx", ["drizzle-kit", "push", "--force"], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}

/**
 * Esvazia as tabelas entre os testes.
 *
 * TRUNCATE ... CASCADE em vez de DELETE porque as tabelas têm chaves
 * estrangeiras entre si e a ordem de remoção importaria. `plans` fica de fora:
 * é tabela de referência, semeada uma vez.
 */
export async function truncateAll(sql: postgres.Sql): Promise<void> {
  const rows = await sql<{ tablename: string }[]>`
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> 'plans'
  `;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(", ");
  await sql.unsafe(`truncate table ${list} restart identity cascade`);
}

/** Garante o plano `free`, que o signup referencia por chave estrangeira. */
export async function seedPlans(sql: postgres.Sql): Promise<void> {
  await sql`
    insert into plans (id, name, price_cents, max_users, max_channels, max_contacts, max_monthly_messages, features)
    values ('free', 'Free', 0, 3, 1, 500, 1000, '[]'::jsonb)
    on conflict (id) do nothing
  `;
}
