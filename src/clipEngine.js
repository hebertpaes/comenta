// Motor de sugestão de clipes ("Clips IA").
//
// Lógica pura, sem dependências de wasm/Vite, para poder ser testada em Node.
// A "IA" do protótipo é uma heurística de energia sonora: trechos com mais
// atividade de fala/som, boa dinâmica e que começam depois de uma pausa
// natural tendem a render clipes melhores para redes sociais.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * Calcula a energia (RMS) do áudio em janelas fixas.
 *
 * @param {Int16Array} samples  amostras PCM s16 mono
 * @param {number} sampleRate   taxa de amostragem das amostras
 * @param {number} windowSec    tamanho da janela em segundos
 * @returns {{ rms: number[], windowSec: number }}
 */
export function computeEnergy(samples, sampleRate, windowSec = 0.5) {
  const win = Math.max(1, Math.round(sampleRate * windowSec))
  const rms = []
  for (let i = 0; i + win <= samples.length; i += win) {
    let sum = 0
    for (let j = i; j < i + win; j++) {
      const v = samples[j] / 32768
      sum += v * v
    }
    rms.push(Math.sqrt(sum / win))
  }
  return { rms, windowSec }
}

function uniformClips(videoDuration, targetSec, maxClips) {
  const total = Math.max(0, videoDuration)
  if (total <= 0) return []
  if (total <= targetSec + 1) {
    return [
      {
        start: 0,
        end: total,
        score: 60,
        reason: 'Vídeo curto: clipe único com o conteúdo inteiro.',
      },
    ]
  }
  const count = Math.min(maxClips, Math.max(1, Math.floor(total / targetSec)))
  const step = (total - targetSec) / Math.max(1, count - 1)
  const clips = []
  for (let i = 0; i < count; i++) {
    const start = Number((i * step).toFixed(2))
    clips.push({
      start,
      end: Number(Math.min(total, start + targetSec).toFixed(2)),
      score: 50,
      reason:
        'Sem trilha de áudio analisável: sugestão distribuída ao longo do vídeo.',
    })
  }
  return clips
}

function describeClip({ mean, dynamics, quietStart }) {
  const parts = []
  if (mean >= 0.5) parts.push('trecho com bastante fala/atividade sonora')
  else if (mean >= 0.25) parts.push('trecho com atividade sonora moderada')
  if (dynamics >= 0.5) parts.push('boa variação de dinâmica')
  if (quietStart) parts.push('começa logo após uma pausa natural')
  if (parts.length === 0) parts.push('trecho mais calmo do vídeo')
  const text = parts.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}

/**
 * Sugere clipes curtos a partir do perfil de energia do áudio.
 *
 * @param {Object} opts
 * @param {number[]|null} opts.rms       energia por janela (ou null se não há áudio)
 * @param {number} opts.windowSec        tamanho da janela usada em computeEnergy
 * @param {number} opts.videoDuration    duração total do vídeo (s)
 * @param {number} [opts.targetSec=30]   duração desejada de cada clipe (s)
 * @param {number} [opts.maxClips=5]     número máximo de sugestões
 * @param {number} [opts.minGapSec=3]    distância mínima entre clipes (s)
 * @returns {{start:number, end:number, score:number, reason:string}[]}
 */
export function suggestClips({
  rms,
  windowSec,
  videoDuration,
  targetSec = 30,
  maxClips = 5,
  minGapSec = 3,
}) {
  const total = Math.max(0, videoDuration)
  if (!rms || rms.length === 0) return uniformClips(total, targetSec, maxClips)

  const peak = Math.max(...rms)
  if (peak <= 0) return uniformClips(total, targetSec, maxClips)

  const norm = rms.map((v) => v / peak)
  const L = Math.max(1, Math.round(targetSec / windowSec))
  if (norm.length <= L) {
    return uniformClips(total, targetSec, maxClips)
  }

  // Janela deslizante: média (quanto som), desvio (dinâmica) e bônus por
  // começar depois de um momento de silêncio (corte "limpo").
  const candidates = []
  for (let i = 0; i + L <= norm.length; i++) {
    let sum = 0
    let sum2 = 0
    for (let j = i; j < i + L; j++) {
      sum += norm[j]
      sum2 += norm[j] * norm[j]
    }
    const mean = sum / L
    const std = Math.sqrt(Math.max(0, sum2 / L - mean * mean))
    const dynamics = clamp(std * 2.5, 0, 1)
    const quietStart = i > 0 && norm[i - 1] < 0.22 ? 1 : 0
    const score = 0.62 * mean + 0.23 * dynamics + 0.15 * quietStart
    candidates.push({ i, mean, dynamics, quietStart, score })
  }

  candidates.sort((a, b) => b.score - a.score)

  const chosen = []
  for (const c of candidates) {
    const start = Number((c.i * windowSec).toFixed(2))
    const end = Number(Math.min(total, start + targetSec).toFixed(2))
    if (end - start < Math.min(5, targetSec)) continue
    const collides = chosen.some(
      (x) => start < x.end + minGapSec && end > x.start - minGapSec,
    )
    if (collides) continue
    chosen.push({
      start,
      end,
      score: Math.round(clamp(c.score, 0, 1) * 100),
      reason: describeClip(c),
    })
    if (chosen.length >= maxClips) break
  }

  chosen.sort((a, b) => b.score - a.score)
  return chosen
}

/**
 * Monta os argumentos do FFmpeg para exportar um clipe.
 *
 * @param {Object} opts
 * @param {string} opts.videoName   arquivo de entrada no FS virtual
 * @param {string} opts.outputName  arquivo de saída
 * @param {number} opts.start       início (s)
 * @param {number} opts.end         fim (s)
 * @param {'9:16'|'1:1'|'original'} opts.ratio proporção do clipe
 * @returns {string[]}
 */
export function buildClipArgs({ videoName, outputName, start, end, ratio }) {
  const args = []
  if (start > 0) args.push('-ss', Number(start).toFixed(3))
  args.push('-to', Number(end).toFixed(3), '-i', videoName)

  // Recorte central. As vírgulas dentro de min() precisam de escape porque a
  // vírgula separa filtros no filtergraph; 2*floor(x/2) garante dimensão par
  // (exigência do yuv420p).
  const filters = []
  if (ratio === '9:16') {
    filters.push('crop=2*floor(min(iw\\,ih*9/16)/2):ih')
  } else if (ratio === '1:1') {
    filters.push(
      'crop=2*floor(min(iw\\,ih)/2):2*floor(min(iw\\,ih)/2)',
    )
  }
  if (filters.length > 0) {
    filters.push('setsar=1')
    args.push('-vf', filters.join(','))
  }

  args.push(
    '-map', '0:v',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-movflags', '+faststart',
    outputName,
  )
  return args
}
