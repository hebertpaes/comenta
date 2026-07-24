import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

/**
 * Configurações gerais da empresa. Guardadas em `companies.settings` (jsonb).
 * Leitura: qualquer usuário logado. Escrita: só admin.
 *
 * Campos suportados hoje:
 *  - widgetKnowledge: base de conhecimento do assistente do chat do site.
 */
const SettingsBody = z.object({
  widgetKnowledge: z.string().max(8000).optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/settings", async (req) => {
    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, req.principal.companyId));
    return { settings: company?.settings ?? {} };
  });

  app.put("/settings", { preHandler: requireAdmin }, async (req) => {
    const body = parse(SettingsBody, req.body);
    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, req.principal.companyId));
    if (!company) throw new ApiError(404, "Empresa não encontrada");
    const merged = { ...(company.settings as Record<string, unknown>), ...body };
    await db.update(schema.companies).set({ settings: merged }).where(eq(schema.companies.id, req.principal.companyId));
    audit(req.principal, "settings.update", "company", req.principal.companyId);
    return { settings: merged };
  });
}

/** Lê a base de conhecimento do widget definida pela empresa (ou null). */
export async function companyWidgetKnowledge(companyId: string): Promise<string | null> {
  const [company] = await db
    .select({ settings: schema.companies.settings })
    .from(schema.companies)
    .where(eq(schema.companies.id, companyId));
  const kb = (company?.settings as Record<string, unknown> | undefined)?.widgetKnowledge;
  return typeof kb === "string" && kb.trim() ? kb : null;
}
