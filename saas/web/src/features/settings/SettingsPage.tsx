import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { settings } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";

/** Configurações gerais da empresa (admin). */
export function SettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: keys.settings, queryFn: settings.get });

  const [knowledge, setKnowledge] = useState("");
  const [saved, setSaved] = useState(false);

  // Sincroniza o textarea quando as configurações chegam do servidor.
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

  return (
    <>
      <h2>Configurações</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 640 }}>
        Ajustes gerais da empresa. O horário de atendimento por departamento fica na aba{" "}
        <b>Filas</b>.
      </p>

      <div className="card" style={{ padding: 20, maxWidth: 640, alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          🌐 Base de conhecimento do chat do site
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          O assistente de IA do widget do site responde os visitantes usando este texto (planos,
          horários, políticas, endereço…). Se ficar vazio, usa a base padrão do Comenta.
        </p>

        <Async {...query} onRetry={() => void query.refetch()}>
          {() => (
            <>
              <textarea
                rows={10}
                value={knowledge}
                onChange={(e) => {
                  setKnowledge(e.target.value);
                  setSaved(false);
                }}
                aria-label="Base de conhecimento do widget"
                placeholder={
                  "Ex.: Somos a Loja X.\nHorário: seg–sex 9h–18h.\nPlanos/preços: ...\nPolítica de troca: ...\nEndereço: ..."
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--panel2)",
                  color: "var(--text)",
                  resize: "vertical",
                }}
              />

              {save.error && <ErrorBox error={save.error} />}

              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
                <button disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? "Salvando…" : "Salvar"}
                </button>
                {saved && !save.isPending && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    Configurações salvas ✓
                  </span>
                )}
              </div>
            </>
          )}
        </Async>
      </div>
    </>
  );
}
