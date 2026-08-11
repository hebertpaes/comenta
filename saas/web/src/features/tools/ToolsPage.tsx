import { useState } from "react";
import { TOOLS } from "./catalog";

export function ToolsPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <h2>Ferramentas</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 8, maxWidth: 680 }}>
        Ferramentas open-source que ampliam o Comenta — como <b>produto</b>, <b>serviço</b> e
        <b> treinamento</b> para a sua equipe. Elas não sobem por padrão: ligue só as que quiser.
      </p>

      <div className="aibox" style={{ maxWidth: 680, marginBottom: 18 }}>
        Para ligar (no terminal, na pasta <code>deploy</code>):
        <br />
        <code style={{ fontSize: 12 }}>
          docker compose --profile tools up -d n8n metabase nocodb
        </code>
        <br />
        Para desligar: <code style={{ fontSize: 12 }}>docker compose --profile tools down</code>
      </div>

      <div
        className="cards"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {TOOLS.map((t) => (
          <div
            key={t.key}
            className="card"
            style={{ padding: 18, textAlign: "left", alignItems: "flex-start" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <span style={{ fontSize: 26 }}>{t.icon}</span>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: "8px 0" }}>
              {t.tagline}
            </p>

            <button className="link" onClick={() => setOpen(open === t.key ? null : t.key)}>
              {open === t.key ? "Ocultar detalhes" : "Como usar / treinar"}
            </button>

            {open === t.key && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginTop: 6 }}>Como a empresa usa</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {t.uses.map((u) => (
                    <li key={u} style={{ marginBottom: 3 }}>
                      {u}
                    </li>
                  ))}
                </ul>
                <div style={{ fontWeight: 600, marginTop: 10 }}>Roteiro de treinamento</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "none" }}>
                  {t.training.map((s) => (
                    <li key={s} style={{ marginBottom: 3 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 12,
                background: "#6d28d9",
                color: "#fff",
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Abrir ↗
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
