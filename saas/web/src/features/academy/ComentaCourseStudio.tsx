import { useState } from "react";
import { http } from "../../lib/http";
import type { CourseLevel } from "@comenta/shared";

interface ComentaCourseStudioProps {
  onSuccess?: (courseId: string) => void;
  onClose?: () => void;
}

export function ComentaCourseStudio({ onSuccess, onClose }: ComentaCourseStudioProps) {
  const [studentDesire, setStudentDesire] = useState(
    "Aprender a vender R$ 50 mil por mês no WhatsApp usando Atendente IA e Automações"
  );
  const [teacherMethodology, setTeacherMethodology] = useState(
    "Metodologia ABACS 4 Passos: 1. Qualificação de Leads, 2. Envio de Oferta Irresistível, 3. Cobrança e Follow-up, 4. Pós-Venda Automático"
  );
  const [level, setLevel] = useState<CourseLevel>("iniciante");
  const [lessonCount, setLessonCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepText, setStepText] = useState("");
  const [generatedCourse, setGeneratedCourse] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerateCourse = async () => {
    if (!studentDesire.trim()) return;
    setIsGenerating(true);
    setErrorMsg("");
    setGeneratedCourse(null);

    try {
      setStepText("🧠 [1/4] Analisando Desejo do Aluno e Instruções do Professor com IA Google Gemini...");
      await new Promise((r) => setTimeout(r, 1200));

      setStepText("📝 [2/4] Gerando Estrutura Didática & Roteiro de Vídeo para cada Aula...");
      await new Promise((r) => setTimeout(r, 1500));

      setStepText("🎙️ [3/4] Sintetizando Narração em PT-BR e Cenas Photorealistas...");
      await new Promise((r) => setTimeout(r, 1200));

      setStepText("🎓 [4/4] Publicando Curso e Montando Player de Vídeo Próprio...");

      const res = await http.post<any>("/courses/generate-full-course", {
        studentDesire,
        teacherMethodology,
        level,
        lessonCount,
      });

      setGeneratedCourse(res);
      setStepText("🎉 Curso Personalizado Gerado com Sucesso!");
      if (onSuccess && res.course?.id) onSuccess(res.course.id);
    } catch (err: any) {
      setErrorMsg(err?.message || "Falha ao gerar o curso. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(5, 5, 8, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 680,
          background: "#121318",
          color: "#fff",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          padding: 26,
          position: "relative",
        }}
      >
        {/* Header do Studio */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: "linear-gradient(135deg, #6d28d9, #4285f4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                boxShadow: "0 8px 20px rgba(109,40,217,0.4)",
              }}
            >
              🎓
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Studio Gerador de Cursos IA</h3>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Gere o curso completo com videoaulas de 1 minuto segundo a instrução do professor e o desejo do aluno
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: 0,
                color: "#fff",
                width: 34,
                height: 34,
                borderRadius: 17,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Formulário do Gerador */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6, display: "block" }}>
              🎯 Desejo de Aprendizado do Aluno (O que ele quer aprender?)
            </label>
            <textarea
              rows={2}
              value={studentDesire}
              onChange={(e) => setStudentDesire(e.target.value)}
              placeholder="Ex.: Aprender a vender R$ 50 mil por mês no WhatsApp com IA Sofia e automações"
              disabled={isGenerating}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#1e2028",
                border: "1px solid #334155",
                color: "#fff",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6, display: "block" }}>
              📚 Instrução / Metodologia do Professor (Como o professor ensina?)
            </label>
            <textarea
              rows={2}
              value={teacherMethodology}
              onChange={(e) => setTeacherMethodology(e.target.value)}
              placeholder="Ex.: Metodologia ABACS em 4 Passos: Qualificação, Oferta Irresistível, Cobrança e Pós-Venda"
              disabled={isGenerating}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#1e2028",
                border: "1px solid #334155",
                color: "#fff",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6, display: "block" }}>
                Nível do Aluno
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CourseLevel)}
                disabled={isGenerating}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#1e2028",
                  border: "1px solid #334155",
                  color: "#fff",
                  fontSize: 13,
                }}
              >
                <option value="iniciante">🟢 Iniciante</option>
                <option value="intermediario">🟡 Intermediário</option>
                <option value="avancado">🔴 Avançado</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6, display: "block" }}>
                Qtd. de Aulas de 1 Minuto
              </label>
              <select
                value={lessonCount}
                onChange={(e) => setLessonCount(Number(e.target.value))}
                disabled={isGenerating}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#1e2028",
                  border: "1px solid #334155",
                  color: "#fff",
                  fontSize: 13,
                }}
              >
                <option value={3}>3 Aulas (Formação Rápida)</option>
                <option value={4}>4 Aulas (Trilha Completa de 4 Minutos)</option>
              </select>
            </div>
          </div>

          {/* Feedback de Progresso */}
          {isGenerating && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(109,40,217,0.15), rgba(66,133,244,0.15))",
                border: "1px solid #6d28d9",
                borderRadius: 14,
                padding: 14,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{stepText}</div>
              <div
                style={{
                  height: 6,
                  background: "#334155",
                  borderRadius: 3,
                  marginTop: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #6d28d9, #4285f4)",
                    animation: "pulse 1.5s infinite",
                    width: "85%",
                  }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: "rgba(220,38,38,0.2)", border: "1px solid #dc2626", color: "#fca5a5", padding: 12, borderRadius: 10, fontSize: 13 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Resultado do Curso Criado */}
          {generatedCourse && (
            <div style={{ background: "#1e2028", borderRadius: 14, padding: 14, border: "1px solid #334155" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#10b981", marginBottom: 6 }}>
                🎉 {generatedCourse.message}
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                <strong>Curso:</strong> {generatedCourse.course?.title}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                <strong>Aulas Geradas:</strong> {generatedCourse.lessons?.length} videoaulas com o Player Próprio Comenta.
              </div>
            </div>
          )}

          {/* Botões */}
          <div style={{ marginTop: 8, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "#334155",
                  color: "#fff",
                  border: 0,
                  padding: "10px 18px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {generatedCourse ? "Fechar Studio" : "Cancelar"}
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateCourse}
              disabled={isGenerating || !studentDesire.trim()}
              style={{
                background: "linear-gradient(135deg, #6d28d9, #4285f4)",
                color: "#fff",
                border: 0,
                padding: "10px 22px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(109,40,217,0.4)",
              }}
            >
              {isGenerating ? "Gerando Curso..." : "🚀 Criar Curso com IA do Professor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
