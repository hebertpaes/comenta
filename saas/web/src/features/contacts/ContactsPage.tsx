import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { contacts } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";
import { contactsToCsv, downloadCsv, parseContactsCsv } from "./csv";
import type { ContactImportRow } from "./csv";

const inputStyle = { padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" } as const;

export function ContactsPage() {
  const queryClient = useQueryClient();

  // `search` é o termo já aplicado; `term` é o que está sendo digitado. Assim a
  // busca só dispara ao enviar o formulário, como antes.
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [importNotice, setImportNotice] = useState("");

  const query = useQuery({
    queryKey: keys.contacts(search),
    queryFn: () => contacts.list(search || undefined),
  });
  const reload = () => queryClient.invalidateQueries({ queryKey: ["contacts"] });

  const create = useMutation({
    mutationFn: () =>
      contacts.create({
        name: name.trim(),
        phone: phone.replace(/\D/g, "") || null,
        email: email.trim() || null,
      }),
    onSuccess: () => {
      setName("");
      setPhone("");
      setEmail("");
      void reload();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => contacts.remove(id),
    onSuccess: reload,
  });

  const importRows = useMutation({
    mutationFn: (rows: ContactImportRow[]) => contacts.import(rows),
    onSuccess: (r) => {
      setImportNotice(`Importados: ${r.imported} · pulados: ${r.skipped}`);
      void reload();
    },
  });

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const rows = parseContactsCsv(await file.text());
    if (rows.length === 0) {
      setImportNotice("Nenhum contato válido no arquivo.");
      return;
    }
    setImportNotice("");
    importRows.mutate(rows);
  };

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) create.mutate();
  };

  const list = query.data?.data ?? [];
  const mutationError = create.error ?? remove.error ?? importRows.error;

  return (
    <>
      <h2>Contatos</h2>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(term.trim());
          }}
          style={{ display: "flex", gap: 6 }}
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nome/telefone…"
            aria-label="Buscar contatos"
            style={{ ...inputStyle, width: 240 }}
          />
          <button>Buscar</button>
        </form>

        <button onClick={() => downloadCsv("contatos.csv", contactsToCsv(list))}>
          ⬇️ Exportar CSV
        </button>

        <label
          style={{
            cursor: "pointer",
            background: "#6d28d9",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {importRows.isPending ? "Importando…" : "⬆️ Importar CSV"}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onImportFile}
            style={{ display: "none" }}
          />
        </label>

        {importNotice && (
          <span className="muted" style={{ fontSize: 13 }}>
            {importNotice}
          </span>
        )}
      </div>

      <form
        onSubmit={submitCreate}
        className="card"
        style={{
          padding: 14,
          marginBottom: 16,
          flexDirection: "row",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          aria-label="Nome do contato"
          style={{ ...inputStyle, flex: "1 1 160px" }}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone (DDD)"
          aria-label="Telefone"
          style={{ ...inputStyle, flex: "1 1 140px" }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail (opcional)"
          aria-label="E-mail"
          style={{ ...inputStyle, flex: "1 1 180px" }}
        />
        <button disabled={create.isPending}>{create.isPending ? "…" : "➕ Adicionar"}</button>
      </form>

      {mutationError && <ErrorBox error={mutationError} />}

      <Async {...query} onRetry={() => void query.refetch()}>
        {(page) =>
          page.data.length === 0 ? (
            <p className="muted">Nenhum contato.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {page.data.map((c) => (
                <div
                  key={c.id}
                  className="card"
                  style={{
                    padding: 12,
                    flexDirection: "row",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {c.phone ? `📱 ${c.phone}` : ""} {c.email ? `· ✉️ ${c.email}` : ""}
                    </div>
                  </div>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#22c55e",
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      WhatsApp
                    </a>
                  )}
                  <button
                    className="link"
                    style={{ color: "#dc2626" }}
                    onClick={() => {
                      if (confirm("Remover este contato?")) remove.mutate(c.id);
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )
        }
      </Async>
    </>
  );
}
