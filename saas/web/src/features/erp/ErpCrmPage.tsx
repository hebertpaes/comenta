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

interface MenuOption {
  key: string;
  label: string;
  subtitle: string;
  action: string;
  customResponse?: string;
}

interface MenuConfig {
  headerTitle: string;
  greeting: string;
  footerText: string;
  options: MenuOption[];
}

export function ErpCrmPage() {
  const [activeTab, setActiveTab] = useState<"crm" | "financial" | "stock" | "whatsapp_menu">("whatsapp_menu");

  // Configuração Editável do Menu no WhatsApp
  const [menuConfig, setMenuConfig] = useState<MenuConfig>({
    headerTitle: "🤖 *MENU INTERATIVO - COMENTA AI & ABACS*",
    greeting: "_Seja bem-vindo ao sistema de atendimento inteligente oficial!_\n\nPor favor, escolha uma opção digitando o número correspondente:",
    footerText: "--- \n📱 *Comenta SaaS v2.0* · _https://abacs.org.br_",
    options: [
      { key: "1️⃣", label: "🎓 *Cursos & Treinamentos ABACS*", subtitle: "Ver catálogo de 17 cursos, ementas e matricular-se", action: "courses_catalog" },
      { key: "2️⃣", label: "🛍️ *Loja Virtual & Produtos ERP*", subtitle: "Consultar catálogo de produtos, equipamentos e compra", action: "store_products" },
      { key: "3️⃣", label: "🧾 *Financeiro & 2ª Via de Faturas (ERP)*", subtitle: "Consultar extrato de mensalidade, faturas Hotmart e Pix", action: "financial_invoices" },
      { key: "4️⃣", label: "📊 *Status do Atendimento / Pedido (CRM)*", subtitle: "Acompanhar andamento da sua inscrição ou suporte", action: "crm_status" },
      { key: "5️⃣", label: "✨ *Falar com Sofia Gemini 2.0 IA Spark*", subtitle: "Tirar dúvidas por IA com respostas humanas em tempo real", action: "ai_spark" },
      { key: "6️⃣", label: "🧑‍💼 *Falar com um Atendente Humano*", subtitle: "Transferência imediata para a fila de suporte comercial", action: "human_agent" }
    ]
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleAddOption = () => {
    const nextNum = menuConfig.options.length + 1;
    const newOpt: MenuOption = {
      key: `${nextNum}️⃣`,
      label: `*Nova Opção ${nextNum}*`,
      subtitle: "Descrição personalizada da nova funcionalidade",
      action: "custom_text",
      customResponse: "Resposta automática personalizada."
    };
    setMenuConfig({ ...menuConfig, options: [...menuConfig.options, newOpt] });
  };

  const handleRemoveOption = (index: number) => {
    const updated = menuConfig.options.filter((_, idx) => idx !== index);
    setMenuConfig({ ...menuConfig, options: updated });
  };

  const handleOptionChange = (index: number, field: keyof MenuOption, value: string) => {
    const updated = menuConfig.options.map((opt, idx) => (idx === index ? { ...opt, [field]: value } : opt));
    setMenuConfig({ ...menuConfig, options: updated });
  };

  const handleSaveMenu = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

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

  // Texto formatado para o simulador do WhatsApp
  const previewText = `${menuConfig.headerTitle}\n${menuConfig.greeting}\n\n` +
    menuConfig.options.map((opt) => `${opt.key} ${opt.label}\n   _${opt.subtitle}_`).join("\n\n") +
    `\n\n${menuConfig.footerText}`;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Top Header do Módulo CRM & ERP */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>💼 Gestão Integrada CRM & ERP + Formulário de Menu no WhatsApp</h2>
          <p className="muted" style={{ marginTop: -8, marginBottom: 0 }}>
            Crie e edite opções do menu do WhatsApp, gerencie propostas comerciais, lançamentos do ERP e produtos.
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
          onClick={() => setActiveTab("whatsapp_menu")}
          style={{
            background: activeTab === "whatsapp_menu" ? "#25D366" : "var(--panel2)",
            color: activeTab === "whatsapp_menu" ? "#fff" : "var(--text)",
            fontWeight: 700,
            fontSize: 13
          }}
        >
          ⚙️ Criar / Editar Menu no WhatsApp
        </button>

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
      </div>

      {/* TAB: FORMULÁRIO DE CRIAÇÃO & EDIÇÃO DO MENU NO WHATSAPP */}
      {activeTab === "whatsapp_menu" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
          {/* Formulário Editável das Opções do Menu */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>⚙️ Editor do Menu Interativo do WhatsApp</h3>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                  Altere os textos, títulos e crie novas opções que o robô envia no WhatsApp.
                </p>
              </div>
              <button type="button" onClick={handleSaveMenu} style={{ background: "#25D366", color: "#fff", fontWeight: 800, padding: "8px 16px" }}>
                💾 Salvar Menu
              </button>
            </div>

            {savedSuccess && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(37, 211, 102, 0.15)", border: "1px solid #25D366", color: "#10b981", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                ✓ Menu interativo do WhatsApp salvo com sucesso!
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Título do Cabeçalho */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Cabeçalho / Título Principal do Menu:
                </label>
                <input
                  type="text"
                  value={menuConfig.headerTitle}
                  onChange={(e) => setMenuConfig({ ...menuConfig, headerTitle: e.target.value })}
                  style={{ fontSize: 13, fontWeight: 700 }}
                />
              </div>

              {/* Mensagem de Boas-Vindas */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Mensagem de Boas-Vindas & Instruções:
                </label>
                <textarea
                  rows={2}
                  value={menuConfig.greeting}
                  onChange={(e) => setMenuConfig({ ...menuConfig, greeting: e.target.value })}
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* Lista de Opções do Menu Editáveis */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase" }}>
                    Opções do Menu Interativo ({menuConfig.options.length}):
                  </label>
                  <button type="button" onClick={handleAddOption} className="ghost" style={{ fontSize: 12, padding: "4px 10px" }}>
                    + Adicionar Opção
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {menuConfig.options.map((opt, idx) => (
                    <div key={idx} style={{ background: "var(--panel2)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <input
                          type="text"
                          value={opt.key}
                          onChange={(e) => handleOptionChange(idx, "key", e.target.value)}
                          placeholder="1️⃣"
                          style={{ width: 60, textAlign: "center", fontWeight: 800 }}
                        />
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => handleOptionChange(idx, "label", e.target.value)}
                          placeholder="Título da opção"
                          style={{ flex: 1, fontWeight: 700 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="ghost"
                          style={{ color: "#ef4444", padding: "6px 10px", fontSize: 12 }}
                        >
                          ✕ Excluir
                        </button>
                      </div>

                      <input
                        type="text"
                        value={opt.subtitle}
                        onChange={(e) => handleOptionChange(idx, "subtitle", e.target.value)}
                        placeholder="Subtítulo / Descrição explicativa"
                        style={{ fontSize: 12, marginBottom: 8 }}
                      />

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          value={opt.action}
                          onChange={(e) => handleOptionChange(idx, "action", e.target.value)}
                          style={{ flex: 1, fontSize: 12 }}
                        >
                          <option value="courses_catalog">🎓 Enviar Catálogo de 17 Cursos ABACS</option>
                          <option value="store_products">🛍️ Enviar Catálogo de Produtos ERP</option>
                          <option value="financial_invoices">🧾 Consultar Faturas / PIX (ERP)</option>
                          <option value="crm_status">📊 Consultar Status no CRM</option>
                          <option value="ai_spark">✨ Ativar Sofia Gemini 2.0 IA Spark</option>
                          <option value="human_agent">🧑‍💼 Transferir para Atendente Humano</option>
                          <option value="custom_text">💬 Texto de Resposta Personalizado</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rodapé do Menu */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Rodapé / Assinatura do Menu:
                </label>
                <input
                  type="text"
                  value={menuConfig.footerText}
                  onChange={(e) => setMenuConfig({ ...menuConfig, footerText: e.target.value })}
                  style={{ fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          {/* Simulador ao Vivo da Mensagem do WhatsApp */}
          <div className="card" style={{ padding: 20, height: "fit-content", position: "sticky", top: 20 }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📱 Simulador da Mensagem no WhatsApp</span>
              <span className="tag" style={{ background: "#25D366", color: "#fff", fontSize: 10 }}>Ao Vivo</span>
            </h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              Visualização exata de como a mensagem aparecerá no celular do seu cliente:
            </p>

            <div style={{ background: "#0b141a", color: "#e9edef", padding: 18, borderRadius: 16, fontFamily: "sans-serif", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5, border: "1px solid #222d34" }}>
              {previewText}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CRM & FUNIL DE VENDAS */}
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

      {/* TAB 3: ERP FINANCEIRO (FLUXO DE CAIXA) */}
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

      {/* TAB 4: ERP CATÁLOGO DE PRODUTOS & ESTOQUE */}
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
    </div>
  );
}
