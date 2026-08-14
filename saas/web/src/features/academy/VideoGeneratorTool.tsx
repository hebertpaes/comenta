import { useState } from "react";
import { http } from "../../lib/http";

interface VideoGeneratorToolProps {
  courseId: string;
  lessonId?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function VideoGeneratorTool({ courseId, lessonId, onSuccess, onClose }: VideoGeneratorToolProps) {
  const [topic, setTopic] = useState("Formação Atendente IA & Vendas no WhatsApp");
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepText, setStepText] = useState("");
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setErrorMsg("");
    setGeneratedResult(null);

    try {
      setStepText("✍️ [1/4] Escrevendo Roteiro & Cronograma de 1 Minuto com Google Gemini...");
      await new Promise((r) => setTimeout(r, 1200));

      setStepText("🎨 [2/4] Gerando Imagens Photorealistas das 4 Cenas do Vídeo...");
      await new Promise((r) => setTimeout(r, 1500));

      setStepText("🎙️ [3/4] Sintetizando Narração em Português com Tom Comercial...");
      await new Promise((r) => setTimeout(r, 1200));

      setStepText("🎞️ [4/4] Renderizando Vídeo MP4 HD Final e Anexando ao Curso...");

      const res = await http.post<any>("/courses/generate-video", {
        courseId,
        lessonId,
        topic,
        durationSeconds,
      });

      setGeneratedResult(res);
      setStepText("🎉 Vídeo de 1 Minuto Gerado com Sucesso!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || "Falha ao gerar o vídeo. Tente novamente.");
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
          maxWidth: 640,
          background: "#121318",
          color: "#fff",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          padding: 24,
          position: "relative",
        }}
      >
        {/* Header do Studio */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: "linear-gradient(135deg, #a855f7, #ef4444)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 6px 16px rgba(168,85,247,0.4)",
              }}
            >
              🎬
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Studio Gerador de Vídeos IA</h3>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Crie narração em PT-BR e imagens photorealistas para aulas de 1 minuto
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
                width: 32,
                height: 32,
                borderRadius: 16,
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
              Tema Principal da Aula
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: Formação Atendente IA & Vendas no WhatsApp com Google Gemini"
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
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6, display: "block" }}>
              Duração do Vídeo
            </label>
            <select
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
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
              <option value={60}>⏱️ 1 Minuto (Recomendado — 4 Cenas + Narração)</option>
              <option value={30}>⚡ 30 Segundos (Teaser Rápido)</option>
            </select>
          </div>

          {/* Feedback de Progresso da IA */}
          {isGenerating && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(239,68,68,0.15))",
                border: "1px solid #a855f7",
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
                    background: "linear-gradient(90deg, #a855f7, #ef4444)",
                    animation: "pulse 1.5s infinite",
                    width: "80%",
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

          {/* Resultado Gerado */}
          {generatedResult && (
            <div style={{ background: "#1e2028", borderRadius: 14, padding: 14, border: "1px solid #334155" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981", marginBottom: 8 }}>
                ✅ Vídeo Gerado com Sucesso!
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
                O vídeo de 1 minuto foi anexado ao curso e está pronto no player.
              </div>

              {/* Preview da Narração */}
              <div style={{ fontSize: 11, background: "#0f172a", padding: 10, borderRadius: 8, color: "#cbd5e1", maxHeight: 120, overflowY: "auto" }}>
                <strong>🎙️ Roteiro da Narração em PT-BR:</strong>
                {generatedResult.scriptNarracao?.map((s: any, idx: number) => (
                  <div key={idx} style={{ marginTop: 6 }}>
                    <span style={{ color: "#a855f7" }}>[{s.timestamp}]</span> {s.narracao}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão de Ação */}
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
                {generatedResult ? "Fechar Studio" : "Cancelar"}
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              style={{
                background: "linear-gradient(135deg, #a855f7, #ef4444)",
                color: "#fff",
                border: 0,
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(168,85,247,0.4)",
              }}
            >
              {isGenerating ? "Gerando Vídeo..." : "🚀 Gerar Vídeo IA de 1 Minuto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
