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
  const [aspectRatioMode, setAspectRatioMode] = useState<"16/9" | "9/16" | "1/1">("16/9");
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
          <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
            {/* Header de Navegação do Curso */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <Link className="link" to="/cursos" style={{ fontWeight: 600 }}>
                ← Voltar aos cursos
              </Link>

              {/* Seletor do Formato de Vídeo Responsivo (16:9 Cinema / 9:16 Vertical / 1:1 Quadrado) */}
              <div style={{ display: "flex", gap: 6, background: "var(--panel2)", padding: 4, borderRadius: 20, border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setAspectRatioMode("16/9")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    background: aspectRatioMode === "16/9" ? "linear-gradient(135deg, #6d28d9, #4285f4)" : "transparent",
                    color: aspectRatioMode === "16/9" ? "#fff" : "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  📺 Widescreen 16:9
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatioMode("9/16")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    background: aspectRatioMode === "9/16" ? "linear-gradient(135deg, #ff7700, #ff0055)" : "transparent",
                    color: aspectRatioMode === "9/16" ? "#fff" : "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  📱 Vertical 9:16 (Reels)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatioMode("1/1")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    background: aspectRatioMode === "1/1" ? "linear-gradient(135deg, #10b981, #06b6d4)" : "transparent",
                    color: aspectRatioMode === "1/1" ? "#fff" : "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  🔳 Quadrado 1:1
                </button>
              </div>
            </div>

            <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 800 }}>
              {course.emoji} {course.title}
            </h2>
            <p className="muted" style={{ marginTop: -4, maxWidth: 720, fontSize: 14 }}>
              {course.description}
            </p>

            {/* Barra de Progresso do Curso */}
            <div style={{ maxWidth: 720, marginBottom: 20 }}>
              <div style={{ height: 8, background: "#eef0f4", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #6d28d9, #4285f4)", transition: "width 0.3s ease" }} />
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                {done}/{total} aulas concluídas · {pct}% de progresso
              </div>
            </div>

            {(addLesson.error ?? removeLesson.error) && (
              <ErrorBox error={addLesson.error ?? removeLesson.error} />
            )}

            {/* LAYOUT PRINCIPAL RESPONSIVO 100% FLUIDO */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, width: "100%", alignItems: "flex-start" }}>
              
              {/* COLUNA ESQUERDA / CENTRAL: PLAYER DE VÍDEO RESPONSIVO */}
              <div className="card" style={{ padding: 18, alignItems: "stretch", background: "var(--panel)", borderRadius: 20 }}>
                {!lesson && <p className="muted">Selecione uma aula na lista</p>}
                {lesson && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "#6d28d9", letterSpacing: 0.5 }}>
                          Aula {indexAtual + 1} de {lessons.length}
                        </span>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{lesson.title}</h3>
                      </div>
                      {isAdmin && (
                        <button
                          className="link"
                          style={{ color: "#dc2626", fontSize: 12 }}
                          onClick={() => {
                            if (confirm("Remover esta aula?")) removeLesson.mutate(lesson.id);
                          }}
                        >
                          Remover aula
                        </button>
                      )}
                    </div>

                    {/* CONTAINER DO PLAYER COM ASPECT RATIO RESPONSIVO AJUSTÁVEL */}
                    <div
                      style={{
                        width: "100%",
                        maxWidth: aspectRatioMode === "9/16" ? 380 : "100%",
                        aspectRatio: aspectRatioMode,
                        margin: aspectRatioMode === "9/16" ? "0 auto" : 0,
                        borderRadius: 18,
                        overflow: "hidden",
                        background: "#000",
                        position: "relative",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                        border: "1px solid var(--border)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {emb?.type === "iframe" && (
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
                            objectFit: aspectRatioMode === "9/16" ? "cover" : "contain",
                          }}
                        />
                      )}
                      {emb?.type === "video" && (
                        <video
                          src={emb.src}
                          controls
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: aspectRatioMode === "9/16" ? "cover" : "contain",
                          }}
                        />
                      )}
                      {(!emb || emb.type === "link") && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: 24, textAlign: "center" }}>
                          <div style={{ fontSize: 52, marginBottom: 12 }}>🎬</div>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>{lesson.title}</div>
                          <p style={{ fontSize: 13, opacity: 0.8, marginTop: 8, maxWidth: 400 }}>
                            {lesson.content || "Assista a esta aula completa do treinamento Comenta Academy."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* CONTROLES E AÇÕES DA AULA */}
                    <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setLessonDone(lesson.id, !lessonDone);
                            setProgressTick((n) => n + 1);
                          }}
                          style={{
                            background: lessonDone ? "#22c55e" : "#6d28d9",
                            color: "#fff",
                            border: 0,
                            padding: "9px 18px",
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            boxShadow: lessonDone ? "0 4px 12px rgba(34,197,94,0.3)" : "0 4px 12px rgba(109,40,217,0.3)",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {lessonDone ? "✅ Concluída (Desmarcar)" : "✓ Marcar como Concluída"}
                        </button>

                        <button
                          type="button"
                          onClick={() => alternarLike(lesson.id)}
                          style={{
                            background: curtido[lesson.id] ? "rgba(239,68,68,0.15)" : "var(--panel2)",
                            color: curtido[lesson.id] ? "#ef4444" : "var(--text)",
                            border: "1px solid var(--border)",
                            padding: "8px 14px",
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          ❤️ {likes[lesson.id] || 142} Curtidas
                        </button>
                      </div>

                      {/* Botões de Navegação Anterior / Próxima */}
                      <div style={{ display: "flex", gap: 8 }}>
                        {indexAtual > 0 && (
                          <button
                            type="button"
                            onClick={() => setSearchParams({ aula: lessons[indexAtual - 1]!.id })}
                            style={{
                              background: "var(--panel2)",
                              color: "var(--text)",
                              border: "1px solid var(--border)",
                              padding: "8px 14px",
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            ← Anterior
                          </button>
                        )}
                        {indexAtual < lessons.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setSearchParams({ aula: lessons[indexAtual + 1]!.id })}
                            style={{
                              background: "var(--panel2)",
                              color: "var(--text)",
                              border: "1px solid var(--border)",
                              padding: "8px 14px",
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Próxima →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Descrição / Conteúdo da Aula */}
                    {lesson.content && (
                      <div style={{ marginTop: 16, background: "var(--panel2)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📝 Resumo & Material de Apoio</div>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13, color: "var(--text)" }}>
                          {lesson.content}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* COLUNA DIREITA: LISTA DE AULAS DO CURSO */}
              <div className="card" style={{ padding: 18, alignItems: "stretch", background: "var(--panel)", borderRadius: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>📋 Aulas do Curso ({lessons.length})</span>
                  <span style={{ fontSize: 11, background: "rgba(109, 40, 217, 0.15)", color: "#6d28d9", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                    {pct}% CONCLUÍDO
                  </span>
                </div>
                {lessons.length === 0 && <div className="item muted">Nenhuma aula cadastrada neste curso ainda.</div>}
                
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 560, overflowY: "auto", paddingRight: 4 }}>
                  {lessons.map((l, i) => {
                    const isSelected = lesson?.id === l.id;
                    const isDone = isLessonDone(l.id);
                    return (
                      <div
                        key={l.id}
                        onClick={() => setSearchParams({ aula: l.id })}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 14,
                          background: isSelected ? "linear-gradient(135deg, rgba(109,40,217,0.12), rgba(66,133,244,0.12))" : "var(--panel2)",
                          border: isSelected ? "2px solid #6d28d9" : "1px solid var(--border)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: 13, color: isSelected ? "#6d28d9" : "var(--text)" }}>
                            {isDone ? "✅ " : `${i + 1}. `}
                            {l.title}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {l.durationMin ? `⏱️ ${l.durationMin} min` : "📹 Videoaula"}
                          </div>
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: 10, background: "#6d28d9", color: "#fff", padding: "3px 8px", borderRadius: 10, fontWeight: 800 }}>
                            REPRODUZINDO
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isAdmin && (
                  <LessonForm
                    onCreate={(body) => addLesson.mutateAsync(body)}
                    isPending={addLesson.isPending}
                  />
                )}
              </div>
            </div>
          </div>
        );
      }}
    </Async>
  );
}
