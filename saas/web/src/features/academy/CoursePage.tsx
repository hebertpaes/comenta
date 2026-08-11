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

  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("aula");

  const [progressTick, setProgressTick] = useState(0);
  const [modoReels, setModoReels] = useState(true);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [curtido, setCurtido] = useState<Record<string, boolean>>({});

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

  const alternarLike = (lessonId: string) => {
    setCurtido((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
    setLikes((prev) => ({
      ...prev,
      [lessonId]: (prev[lessonId] || 142) + (curtido[lessonId] ? -1 : 1),
    }));
  };

  return (
    <Async {...query} onRetry={() => void query.refetch()}>
      {(course) => {
        const lessons = course.lessons ?? [];
        const lesson = lessons.find((l) => l.id === selected) ?? lessons[0] ?? null;

        void progressTick;
        const done = lessons.filter((l) => isLessonDone(l.id)).length;
        const total = lessons.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const emb = lesson ? embedInfo(lesson.videoUrl) : null;
        const lessonDone = lesson ? isLessonDone(lesson.id) : false;
        const indexAtual = lessons.findIndex((l) => l.id === lesson?.id);

        return (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Link className="link" to="/cursos">
                ← Voltar aos cursos
              </Link>

              {/* Seletor de Modo Reels / Tradicional */}
              <div style={{ display: "flex", gap: 8, background: "var(--panel2)", padding: 4, borderRadius: 20, border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setModoReels(true)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    background: modoReels ? "linear-gradient(135deg, #4285f4, #d96570)" : "transparent",
                    color: modoReels ? "#fff" : "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  📱 Modo Vertical (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => setModoReels(false)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    background: !modoReels ? "var(--panel)" : "transparent",
                    color: !modoReels ? "var(--text)" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  📺 Modo Cinema (16:9)
                </button>
              </div>
            </div>

            <h2 style={{ marginTop: 0 }}>
              {course.emoji} {course.title}
            </h2>
            <p className="muted" style={{ marginTop: -8, maxWidth: 680 }}>
              {course.description}
            </p>

            <div style={{ maxWidth: 680, marginBottom: 16 }}>
              <div style={{ height: 8, background: "#eef0f4", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#6d28d9" }} />
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {done}/{total} aulas concluídas · {pct}%
              </div>
            </div>

            {(addLesson.error ?? removeLesson.error) && (
              <ErrorBox error={addLesson.error ?? removeLesson.error} />
            )}

            {/* MODO REELS / SHORTS (VERTICAL 9:16) - RESPONSIVO */}
            {modoReels ? (
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginTop: 20, width: "100%" }}>
                {/* Player Estilo Reels / Shorts Vertical (Responsivo) */}
                <div
                  style={{
                    width: "min(360px, 100%)",
                    height: "min(640px, 80vh)",
                    maxWidth: "100%",
                    borderRadius: 24,
                    background: "#000",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                    border: "3px solid #2e2f31",
                    flex: "none",
                    margin: "0 auto",
                  }}
                >
                  {/* Vídeo / Iframe */}
                  {emb?.type === "iframe" && (
                    <iframe
                      src={emb.src}
                      title={lesson?.title ?? "Aula"}
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
                  )}
                  {emb?.type === "video" && (
                    <video
                      src={emb.src}
                      controls
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  {(!emb || emb.type === "link") && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: 20, textAlign: "center" }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{lesson?.title}</div>
                      <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>{lesson?.content}</p>
                    </div>
                  )}

                  {/* Overlay Lateral Direito Estilo TikTok/Reels */}
                  {lesson && (
                    <div
                      style={{
                        position: "absolute",
                        right: 12,
                        bottom: 80,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        alignItems: "center",
                        zIndex: 20,
                      }}
                    >
                      {/* Botão de Like */}
                      <button
                        type="button"
                        onClick={() => alternarLike(lesson.id)}
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: curtido[lesson.id] ? "#ef4444" : "#fff",
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          cursor: "pointer",
                        }}
                      >
                        ❤️
                        <span style={{ fontSize: 9, color: "#fff", marginTop: 2, fontWeight: 700 }}>
                          {likes[lesson.id] || 142}
                        </span>
                      </button>

                      {/* Botão Concluída */}
                      <button
                        type="button"
                        onClick={() => {
                          setLessonDone(lesson.id, !lessonDone);
                          setProgressTick((n) => n + 1);
                        }}
                        style={{
                          background: lessonDone ? "#22c55e" : "rgba(0,0,0,0.6)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          cursor: "pointer",
                        }}
                        title={lessonDone ? "Aula Concluída" : "Marcar como Concluída"}
                      >
                        {lessonDone ? "✅" : "✔️"}
                      </button>

                      {/* Próxima Aula */}
                      {indexAtual < lessons.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setSearchParams({ aula: lessons[indexAtual + 1]!.id })}
                          style={{
                            background: "rgba(0,0,0,0.6)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            cursor: "pointer",
                          }}
                          title="Próxima Aula"
                        >
                          ⬇️
                        </button>
                      )}
                    </div>
                  )}

                  {/* Overlay Inferior com Autor & Título da Aula */}
                  {lesson && (
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        bottom: 16,
                        right: 70,
                        zIndex: 20,
                        color: "#fff",
                        textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 13 }}>@ComentaAcademy ✦</span>
                        <span style={{ background: "#4285f4", fontSize: 9, padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>
                          VERIFICADO
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{lesson.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {lesson.content || "Assista a esta aula para dominar o atendimento com IA."}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de Aulas e Navegação ao Lado */}
                <div className="card" style={{ flex: 1, minWidth: 280, padding: 16, alignItems: "stretch" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                    📋 Aulas do Curso ({lessons.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 540, overflowY: "auto" }}>
                    {lessons.map((l, i) => (
                      <div
                        key={l.id}
                        onClick={() => setSearchParams({ aula: l.id })}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          background: lesson?.id === l.id ? "var(--panel2)" : "transparent",
                          border: lesson?.id === l.id ? "2px solid #6d28d9" : "1px solid var(--border)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            {isLessonDone(l.id) ? "✅ " : `${i + 1}. `}
                            {l.title}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {l.durationMin ? `${l.durationMin} min` : "Vídeo Shorts"}
                          </div>
                        </div>
                        {lesson?.id === l.id && (
                          <span style={{ fontSize: 11, background: "#6d28d9", color: "#fff", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                            ASSISTINDO
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {isAdmin && (
                    <LessonForm
                      onCreate={(body) => addLesson.mutateAsync(body)}
                      isPending={addLesson.isPending}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* MODO TRADICIONAL (16:9) */
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
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
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
            )}
          </>
        );
      }}
    </Async>
  );
}
