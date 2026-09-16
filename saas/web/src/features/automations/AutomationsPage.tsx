import type { Automation } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { automations } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";
import { AutomationForm } from "./AutomationForm";
import type { NewAutomation } from "./AutomationForm";
import { AUTOMATION_TYPE_META } from "./types";

function describe(a: Automation): string {
  const c = a.config;
  switch (a.type) {
    case "rating":
      return `Pesquisa de satisfação (0–${(c.scale as number | undefined) ?? 10}) ao resolver a conversa`;
    case "ai":
      return "IA responde o cliente e transfere para humano quando necessário";
    case "keyword":
      return `Se contém: ${((c.keywords as string[] | undefined) ?? []).join(", ")} → responde`;
    case "business_hours":
      return `Fora de ${(c.start as string | undefined) ?? "09:00"}–${(c.end as string | undefined) ?? "18:00"} → responde`;
    default:
      return String(c.message ?? "").slice(0, 80);
  }
}

export function AutomationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: keys.automations, queryFn: automations.list });

  const reload = () => queryClient.invalidateQueries({ queryKey: keys.automations });

  const create = useMutation({
    mutationFn: (body: NewAutomation) => automations.create(body),
    onSuccess: reload,
  });

  const toggle = useMutation({
    mutationFn: (a: Automation) => automations.update(a.id, { isActive: !a.isActive }),
    onSuccess: reload,
  });

  const remove = useMutation({
    mutationFn: (a: Automation) => automations.remove(a.id),
    onSuccess: reload,
  });

  return (
    <>
      <h2>Automações</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 620 }}>
        Regras que respondem ou roteiam a conversa sozinhas quando o cliente escreve — no chat do
        site e no WhatsApp. A resposta do bot aparece no painel, no chat e vai ao WhatsApp do
        cliente (se conectado).
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <AutomationForm
          onCreate={(body) => create.mutateAsync(body)}
          isPending={create.isPending}
          error={create.error}
        />

        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Regras ativas</div>
          {(toggle.error ?? remove.error) && <ErrorBox error={toggle.error ?? remove.error} />}

          <Async {...query} onRetry={() => void query.refetch()}>
            {({ data: list }) =>
              list.length === 0 ? (
                <p className="muted">Nenhuma regra ainda. Crie a primeira ao lado.</p>
              ) : (
                <>
                  {list.map((a) => {
                    const meta = AUTOMATION_TYPE_META[a.type] ?? {
                      icon: "⚙️",
                      label: a.type,
                      hint: "",
                    };
                    return (
                      <div
                        key={a.id}
                        className="card"
                        style={{ padding: 14, marginBottom: 10, opacity: a.isActive ? 1 : 0.55 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{meta.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{a.name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {meta.label}
                            </div>
                          </div>
                          <span
                            className="tag"
                            style={{
                              background: a.isActive ? "#dcfce7" : "#f1f5f9",
                              color: a.isActive ? "#166534" : "#64748b",
                            }}
                          >
                            {a.isActive ? "ativa" : "pausada"}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                          {describe(a)}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button className="link" onClick={() => toggle.mutate(a)}>
                            {a.isActive ? "Pausar" : "Ativar"}
                          </button>
                          <button
                            className="link"
                            style={{ color: "#dc2626" }}
                            onClick={() => {
                              if (confirm(`Remover a regra "${a.name}"?`)) remove.mutate(a);
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            }
          </Async>
        </div>
      </div>
    </>
  );
}
