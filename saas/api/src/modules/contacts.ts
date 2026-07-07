import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, ilike, or, desc, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, parse, paginated, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

const ContactBody = z.object({
  name: z.string().min(1).max(128),
  phone: z.string().min(8).max(32).regex(/^\+?[0-9]+$/, "apenas dígitos").optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string().max(32)).max(20).default([]),
});

const ListQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().default(1),
  perPage: z.coerce.number().default(20),
});

export async function contactRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/contacts", async (req) => {
    const { q, page, perPage } = parse(ListQuery, req.query);
    const p = req.principal;
    const { limit, offset } = paginated(page, perPage);
    const where = q
      ? and(
          eq(schema.contacts.companyId, p.companyId),
          or(ilike(schema.contacts.name, `%${q}%`), ilike(schema.contacts.phone, `%${q}%`))
        )
      : eq(schema.contacts.companyId, p.companyId);
    const [rows, [{ count }]] = await Promise.all([
      db.select().from(schema.contacts).where(where).orderBy(desc(schema.contacts.createdAt)).limit(limit).offset(offset),
      db.select({ count: dsql<number>`count(*)::int` }).from(schema.contacts).where(where),
    ]);
    return { data: rows, meta: { page, perPage: limit, total: count } };
  });

  app.post("/contacts", async (req, reply) => {
    const body = parse(ContactBody, req.body);
    const p = req.principal;

    const [company] = await db.select().from(schema.companies).where(eq(schema.companies.id, p.companyId));
    const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, company.planId));
    const [{ count }] = await db
      .select({ count: dsql<number>`count(*)::int` })
      .from(schema.contacts)
      .where(eq(schema.contacts.companyId, p.companyId));
    if (count >= plan.maxContacts) {
      throw new ApiError(402, `Limite de ${plan.maxContacts} contatos do plano ${plan.name} atingido — faça upgrade`);
    }

    try {
      const [contact] = await db
        .insert(schema.contacts)
        .values({ companyId: p.companyId, ...body })
        .returning();
      audit(p, "contact.created", "contact", contact.id);
      return reply.code(201).send(contact);
    } catch (e) {
      if ((e as Error).message.includes("contacts_company_phone_ux")) {
        throw new ApiError(409, "Já existe um contato com esse telefone");
      }
      throw e;
    }
  });

  app.patch("/contacts/:id", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(ContactBody.partial(), req.body);
    const [contact] = await db
      .update(schema.contacts)
      .set(body)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.companyId, req.principal.companyId)))
      .returning();
    if (!contact) throw new ApiError(404, "Contato não encontrado");
    audit(req.principal, "contact.updated", "contact", id, body);
    return contact;
  });

  app.delete("/contacts/:id", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Contato não encontrado");
    audit(req.principal, "contact.deleted", "contact", id);
    return reply.code(204).send();
  });
}
