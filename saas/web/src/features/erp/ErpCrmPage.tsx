import { useState } from "react";

interface Transaction {
  id: string;
  type: "receita" | "despesa";
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface Deal {
  id: string;
  title: string;
  contactName: string;
  amount: number;
  stage: "prospecao" | "proposta" | "negociacao" | "fechado" | "perdido";
  probability: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  category: string;
}

export function ErpCrmPage() {
  const [activeTab, setActiveTab] = useState<"crm" | "financial" | "stock" | "whatsapp_menu">("crm");

  // Dados Locais do CRM / ERP
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "tx_1", type: "receita", description: "Venda Curso Operador de Caixa (Hotmart)", amount: 99.00, date: "2026-08-13", category: "Cursos" },
    { id: "tx_2", type: "receita", description: "Mensalidade Comenta SaaS Pro", amount: 349.00, date: "2026-08-13", category: "SaaS" },
    { id: "tx_3", type: "despesa", description: "Servidores & Nuvem AWS / Gemini API", amount: 120.00, date: "2026-08-12", category: "Infraestrutura" },
    { id: "tx_4", type: "receita", description: "Inscrição Engenharia de IA ABACS", amount: 149.00, date: "2026-08-12", category: "Cursos" }
  ]);

  const [deals, setDeals] = useState<Deal[]>([
    { id: "deal_1", title: "Treinamento Corporativo Pacote Office Pro", contactName: "Empresa ABC Ltda", stage: "proposta", amount: 2500.00, probability: 80 },
    { id: "deal_2", title: "Licença SaaS 50 Atendentes", contactName: "Rede Farmácias Silva", stage: "negociacao", amount: 4900.00, probability: 90 },
    { id: "deal_3", title: "Matrícula Combo Administrativo", contactName: "João Pedro", stage: "fechado", amount: 198.00, probability: 100 },
    { id: "deal_4", title: "Curso Cibersegurança & LGPD", contactName: "Ana Clara", stage: "prospecao", amount: 199.00, probability: 40 }
  ]);

  const [products] = useState<Product[]>([
    { id: "prod_1", name: "Curso Operador de Caixa Completo", sku: "ABACS-077", costPrice: 20.00, sellPrice: 99.00, stock: 999, category: "Digital" },
    { id: "prod_2", name: "Engenharia de Prompt & IA", sku: "ABACS-101", costPrice: 30.00, sellPrice: 149.00, stock: 999, category: "Digital" },
    { id: "prod_3", name: "Headset Profissional USB Atendimento", sku: "EQP-002", costPrice: 65.00, sellPrice: 140.00, stock: 45, category: "Físico" }
  ]);

  // Form de Lançamento Financeiro ERP
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"receita" | "despesa">("receita");

  // Form de Nova Oportunidade CRM
  const [dealTitle, setDealTitle] = useState("");
  const [dealContact, setDealContact] = useState("");
  const [dealAmount, setDealAmount] = useState("");

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !amount) return;

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type,
      description: desc.trim(),
      amount: parseFloat(amount),
      date: new Date().toISOString().split("T")[0]!,
      category: "Geral"
    };

    setTransactions([newTx, ...transactions]);
    setDesc("");
    setAmount("");
  };

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealContact.trim()) return;

    const newDeal: Deal = {
      id: `deal_${Date.now()}`,
      title: dealTitle.trim(),
      contactName: dealContact.trim(),
      amount: parseFloat(dealAmount) || 0,
      stage: "prospecao",
      probability: 40
    };

    setDeals([newDeal, ...deals]);
    setDealTitle("");
    setDealContact("");
    setDealAmount("");
  };

  const moveDealStage = (dealId: string, newStage: Deal["stage"]) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage: newStage, probability: newStage === "fechado" ? 100 : 60 } : d
      )
    );
  };

  const totalReceitas = transactions.filter((t) => t.type === "receita").reduce((a, b) => a + b.amount, 0);
  const totalDespesas = transactions.filter((t) => t.type === "despesa").reduce((a, b) => a + b.amount, 0);
  const pipelineTotal = deals.reduce((a, b) => a + b.amount, 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Top Header do Módulo CRM & ERP */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>💼 Gestão Integrada CRM & ERP + Menu WhatsApp</h2>
          <p className="muted" style={{ marginTop: -8, marginBottom: 0 }}>
            Controle de funil de vendas, receitas, despesas, catálogo de produtos e automação do Menu no WhatsApp.
          </p>
        </div>
      </div>

      {/* Cartões de Indicadores Chave (KPIs) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>💰 Saldo Líquido (ERP)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: totalReceitas - totalDespesas >= 0 ? "#10b981" : "#ef4444", marginTop: 4 }}>
            R$ {(totalReceitas - totalDespesas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>📈 Total de Receitas</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
            R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>📉 Total de Despesas</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#ef4444", marginTop: 4 }}>
            R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>🎯 Pipeline Funil CRM</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>
            R$ {pipelineTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Tabs de Navegação entre Módulos */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab("crm")}
          style={{
            background: activeTab === "crm" ? "var(--accent)" : "var(--panel2)",
            color: activeTab === "crm" ? "#fff" : "var(--text)",
            fontWeight: 700,
            fontSize: 13
          }}
        >
          🏢 CRM & Oportunidades
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("financial")}
          style={{
            background: activeTab === "financial" ? "var(--accent)" : "var(--panel2)",
            color: activeTab === "financial" ? "#fff" : "var(--text)",
            fontWeight: 700,
            fontSize: 13
          }}
        >
          💵 ERP Financeiro (Fluxo de Caixa)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          style={{
            background: activeTab === "stock" ? "var(--accent)" : "var(--panel2)",
            color: activeTab === "stock" ? "#fff" : "var(--text)",
            fontWeight: 700,
            fontSize: 13
          }}
        >
          📦 ERP Catálogo de Produtos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("whatsapp_menu")}
          style={{
            background: activeTab === "whatsapp_menu" ? "#25D366" : "var(--panel2)",
            color: activeTab === "whatsapp_menu" ? "#fff" : "var(--text)",
            fontWeight: 700,
            fontSize: 13
          }}
        >
          🤖 Menu no WhatsApp Integrado
        </button>
      </div>

      {/* TAB 1: CRM & FUNIL DE VENDAS */}
      {activeTab === "crm" && (
        <div>
          <form onSubmit={handleAddDeal} className="card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>+ Nova Oportunidade CRM:</span>
            <input
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              placeholder="Título da Proposta (ex: Treinamento ABACS)"
              style={{ flex: "1 1 200px" }}
            />
            <input
              value={dealContact}
              onChange={(e) => setDealContact(e.target.value)}
              placeholder="Cliente / Empresa"
              style={{ flex: "1 1 160px" }}
            />
            <input
              value={dealAmount}
              onChange={(e) => setDealAmount(e.target.value)}
              placeholder="Valor (R$)"
              type="number"
              style={{ flex: "1 1 120px" }}
            />
            <button type="submit" style={{ fontWeight: 700 }}>Cadastrar Oportunidade</button>
          </form>

          {/* Quadro Kanban de Estágios do CRM */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {[
              { id: "prospecao", label: "🔎 Prospecção", color: "#3b82f6" },
              { id: "proposta", label: "📄 Proposta Enviada", color: "#8b5cf6" },
              { id: "negociacao", label: "🤝 Negociação", color: "#f59e0b" },
              { id: "fechado", label: "✅ Fechado / Ganho", color: "#10b981" }
            ].map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.id);
              return (
                <div key={stage.id} style={{ background: "var(--panel2)", borderRadius: 16, padding: 14, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: stage.color, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                    <span>{stage.label}</span>
                    <span>({stageDeals.length})</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {stageDeals.map((deal) => (
                      <div key={deal.id} className="card" style={{ padding: 12, background: "var(--panel)" }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{deal.title}</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{deal.contactName}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#10b981", marginTop: 6 }}>
                          R$ {deal.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>

                        {/* Mover de Estágio */}
                        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                          {stage.id !== "fechado" && (
                            <button
                              type="button"
                              onClick={() => moveDealStage(deal.id, stage.id === "prospecao" ? "proposta" : stage.id === "proposta" ? "negociacao" : "fechado")}
                              className="ghost"
                              style={{ fontSize: 10, padding: "4px 8px", width: "100%" }}
                            >
                              Avançar ➔
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ERP FINANCEIRO (FLUXO DE CAIXA) */}
      {activeTab === "financial" && (
        <div>
          <form onSubmit={handleAddTransaction} className="card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>+ Novo Lançamento ERP:</span>
            <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ width: "auto" }}>
              <option value="receita">🟢 Receita (Entrada)</option>
              <option value="despesa">🔴 Despesa (Saída)</option>
            </select>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descrição do lançamento"
              style={{ flex: "1 1 220px" }}
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor (R$)"
              type="number"
              style={{ flex: "1 1 120px" }}
            />
            <button type="submit" style={{ fontWeight: 700 }}>Salvar no ERP</button>
          </form>

          {/* Tabela do Fluxo de Caixa */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--panel2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: 12 }}>Data</th>
                  <th style={{ padding: 12 }}>Tipo</th>
                  <th style={{ padding: 12 }}>Descrição</th>
                  <th style={{ padding: 12 }}>Categoria</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 12 }} className="muted">{tx.date}</td>
                    <td style={{ padding: 12, fontWeight: 700, color: tx.type === "receita" ? "#10b981" : "#ef4444" }}>
                      {tx.type === "receita" ? "🟢 Receita" : "🔴 Despesa"}
                    </td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{tx.description}</td>
                    <td style={{ padding: 12 }}><span className="tag">{tx.category}</span></td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: tx.type === "receita" ? "#10b981" : "#ef4444" }}>
                      R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ERP CATÁLOGO DE PRODUTOS & ESTOQUE */}
      {activeTab === "stock" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {products.map((prod) => (
            <div key={prod.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="tag" style={{ background: "var(--accent)", color: "#fff" }}>{prod.category}</span>
                <span className="muted" style={{ fontSize: 11 }}>SKU: {prod.sku}</span>
              </div>
              <h3 style={{ margin: "10px 0 4px 0", fontSize: 15, fontWeight: 800 }}>{prod.name}</h3>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>Preço de Venda</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>
                    R$ {prod.sellPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div className="muted" style={{ fontSize: 11 }}>Estoque Disponível</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{prod.stock} un</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: MENU INTERATIVO NO WHATSAPP DO SISTEMA */}
      {activeTab === "whatsapp_menu" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 16, fontWeight: 800 }}>🤖 Menu Interativo Oficial do WhatsApp</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              Este menu é enviado automaticamente para todos os contatos que enviam mensagens no WhatsApp ou interagem com o robô.
            </p>

            <div style={{ background: "#0b141a", color: "#e9edef", padding: 18, borderRadius: 16, fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5, border: "1px solid #222d34" }}>
{`🤖 *MENU INTERATIVO - COMENTA AI & ABACS*
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
   _Transferência imediata para a fila de suporte comercial_`}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 16, fontWeight: 800 }}>⚡ Ações Automáticas das Opções</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { opt: "Opção 1", title: "Cursos ABACS", desc: "Retorna o catálogo completo de 17 cursos com links da Hotmart e Loja Virtual." },
                { opt: "Opção 2", title: "Loja Virtual ERP", desc: "Exibe produtos do estoque e links para checkout direto." },
                { opt: "Opção 3", title: "Financeiro & Faturas", desc: "Gera e envia o código PIX / Fatura 2ª Via do aluno/cliente." },
                { opt: "Opção 4", title: "Status CRM", desc: "Verifica em qual etapa do funil comercial o cliente se encontra." },
                { opt: "Opção 5", title: "Sofia Gemini IA", desc: "Ativa a IA Gemini 2.0 Spark para responder em linguagem natural." },
                { opt: "Opção 6", title: "Atendente Humano", desc: "Transfere o atendimento para a Fila Comercial no painel." }
              ].map((item) => (
                <div key={item.opt} style={{ padding: 10, background: "var(--panel2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--accent)" }}>{item.opt}: {item.title}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
