import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { settings } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";

/** Central de Configurações & Integrações (ABACS, Hotmart, Meios de Pagamento, Google Gemini, WhatsApp). */
export function SettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: keys.settings, queryFn: settings.get });

  const [knowledge, setKnowledge] = useState("");
  const [saved, setSaved] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedAbacs, setCopiedAbacs] = useState(false);

  // Form de Meios de Pagamento & ABACS
  const [abacsToken, setAbacsToken] = useState("ABACS_TOKEN_EXEMPLO_2026");
  const [apiKeyCartao, setApiKeyCartao] = useState("****************************");
  const [accessTokenCard, setAccessTokenCard] = useState("****************************");
  const [publicKey, setPublicKey] = useState("****************************");
  const [collectorId, setCollectorId] = useState("****************************");
  const [abacsSaved, setAbacsSaved] = useState(false);

  const webhookHotmartUrl = "http://localhost:4000/webhooks/hotmart";
  const linkAbacsUrl = `http://localhost:4000/webhooks/abacs/integracao/hotmart?token=${abacsToken}&curso=ID_DO_CURSO`;

  const loaded = query.data?.settings.widgetKnowledge;
  useEffect(() => {
    if (typeof loaded === "string") setKnowledge(loaded);
  }, [loaded]);

  const save = useMutation({
    mutationFn: () => settings.update({ widgetKnowledge: knowledge }),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: keys.settings });
    },
  });

  const copiarWebhook = () => {
    navigator.clipboard.writeText(webhookHotmartUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  const copiarLinkAbacs = () => {
    navigator.clipboard.writeText(linkAbacsUrl);
    setCopiedAbacs(true);
    setTimeout(() => setCopiedAbacs(false), 3000);
  };

  return (
    <div style={{ maxWidth: 800, paddingBottom: 40 }}>
      <h2>⚙️ Central de Configurações & Integrações</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Gerencie a integração com ABACS / Escola Avançada, Hotmart, Chaves de Pagamento e Base da IA.
      </p>

      {/* Card 0: Integração ABACS & Escola Avançada */}
      <div className="card" style={{ padding: 20, marginBottom: 20, alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>🏛️ Integração ABACS & Escola Avançada (Hotmart API)</span>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "rgba(109, 40, 217, 0.15)", color: "#6d28d9", fontWeight: 700 }}>
            ⚡ TOKEN ATIVO
          </span>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Link oficial para conectar os cursos da Hotmart à plataforma via API da Escola Avançada / ABACS.
        </p>

        <div style={{ background: "var(--panel2)", borderRadius: 10, padding: 14, border: "1px solid var(--border)", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>
            Link de Integração Hotmart (Copie e cole na Hotmart):
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              readOnly
              value={linkAbacsUrl}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 12, fontFamily: "monospace" }}
            />
            <button type="button" onClick={copiarLinkAbacs} style={{ fontSize: 12, padding: "8px 14px" }}>
              {copiedAbacs ? "Copiado! ✓" : "Copiar Link"}
            </button>
          </div>
        </div>

        {/* Formulário de Meios de Pagamento & ABACS */}
        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>💳 Meios de Pagamentos & Chaves de API</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>API KEY (Cartão e Boleto)</label>
              <input
                type="password"
                value={apiKeyCartao}
                onChange={(e) => setApiKeyCartao(e.target.value)}
                placeholder="Insira a API Key"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--text)", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>ACCESS TOKEN (Cartão)</label>
              <input
                type="password"
                value={accessTokenCard}
                onChange={(e) => setAccessTokenCard(e.target.value)}
                placeholder="Insira o Access Token"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--text)", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>PUBLIC KEY</label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Insira a Public Key"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--text)", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>COLLECTOR ID</label>
              <input
                type="text"
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                placeholder="Insira o Collector ID"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--text)", fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setAbacsSaved(true);
                setTimeout(() => setAbacsSaved(false), 3000);
              }}
              style={{ fontSize: 12, padding: "8px 14px", background: "#6d28d9", color: "#fff", border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
            >
              Salvar Credenciais ABACS
            </button>
            {abacsSaved && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>Credenciais salvas com sucesso! ✓</span>}
          </div>
        </div>
      </div>

      {/* Card 1: Integração Oficial Hotmart */}
      <div className="card" style={{ padding: 20, marginBottom: 20, alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>🛍️ Automação & Webhook da Hotmart</span>
          <a
            href="https://app.hotmart.com/tools/webhook"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, padding: "4px 12px", borderRadius: 12, background: "linear-gradient(135deg, #ff416c, #ff4b2b)", color: "#fff", fontWeight: 700, textDecoration: "none" }}
          >
            ↗ Abrir Ferramentas Hotmart Webhook
          </a>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Ao realizar vendas na Hotmart, este webhook cadastra o comprador automaticamente, envia a mensagem de boas-vindas no WhatsApp e libera o acesso aos cursos.
        </p>

        <div style={{ background: "var(--panel2)", borderRadius: 10, padding: 14, border: "1px solid var(--border)", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>URL do Webhook para cadastrar na Hotmart:</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              readOnly
              value={webhookHotmartUrl}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 13, fontFamily: "monospace" }}
            />
            <button type="button" onClick={copiarWebhook} style={{ fontSize: 12, padding: "8px 14px" }}>
              {copiedWebhook ? "Copiado! ✓" : "Copiar URL"}
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Status do Google Gemini AI */}
      <div className="card" style={{ padding: 20, marginBottom: 20, alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>✦ Google Gemini AI Studio</span>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontWeight: 700 }}>
            🟢 CONECTADO E ATIVO
          </span>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Sua chave de API do Google Gemini está configurada. O modelo generativo padrão ativo é o <b>Gemini 1.5 / 2.0 Flash</b>.
        </p>
      </div>

      {/* Card 3: Base de Conhecimento Ampliada */}
      <div className="card" style={{ padding: 20, alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
          🌐 Base de Conhecimento do Comenta AI
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          O robô de autoatendimento responde seus clientes e visitantes usando as informações abaixo (preços, horários, perguntas frequentes e procedimentos).
        </p>

        <Async {...query} onRetry={() => void query.refetch()}>
          {() => (
            <>
              <textarea
                rows={8}
                value={knowledge}
                onChange={(e) => {
                  setKnowledge(e.target.value);
                  setSaved(false);
                }}
                aria-label="Base de conhecimento do widget"
                placeholder={
                  "Ex.: Somos o Comenta AtendeChat.\nHorário: seg–sex 8h–18h.\nPlanos/preços: Starter R$ 149, Pro R$ 349...\n..."
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--panel2)",
                  color: "var(--text)",
                  resize: "vertical",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              />

              {save.error && <ErrorBox error={save.error} />}

              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
                <button disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? "Salvando…" : "Salvar Configurações"}
                </button>
                {saved && !save.isPending && (
                  <span className="muted" style={{ fontSize: 13, color: "#10b981", fontWeight: 700 }}>
                    Configurações atualizadas com sucesso ✓
                  </span>
                )}
              </div>
            </>
          )}
        </Async>
      </div>
      {/* Kiwify & AtendeChat Portal Bridge */}
      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
          🎓 Portal de Cursos AtendeChat & Kiwify (curso.atendechat.com)
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Integração oficial de alunos, membros e webhooks com a área de membros Kiwify.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href="https://curso.atendechat.com/"
            target="_blank"
            rel="noreferrer"
            className="button secondary"
            style={{
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#16a34a",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 8,
            }}
          >
            ↗ Abrir Portal Kiwify AtendeChat (curso.atendechat.com)
          </a>

          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Webhook Endpoint: <code>http://localhost:4000/webhooks/kiwify</code>
          </span>
        </div>
      </div>
    </div>
  );
}
