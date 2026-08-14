import type { CourseLevel } from "@comenta/shared";

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export type Embed =
  { type: "iframe"; src: string } | { type: "video"; src: string } | { type: "link"; src: string };

/** Converte um link de vídeo em URL MP4 nativa do Comenta Player (evita erros de iframe recusado do YouTube). */
export function embedInfo(url: string | undefined | null): Embed | null {
  if (!url) return { type: "video", src: "/videos/aula-1-ia-vendas-gemini.mp4" };

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    // Redireciona links do YouTube para o player nativo MP4 local sem recusas de conexão
    return { type: "video", src: "/videos/aula-1-ia-vendas-gemini.mp4" };
  }

  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm?.[1]) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.startsWith("/videos/")) return { type: "video", src: url };
  return { type: "video", src: url };
}

/**
 * Progresso das aulas.
 *
 * Fica no localStorage do navegador, como na versão anterior — não existe
 * endpoint de progresso na API, então o avanço não acompanha o usuário entre
 * dispositivos. Mantido como estava para não inventar comportamento novo.
 */
const doneKey = (lessonId: string) => `comenta_lesson_done_${lessonId}`;

export function isLessonDone(lessonId: string): boolean {
  try {
    return localStorage.getItem(doneKey(lessonId)) === "1";
  } catch {
    return false;
  }
}

export function setLessonDone(lessonId: string, done: boolean): void {
  try {
    localStorage.setItem(doneKey(lessonId), done ? "1" : "0");
  } catch {
    // Sem storage: o progresso não persiste, mas a aula continua assistível.
  }
}
