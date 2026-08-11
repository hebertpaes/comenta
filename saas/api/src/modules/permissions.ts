import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

/**
 * Módulo de Gerenciamento de Permissões & Níveis de Acesso (RBAC)
 */

export const ALL_PERMISSIONS = [
  { id: "view_dashboard", label: "📊 Visualizar Dashboard & Métricas", category: "Geral" },
  { id: "manage_conversations", label: "💬 Atender & Gerenciar Conversas", category: "Atendimento" },
  { id: "manage_kanban", label: "📋 Mover & Editar Cards no Kanban", category: "Vendas / CRM" },
  { id: "manage_contacts", label: "👥 Criar & Editar Contatos/Leads", category: "Contatos" },
  { id: "manage_team", label: "🧑‍💼 Cadastrar & Gerenciar Usuários", category: "Equipe" },
  { id: "manage_flowbuilder", label: "⚡ Criar & Editar Fluxos FlowBuilder IA", category: "Automação" },
  { id: "manage_automations", label: "🤖 Configurar Robôs & Regras de Atendimento", category: "Automação" },
  { id: "manage_campaigns", label: "📣 Disparar Campanhas de Mensagens", category: "Marketing" },
  { id: "manage_courses", label: "🎓 Gerenciar Cursos & Videoaulas", category: "Educação" },
  { id: "manage_integrations", label: "🪝 Configurar Hotmart, ABACS, Kiwify & Meta", category: "Integrações" },
  { id: "manage_apikeys", label: "🔑 Criar & Revogar Chaves de API", category: "Segurança" },
  { id: "manage_settings", label: "⚙️ Alterar Configurações Globais", category: "Configurações" }
];

export const DEFAULT_ROLES = [
  {
    id: "role_admin",
    name: "Administrador Geral",
    description: "Acesso ilimitado a todos os módulos, configurações e financeiro.",
    permissions: ALL_PERMISSIONS.map((p) => p.id)
  },
  {
    id: "role_supervisor",
    name: "Supervisor de Atendimento",
    description: "Gerencia atendentes, conversas, Kanban, contatos e relatórios.",
    permissions: ["view_dashboard", "manage_conversations", "manage_kanban", "manage_contacts", "manage_team", "manage_courses"]
  },
  {
    id: "role_agent",
    name: "Atendente Comercial / Suporte",
    description: "Responde conversas atribuídas, move cards no Kanban e visualiza contatos.",
    permissions: ["view_dashboard", "manage_conversations", "manage_kanban", "manage_contacts"]
  },
  {
    id: "role_marketing",
    name: "Gestor de Marketing",
    description: "Acesso a campanhas em massa, FlowBuilder IA, robôs e relatórios.",
    permissions: ["view_dashboard", "manage_contacts", "manage_flowbuilder", "manage_automations", "manage_campaigns"]
  }
];

export async function permissionsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireAdmin);

  // Lista permissões disponíveis e cargos configurados
  app.get("/permissions", async (req) => {
    const { companyId } = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, companyId));

    const settingsObj = (company?.settings as Record<string, unknown> | undefined) ?? {};
    const roles = (settingsObj.customRoles as typeof DEFAULT_ROLES) || DEFAULT_ROLES;

    return {
      allPermissions: ALL_PERMISSIONS,
      roles
    };
  });

  // Atualiza permissões de um cargo
  app.put("/permissions/roles/:roleId", async (req, reply) => {
    const { roleId } = parse(z.object({ roleId: z.string() }), req.params);
    const body = parse(z.object({ permissions: z.array(z.string()) }), req.body);
    const p = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));

    const settingsObj = (company?.settings as Record<string, unknown> | undefined) ?? {};
    const currentRoles = (settingsObj.customRoles as typeof DEFAULT_ROLES) || DEFAULT_ROLES;

    const updatedRoles = currentRoles.map((r) =>
      r.id === roleId ? { ...r, permissions: body.permissions } : r
    );

    await db
      .update(schema.companies)
      .set({ settings: { ...settingsObj, customRoles: updatedRoles } })
      .where(eq(schema.companies.id, p.companyId));

    audit(p, "permissions.updated", "role", roleId, { count: body.permissions.length });

    return reply.send({
      success: true,
      roleId,
      permissions: body.permissions,
      message: "Permissões do cargo atualizadas com sucesso!"
    });
  });

  // Cria um novo cargo personalizado
  app.post("/permissions/roles", async (req, reply) => {
    const body = parse(
      z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(255).default(""),
        permissions: z.array(z.string()).default([])
      }),
      req.body
    );
    const p = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));

    const settingsObj = (company?.settings as Record<string, unknown> | undefined) ?? {};
    const currentRoles = (settingsObj.customRoles as typeof DEFAULT_ROLES) || DEFAULT_ROLES;

    const newRole = {
      id: `role_${Date.now()}`,
      name: body.name.trim(),
      description: body.description.trim(),
      permissions: body.permissions
    };

    const updatedRoles = [...currentRoles, newRole];

    await db
      .update(schema.companies)
      .set({ settings: { ...settingsObj, customRoles: updatedRoles } })
      .where(eq(schema.companies.id, p.companyId));

    audit(p, "permissions.role_created", "role", newRole.id);

    return reply.code(201).send(newRole);
  });
}
