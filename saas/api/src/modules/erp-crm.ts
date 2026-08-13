import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, and, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

/**
 * Módulo Completo de CRM (Gestão de Oportunidades & Pipeline) + ERP (Financeiro, Estoque, Pedidos)
 * e Gerador Editável do Menu Interativo Completo do WhatsApp do Sistema.
 */

export const DEFAULT_WHATSAPP_MENU_CONFIG = {
  headerTitle: "🤖 *MENU INTERATIVO - COMENTA AI & ABACS*",
  greeting: "_Seja bem-vindo ao sistema de atendimento inteligente oficial!_\n\nPor favor, escolha uma opção digitando o número correspondente:",
  footerText: "--- \n📱 *Comenta SaaS v2.0* · _https://abacs.org.br_",
  options: [
    { key: "1️⃣", label: "🎓 *Cursos & Treinamentos ABACS*", subtitle: "Ver catálogo de 17 cursos, ementas e matricular-se", action: "courses_catalog", customResponse: "" },
    { key: "2️⃣", label: "🛍️ *Loja Virtual & Produtos ERP*", subtitle: "Consultar catálogo de produtos, equipamentos e compra", action: "store_products", customResponse: "" },
    { key: "3️⃣", label: "🧾 *Financeiro & 2ª Via de Faturas (ERP)*", subtitle: "Consultar extrato de mensalidade, faturas Hotmart e Pix", action: "financial_invoices", customResponse: "" },
    { key: "4️⃣", label: "📊 *Status do Atendimento / Pedido (CRM)*", subtitle: "Acompanhar andamento da sua inscrição ou suporte", action: "crm_status", customResponse: "" },
    { key: "5️⃣", label: "✨ *Falar com Sofia Gemini 2.0 IA Spark*", subtitle: "Tirar dúvidas por IA com respostas humanas em tempo real", action: "ai_spark", customResponse: "" },
    { key: "6️⃣", label: "🧑‍💼 *Falar com um Atendente Humano*", subtitle: "Transferência imediata para a fila de suporte comercial", action: "human_agent", customResponse: "" }
  ]
};

export function buildFormattedMenuText(config: typeof DEFAULT_WHATSAPP_MENU_CONFIG): string {
  let text = `${config.headerTitle}\n${config.greeting}\n\n`;
  config.options.forEach((opt) => {
    text += `${opt.key} ${opt.label}\n   _${opt.subtitle}_\n\n`;
  });
  text += config.footerText;
  return text;
}

export async function erpCrmRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // 1. Dashboard Integrado CRM + ERP
  app.get("/erp/dashboard", async (req) => {
    const p = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));

    const settingsObj = (company?.settings as Record<string, any> | undefined) ?? {};
    const erpData = settingsObj.erpData || {
      transactions: [
        { id: "tx_1", type: "receita", description: "Venda Curso Operador de Caixa (Hotmart)", amount: 99.00, date: "2026-08-13", category: "Cursos" },
        { id: "tx_2", type: "receita", description: "Mensalidade Comenta SaaS Pro", amount: 349.00, date: "2026-08-13", category: "SaaS" },
        { id: "tx_3", type: "despesa", description: "Servidores & Nuvem AWS / Gemini API", amount: 120.00, date: "2026-08-12", category: "Infraestrutura" },
        { id: "tx_4", type: "receita", description: "Inscrição Engenharia de IA ABACS", amount: 149.00, date: "2026-08-12", category: "Cursos" },
      ],
      deals: [
        { id: "deal_1", title: "Treinamento Corporativo Pacote Office", contactName: "Empresa ABC Ltda", stage: "proposta", amount: 2500.00, probability: 80 },
        { id: "deal_2", title: "Licença SaaS 50 Atendentes", contactName: "Rede Farmácias Silva", stage: "negociacao", amount: 4900.00, probability: 90 },
        { id: "deal_3", title: "Matrícula Combo Administrativo", contactName: "João Pedro", stage: "fechado", amount: 198.00, probability: 100 },
      ],
      products: [
        { id: "prod_1", name: "Curso Operador de Caixa Completo", sku: "ABACS-077", costPrice: 20.00, sellPrice: 99.00, stock: 999, category: "Digital" },
        { id: "prod_2", name: "Engenharia de Prompt & IA", sku: "ABACS-101", costPrice: 30.00, sellPrice: 149.00, stock: 999, category: "Digital" },
        { id: "prod_3", name: "Headset Profissional USB Atendimento", sku: "EQP-002", costPrice: 65.00, sellPrice: 140.00, stock: 45, category: "Físico" }
      ]
    };

    const whatsappMenuConfig = settingsObj.whatsappMenuConfig || DEFAULT_WHATSAPP_MENU_CONFIG;

    const totalReceitas = erpData.transactions
      .filter((t: any) => t.type === "receita")
      .reduce((acc: number, t: any) => acc + t.amount, 0);

    const totalDespesas = erpData.transactions
      .filter((t: any) => t.type === "despesa")
      .reduce((acc: number, t: any) => acc + t.amount, 0);

    const pipelineValue = erpData.deals.reduce((acc: number, d: any) => acc + d.amount, 0);

    return {
      kpis: {
        saldoLiquido: totalReceitas - totalDespesas,
        totalReceitas,
        totalDespesas,
        pipelineValue,
        activeDealsCount: erpData.deals.length,
        productsCount: erpData.products.length
      },
      transactions: erpData.transactions,
      deals: erpData.deals,
      products: erpData.products,
      whatsappMenuConfig,
      whatsappMenuText: buildFormattedMenuText(whatsappMenuConfig)
    };
  });

  // 2. Salvar Configuração Editável do Menu no WhatsApp
  app.put("/whatsapp/interactive-menu", async (req, reply) => {
    const body = parse(
      z.object({
        headerTitle: z.string().min(1),
        greeting: z.string().min(1),
        footerText: z.string().default(""),
        options: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            subtitle: z.string(),
            action: z.string(),
            customResponse: z.string().optional().default("")
          })
        )
      }),
      req.body
    );
    const p = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));

    const settingsObj = (company?.settings as Record<string, any> | undefined) ?? {};

    await db
      .update(schema.companies)
      .set({ settings: { ...settingsObj, whatsappMenuConfig: body } })
      .where(eq(schema.companies.id, p.companyId));

    audit(p, "whatsapp.menu_updated", "settings", p.companyId, { optionsCount: body.options.length });

    return reply.send({
      success: true,
      message: "Menu interativo do WhatsApp atualizado com sucesso!",
      menuConfig: body,
      menuText: buildFormattedMenuText(body)
    });
  });

  // 3. Lançar Transação no ERP (Receita / Despesa)
  app.post("/erp/transactions", async (req, reply) => {
    const body = parse(
      z.object({
        type: z.enum(["receita", "despesa"]),
        description: z.string().min(2),
        amount: z.number().positive(),
        category: z.string().default("Geral")
      }),
      req.body
    );
    const p = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));

    const settingsObj = (company?.settings as Record<string, any> | undefined) ?? {};
    const erpData = settingsObj.erpData || { transactions: [], deals: [], products: [] };

    const newTx = {
      id: `tx_${Date.now()}`,
      type: body.type,
      description: body.description.trim(),
      amount: body.amount,
      category: body.category,
      date: new Date().toISOString().split("T")[0]
    };

    const updatedErp = {
      ...erpData,
      transactions: [newTx, ...(erpData.transactions || [])]
    };

    await db
      .update(schema.companies)
      .set({ settings: { ...settingsObj, erpData: updatedErp } })
      .where(eq(schema.companies.id, p.companyId));

    audit(p, "erp.transaction_created", "transaction", newTx.id, { amount: body.amount });

    return reply.code(201).send(newTx);
  });

  // 4. Criar Oportunidade no CRM
  app.post("/crm/deals", async (req, reply) => {
    const body = parse(
      z.object({
        title: z.string().min(2),
        contactName: z.string().min(2),
        amount: z.number().nonnegative(),
        stage: z.enum(["prospecao", "proposta", "negociacao", "fechado", "perdido"]).default("prospecao")
      }),
      req.body
    );
    const p = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));

    const settingsObj = (company?.settings as Record<string, any> | undefined) ?? {};
    const erpData = settingsObj.erpData || { transactions: [], deals: [], products: [] };

    const newDeal = {
      id: `deal_${Date.now()}`,
      title: body.title.trim(),
      contactName: body.contactName.trim(),
      amount: body.amount,
      stage: body.stage,
      probability: body.stage === "fechado" ? 100 : 50
    };

    const updatedErp = {
      ...erpData,
      deals: [newDeal, ...(erpData.deals || [])]
    };

    await db
      .update(schema.companies)
      .set({ settings: { ...settingsObj, erpData: updatedErp } })
      .where(eq(schema.companies.id, p.companyId));

    audit(p, "crm.deal_created", "deal", newDeal.id, { amount: body.amount });

    return reply.code(201).send(newDeal);
  });

  // 5. Retorna o Menu Interativo Formatado do WhatsApp para o Bot
  app.get("/whatsapp/interactive-menu", async (req) => {
    const p = req.principal;

    const [company] = await db
      .select({ settings: schema.companies.settings })
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));

    const settingsObj = (company?.settings as Record<string, any> | undefined) ?? {};
    const config = settingsObj.whatsappMenuConfig || DEFAULT_WHATSAPP_MENU_CONFIG;

    return {
      success: true,
      menuConfig: config,
      menuText: buildFormattedMenuText(config),
      options: config.options
    };
  });
}
