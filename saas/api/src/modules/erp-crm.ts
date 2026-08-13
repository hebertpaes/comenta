import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, and, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

/**
 * Módulo Completo de CRM (Gestão de Oportunidades & Pipeline) + ERP (Financeiro, Estoque, Pedidos)
 * e Gerador do Menu Interativo Completo do WhatsApp do Sistema.
 */

export const SYSTEM_WHATSAPP_MENU = `🤖 *MENU INTERATIVO - COMENTA AI & ABACS*
_Seja bem-vindo ao sistema de atendimento inteligente oficial!_

Por favor, escolha uma opção digitando o número correspondente:

1️⃣ 🎓 *Cursos & Treinamentos ABACS*
   _Ver catálogo de 17 cursos, ementas e matricular-se_

2️⃣ 🛍️ *Loja Virtual & Produtos ERP*
   _Consultar catálogo de produtos, equipamentos e compra_

3️⃣ 🧾 *Financeiro & 2ª Via de Faturas (ERP)*
   _Consultar extrato de mensalidade, faturas Hotmart e Pix_

4️⃣ 📊 *Status do Atendimento / Pedido (CRM)*
   _Acompanhar andamento da sua inscrição ou suporte_

5️⃣ ✨ *Falar com Sofia Gemini 2.0 IA Spark*
   _Tirar dúvidas por IA com respostas humanas em tempo real_

6️⃣ 🧑‍💼 *Falar com um Atendente Humano*
   _Transferência imediata para a fila de suporte comercial_

---
📱 *Comenta SaaS v2.0* · _https://abacs.org.br_`;

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
        { id: "tx_1", type: "receita", description: "Venda Curso Operador de Caixa (Hotmart)", amount: 99.00, date: "2026-08-11", category: "Cursos" },
        { id: "tx_2", type: "receita", description: "Mensalidade Comenta SaaS Pro", amount: 349.00, date: "2026-08-11", category: "SaaS" },
        { id: "tx_3", type: "despesa", description: "Servidores & Nuvem AWS / Gemini API", amount: 120.00, date: "2026-08-10", category: "Infraestrutura" },
        { id: "tx_4", type: "receita", description: "Inscrição Engenharia de IA ABACS", amount: 149.00, date: "2026-08-10", category: "Cursos" },
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
      whatsappMenu: SYSTEM_WHATSAPP_MENU
    };
  });

  // 2. Lançar Transação no ERP (Receita / Despesa)
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

  // 3. Criar Oportunidade no CRM
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

  // 4. Retorna o Menu Interativo Formatado do WhatsApp para o Bot
  app.get("/whatsapp/interactive-menu", async () => {
    return {
      success: true,
      menuText: SYSTEM_WHATSAPP_MENU,
      options: [
        { key: "1", label: "🎓 Cursos & Treinamentos ABACS", action: "courses_catalog" },
        { key: "2", label: "🛍️ Loja Virtual & Produtos ERP", action: "store_products" },
        { key: "3", label: "🧾 Financeiro & 2ª Via de Fatura (ERP)", action: "financial_invoices" },
        { key: "4", label: "📊 Status do Atendimento / Pedido (CRM)", action: "crm_status" },
        { key: "5", label: "✨ Sofia Gemini 2.0 IA Spark", action: "ai_spark" },
        { key: "6", label: "🧑‍💼 Falar com Atendente Humano", action: "human_agent" }
      ]
    };
  });
}
