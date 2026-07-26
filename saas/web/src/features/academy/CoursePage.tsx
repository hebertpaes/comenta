import type { Lesson } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { courses } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { useAuth } from "../../auth/useAuth";
import { Async, ErrorBox } from "../../components/Async";
import { embedInfo, isLessonDone, setLessonDone } from "./lessons";

interface LessonDraft {
  title: string;
  videoUrl: string;
  content: string;
  durationMin: string;
}

const EMPTY: LessonDraft = { title: "", videoUrl: "", content: "", durationMin: "" };

/** Formulário admin para adicionar uma aula a um curso. */
function LessonForm({
  onCreate,
  isPending,
}: {
  onCreate: (body: Partial<Lesson>) => Promise<unknown>;
  isPending: boolean;
}) {
  const [form, setForm] = useState<LessonDraft>(EMPTY);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onCreate({
      title: form.title.trim(),
      videoUrl: form.videoUrl.trim(),
      content: form.content.trim(),
      durationMin: Number(form.durationMin) || 0,
    });
    setForm(EMPTY);
  };

  return (
    <form
      onSubmit={submit}
      style={{ marginTop: 12, borderTop: "1px dashed #d0d5dd", paddingTop: 12 }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Adicionar aula</div>
      <div className="field">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Título da aula"
        />
      </div>
      <div className="field">
        <input
          value={form.videoUrl}
          onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
          placeholder="Link do vídeo (YouTube, Vimeo ou .mp4) — opcional"
        />
      </div>
      <div className="field">
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={2}
          placeholder="Conteúdo / resumo da aula"
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
      <button disabled={isPending} className="link">
        {isPending ? "…" : "＋ Adicionar aula"}
      </button>
    </form>
  );
}

export function CoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // A aula selecionada vai na query string, então dá para linkar direto para
  // uma aula específica em vez de sempre abrir a primeira.
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("aula");

  // O progresso mora no localStorage; este contador força o re-render depois de
  // marcar/desmarcar, já que não há estado de servidor envolvido.
  const [progressTick, setProgressTick] = useState(0);

  const query = useQuery({
    queryKey: keys.course(courseId ?? ""),
    queryFn: () => courses.get(courseId as string),
    enabled: Boolean(courseId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: keys.course(courseId ?? "") });
    void queryClient.invalidateQueries({ queryKey: keys.courses });
  };

  const addLesson = useMutation({
    mutationFn: (body: Partial<Lesson>) => courses.addLesson(courseId as string, body),
    onSuccess: invalidate,
  });

  const removeLesson = useMutation({
    mutationFn: (lessonId: string) => courses.removeLesson(lessonId),
    onSuccess: () => {
      setSearchParams({}, { replace: true });
      invalidate();
    },
  });

  return (
    <Async {...query} onRetry={() => void query.refetch()}>
      {(course) => {
        const lessons = course.lessons ?? [];
        const lesson = lessons.find((l) => l.id === selected) ?? lessons[0] ?? null;

        // progressTick entra na conta só para o React recalcular após a troca.
        void progressTick;
        const done = lessons.filter((l) => isLessonDone(l.id)).length;
        const total = lessons.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const emb = lesson ? embedInfo(lesson.videoUrl) : null;
        const lessonDone = lesson ? isLessonDone(lesson.id) : false;

        return (
          <>
            <Link className="link" to="/cursos">
              ← Voltar aos cursos
            </Link>
            <h2 style={{ marginTop: 6 }}>
              {course.emoji} {course.title}
            </h2>
            <p className="muted" style={{ marginTop: -8, maxWidth: 680 }}>
              {course.description}
            </p>

            <div style={{ maxWidth: 680, marginBottom: 16 }}>
              <div
                style={{ height: 8, background: "#eef0f4", borderRadius: 999, overflow: "hidden" }}
              >
                <div style={{ width: `${pct}%`, height: "100%", background: "#6d28d9" }} />
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {done}/{total} aulas concluídas · {pct}%
              </div>
            </div>

            {(addLesson.error ?? removeLesson.error) && (
              <ErrorBox error={addLesson.error ?? removeLesson.error} />
            )}

            <div className="convgrid">
              <div className="list">
                {lessons.length === 0 && <div className="item muted">Sem aulas ainda</div>}
                {lessons.map((l, i) => (
                  <div
                    key={l.id}
                    className={`item ${lesson?.id === l.id ? "active" : ""}`}
                    onClick={() => setSearchParams({ aula: l.id })}
                  >
                    <div className="name">
                      {isLessonDone(l.id) ? "✅ " : `${i + 1}. `}
                      {l.title}
                    </div>
                    <div className="last">{l.durationMin ? `${l.durationMin} min` : "aula"}</div>
                  </div>
                ))}
                {isAdmin && (
                  <LessonForm
                    onCreate={(body) => addLesson.mutateAsync(body)}
                    isPending={addLesson.isPending}
                  />
                )}
              </div>

              <div className="thread">
                {!lesson && <p className="muted">Selecione uma aula</p>}
                {lesson && (
                  <>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
                    >
                      <span style={{ fontWeight: 600 }}>{lesson.title}</span>
                      {isAdmin && (
                        <button
                          className="link"
                          style={{ marginLeft: "auto", color: "#dc2626" }}
                          onClick={() => {
                            if (confirm("Remover esta aula?")) removeLesson.mutate(lesson.id);
                          }}
                        >
                          Remover aula
                        </button>
                      )}
                    </div>

                    {emb?.type === "iframe" && (
                      <div
                        style={{
                          position: "relative",
                          paddingTop: "56.25%",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#000",
                        }}
                      >
                        <iframe
                          src={emb.src}
                          title={lesson.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            border: 0,
                          }}
                        />
                      </div>
                    )}
                    {emb?.type === "video" && (
                      <video
                        src={emb.src}
                        controls
                        style={{ width: "100%", borderRadius: 12, background: "#000" }}
                      />
                    )}
                    {emb?.type === "link" && (
                      <a
                        href={emb.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aibox"
                        style={{ display: "block" }}
                      >
                        ▶ Abrir vídeo em nova aba
                      </a>
                    )}

                    {lesson.content && (
                      <p style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                        {lesson.content}
                      </p>
                    )}

                    <div style={{ marginTop: 14 }}>
                      <button
                        onClick={() => {
                          setLessonDone(lesson.id, !lessonDone);
                          setProgressTick((n) => n + 1);
                        }}
                        style={{
                          background: lessonDone ? "#e2e8f0" : "#22c55e",
                          color: lessonDone ? "#334155" : "#fff",
                          border: 0,
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {lessonDone ? "✓ Concluída — desmarcar" : "Marcar como concluída"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        );
      }}
    </Async>
  );
}
