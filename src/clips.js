// Operações de FFmpeg usadas pelo modo "Clips IA": extração do áudio para
// análise (PCM mono) e exportação de clipes individuais. Tudo roda no
// navegador — nenhum arquivo sai da máquina do usuário.

import { fetchFile } from '@ffmpeg/util'
import { getFFmpeg } from './ffmpeg.js'
import { buildClipArgs } from './clipEngine.js'

// 8 kHz mono s16 = ~16 KB por segundo: leve o bastante para analisar vídeos
// longos sem estourar a memória do wasm.
export const ANALYSIS_SAMPLE_RATE = 8000

function guessExt(name, fallback = '.mp4') {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot) : fallback
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

async function safeDelete(ff, name) {
  try {
    await ff.deleteFile(name)
  } catch {
    // ignora se o arquivo não existir
  }
}

/**
 * Extrai o áudio do vídeo como PCM s16 mono para análise de energia.
 * Retorna { samples: null } quando o vídeo não tem trilha de áudio.
 */
export async function extractAudioSamples({ file, onLog, onProgress }) {
  const ff = await getFFmpeg(onLog)
  const inputName = 'clips_input' + guessExt(file.name)
  const pcmName = 'clips_audio.pcm'

  const progressHandler = ({ progress }) => {
    if (onProgress && Number.isFinite(progress)) onProgress(clamp01(progress))
  }
  ff.on('progress', progressHandler)

  try {
    await ff.writeFile(inputName, await fetchFile(file))
    await ff.exec([
      '-i', inputName,
      '-vn',
      '-ac', '1',
      '-ar', String(ANALYSIS_SAMPLE_RATE),
      '-f', 's16le',
      pcmName,
    ])
    const data = await ff.readFile(pcmName)
    const bytes = data.byteLength - (data.byteLength % 2)
    const samples = new Int16Array(data.buffer, 0, bytes / 2)
    return { samples, sampleRate: ANALYSIS_SAMPLE_RATE }
  } catch (err) {
    // Vídeo sem áudio (ou formato de áudio não suportado): o chamador cai no
    // modo de sugestões uniformes.
    if (onLog) onLog('Análise de áudio indisponível: ' + (err?.message || err))
    return { samples: null, sampleRate: ANALYSIS_SAMPLE_RATE }
  } finally {
    ff.off('progress', progressHandler)
    await safeDelete(ff, pcmName)
    await safeDelete(ff, inputName)
  }
}

/**
 * Exporta um clipe (corte + proporção) e retorna a URL de blob do MP4.
 */
export async function exportClip({ file, clip, ratio, onLog, onProgress }) {
  const ff = await getFFmpeg(onLog)
  const inputName = 'clips_input' + guessExt(file.name)
  const outputName = 'clips_saida.mp4'

  const progressHandler = ({ progress }) => {
    if (onProgress && Number.isFinite(progress)) onProgress(clamp01(progress))
  }
  ff.on('progress', progressHandler)

  try {
    await ff.writeFile(inputName, await fetchFile(file))
    const args = buildClipArgs({
      videoName: inputName,
      outputName,
      start: clip.start,
      end: clip.end,
      ratio,
    })
    if (onLog) onLog('ffmpeg ' + args.join(' '))
    await ff.exec(args)
    const data = await ff.readFile(outputName)
    const blob = new Blob([data.buffer], { type: 'video/mp4' })
    return URL.createObjectURL(blob)
  } finally {
    ff.off('progress', progressHandler)
    await safeDelete(ff, outputName)
    await safeDelete(ff, inputName)
  }
}
