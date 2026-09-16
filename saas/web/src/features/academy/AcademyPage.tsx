import type { Course, CourseLevel } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { courses } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { useAuth } from "../../auth/useAuth";
import { Async, ErrorBox } from "../../components/Async";
import { LEVEL_LABEL } from "./lessons";
import { ComentaCourseStudio } from "./ComentaCourseStudio";

interface CourseDraft {
  title: string;
  emoji: string;
  level: CourseLevel;
  description: string;
}

const EMPTY: CourseDraft = { title: "", emoji: "🎓", level: "iniciante", description: "" };

/** Formulário admin para criar um curso. */
function CourseForm({
  onCreate,
  isPending,
  error,
}: {
  onCreate: (body: CourseDraft) => Promise<unknown>;
  isPending: boolean;
  error: unknown;
}) {
  const [form, setForm] = useState<CourseDraft>(EMPTY);
  const [validation, setValidation] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setValidation("Dê um título ao curso.");
      return;
    }
    setValidation("");
    await onCreate({ ...form, title: form.title.trim() });
    setForm(EMPTY);
  };

  return (
    <form
      className="card"
      style={{
        padding: 16,
        marginBottom: 16,
        maxWidth: 620,
        textAlign: "left",
        alignItems: "stretch",
      }}
      onSubmit={submit}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Novo curso</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="field" style={{ width: 70 }}>
          <label htmlFor="course-emoji">Emoji</label>
          <input
            id="course-emoji"
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            maxLength={4}
            style={{ textAlign: "center" }}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="course-title">Título</label>
          <input
            id="course-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ex.: Atendimento nota 10"
          />
        </div>
        <div className="field" style={{ width: 150 }}>
          <label htmlFor="course-level">Nível</label>
          <select
            id="course-level"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value as CourseLevel })}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel2)",
              color: "var(--text)",
            }}
          >
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="course-description">Descrição</label>
        <textarea
          id="course-description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--panel2)",
            color: "var(--text)",
            resize: "vertical",
          }}
        />
      </div>

      {validation && (
        <div className="err" role="alert">
          {validation}
        </div>
      )}
      {error ? <ErrorBox error={error} /> : null}

      <button disabled={isPending} style={{ marginTop: 6, alignSelf: "flex-start" }}>
        {isPending ? "Salvando…" : "➕ Criar curso"}
      </button>
    </form>
  );
}

export function AcademyPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showStudioModal, setShowStudioModal] = useState(false);

  const query = useQuery({ queryKey: keys.courses, queryFn: courses.list });
  const reload = () => queryClient.invalidateQueries({ queryKey: keys.courses });

  const create = useMutation({
    mutationFn: (body: CourseDraft) => courses.create(body),
    onSuccess: reload,
  });
  const remove = useMutation({
    mutationFn: (c: Course) => courses.remove(c.id),
    onSuccess: reload,
  });

  return (
    <>
      <h2>Academia</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Cursos e treinamentos para a equipe dominar o Comenta e as ferramentas. Assista às aulas,
        marque como concluídas e acompanhe seu progresso.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setShowStudioModal(true)}
          style={{
            padding: "9px 20px",
            borderRadius: 14,
            border: 0,
            fontSize: 13,
            fontWeight: 800,
            background: "linear-gradient(135deg, #6d28d9, #4285f4)",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(109,40,217,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🚀 Studio Gerador de Cursos IA (Instrução do Professor + Desejo do Aluno)
        </button>
      </div>

      {showStudioModal && (
        <ComentaCourseStudio
          onClose={() => setShowStudioModal(false)}
          onSuccess={(courseId) => {
            setShowStudioModal(false);
            void reload();
            navigate(`/cursos/${courseId}`);
          }}
        />
      )}

      {isAdmin && (
        <CourseForm
          onCreate={(body) => create.mutateAsync(body)}
          isPending={create.isPending}
          error={create.error}
        />
      )}
      {remove.error && <ErrorBox error={remove.error} />}

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list }) =>
          list.length === 0 ? (
            <p className="muted">Nenhum curso ainda{isAdmin ? " — crie o primeiro acima." : "."}</p>
          ) : (
            <div
              className="cards"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
            >
              {list.map((c) => {
                const count = c.lessonCount ?? 0;
                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{ padding: 18, textAlign: "left", alignItems: "flex-start" }}
                  >
                    <div style={{ fontSize: 30 }}>{c.emoji}</div>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>{c.title}</div>
                    <span className="tag" style={{ margin: "6px 0" }}>
                      {LEVEL_LABEL[c.level] ?? c.level}
                    </span>
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                      {c.description}
                    </p>
                    <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                      {count} aula{count === 1 ? "" : "s"}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, width: "100%" }}>
                      <button
                        onClick={() => navigate(`/cursos/${c.id}`)}
                        style={{
                          background: "#6d28d9",
                          color: "#fff",
                          border: 0,
                          padding: "7px 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {count ? "Assistir" : "Abrir"}
                      </button>
                      {isAdmin && (
                        <button
                          className="link"
                          style={{ color: "#dc2626" }}
                          onClick={() => {
                            if (confirm(`Remover o curso "${c.title}"?`)) remove.mutate(c);
                          }}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Async>
    </>
  );
}
