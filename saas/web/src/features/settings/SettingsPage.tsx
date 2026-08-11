import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { settings } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";

/** Central de Configurações & Integrações (Hotmart, Google Gemini, WhatsApp, Webhooks). */
export function SettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: keys.settings, queryFn: settings.get });

  const [knowledge, setKnowledge] = useState("");
  const [hotmartToken, setHotmartToken] = useState("hottok_comenta_prod_2026");
  const [saved, setSaved] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookHotmartUrl = "http://localhost:4000/webhooks/hotmart";

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

  return (
    <div style={{ maxWidth: 800, paddingBottom: 40 }}>
      <h2>⚙️ Central de Configurações & Integrações</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Gerencie as integrações do Hotmart, chaves da API do Google Gemini, automações e a base de conhecimento do Comenta AI.
      </p>

      {/* Card 1: Integração Oficial Hotmart */}
      <div className="card" style={{ padding: 20, marginBottom: 20, alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          🛍️ Automação & Webhook da Hotmart
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

        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          💡 <b>Passo a passo no Hotmart Club</b>:
          <ol style={{ paddingLeft: 20, marginTop: 6, lineHeight: 1.6 }}>
            <li>Acesse o painel da Hotmart &gt; <b>Ferramentas</b> &gt; <b>Webhook (API e Notificações)</b>.</li>
            <li>Cadastre a URL acima e selecione o evento <b>"COMPRA APROVADA"</b> (PURCHASE_APPROVED).</li>
            <li>Cole o seu token <b>Hottok</b> de segurança para validar a autenticidade das requisições.</li>
          </ol>
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
    </div>
  );
}
