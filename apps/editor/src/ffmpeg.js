import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { buildArgs } from "./buildArgs.js";

export { buildArgs };

// O core do FFmpeg (build UMD) é servido localmente a partir de public/ffmpeg/
// — copiado do node_modules pelo script scripts/copy-core.mjs. Assim não há
// dependência de CDN em runtime e funciona offline/em redes restritas.
const CORE_URL = `${import.meta.env.BASE_URL}ffmpeg/ffmpeg-core.js`;
const WASM_URL = `${import.meta.env.BASE_URL}ffmpeg/ffmpeg-core.wasm`;

let ffmpeg = null;
let loadingPromise = null;

/**
 * Garante que a instância do FFmpeg esteja carregada (uma única vez).
 * @param {(msg: string) => void} [onLog] callback opcional para logs.
 */
export async function getFFmpeg(onLog) {
  if (ffmpeg) return ffmpeg;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const instance = new FFmpeg();
    if (onLog) {
      instance.on("log", ({ message }) => onLog(message));
    }
    // Reembrulhamos em blob URLs same-origin para funcionar mesmo sob COEP.
    await instance.load({
      coreURL: await toBlobURL(CORE_URL, "text/javascript"),
      wasmURL: await toBlobURL(WASM_URL, "application/wasm"),
    });
    ffmpeg = instance;
    return instance;
  })();

  return loadingPromise;
}

/**
 * Registra callback de progresso (0..1).
 * @param {(ratio: number) => void} onProgress
 */
export function onFFmpegProgress(onProgress) {
  if (!ffmpeg) return;
  ffmpeg.on("progress", ({ progress }) => {
    if (Number.isFinite(progress)) {
      onProgress(Math.max(0, Math.min(1, progress)));
    }
  });
}

/**
 * Executa a edição completa e retorna uma URL de blob do resultado (mp4).
 */
export async function renderVideo({ videoFile, audioFile, options, onLog, onProgress }) {
  const ff = await getFFmpeg(onLog);
  if (onProgress) onFFmpegProgress(onProgress);

  const videoName = "input_video" + guessExt(videoFile.name, ".mp4");
  const audioName = audioFile ? "input_audio" + guessExt(audioFile.name, ".mp3") : null;
  const outputName = "saida.mp4";

  await ff.writeFile(videoName, await fetchFile(videoFile));
  if (audioFile) await ff.writeFile(audioName, await fetchFile(audioFile));

  const args = buildArgs({ ...options, videoName, audioName, outputName });
  if (onLog) onLog("ffmpeg " + args.join(" "));

  await ff.exec(args);

  const data = await ff.readFile(outputName);
  const blob = new Blob([data.buffer], { type: "video/mp4" });

  // Limpa o FS virtual para não acumular memória entre renderizações.
  await safeDelete(ff, videoName);
  if (audioName) await safeDelete(ff, audioName);
  await safeDelete(ff, outputName);

  return URL.createObjectURL(blob);
}

function guessExt(name, fallback) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : fallback;
}

async function safeDelete(ff, name) {
  try {
    await ff.deleteFile(name);
  } catch {
    // ignora se o arquivo não existir
  }
}
