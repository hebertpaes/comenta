// Lógica pura (sem dependências de wasm/Vite) que monta a lista de
// argumentos do FFmpeg. Fica isolada aqui para poder ser testada em Node.

function fmt(seconds) {
  return Number(seconds).toFixed(3);
}

/**
 * Monta a lista de argumentos para o FFmpeg com base nas opções do editor.
 *
 * @param {Object} opts
 * @param {string} opts.videoName  nome do arquivo de vídeo no FS virtual
 * @param {string} opts.audioName  nome do arquivo de áudio no FS virtual (ou null)
 * @param {string} opts.outputName nome do arquivo de saída
 * @param {number} opts.trimStart  início do corte (s)
 * @param {number} opts.trimEnd    fim do corte (s)
 * @param {number} opts.volume     volume do áudio importado (1 = 100%)
 * @param {number} opts.fadeIn     duração do fade-in (s)
 * @param {number} opts.fadeOut    duração do fade-out (s)
 * @param {'substituir'|'misturar'} opts.audioMode  como aplicar o áudio
 * @param {boolean} opts.videoHasAudio  se o vídeo original possui trilha de áudio
 * @returns {string[]}
 */
export function buildArgs(opts) {
  const {
    videoName,
    audioName,
    outputName,
    trimStart,
    trimEnd,
    volume,
    fadeIn,
    fadeOut,
    audioMode,
    videoHasAudio,
  } = opts;

  const duration = Math.max(0, trimEnd - trimStart);
  const args = [];

  // Corte do vídeo: -ss/-to antes do -i é mais rápido e preciso o suficiente.
  if (trimStart > 0) args.push("-ss", fmt(trimStart));
  if (trimEnd > 0) args.push("-to", fmt(trimEnd));
  args.push("-i", videoName);

  // Filtros de áudio aplicados à música importada.
  const buildAudioFilters = (label) => {
    const chain = [];
    if (volume !== 1) chain.push(`volume=${volume}`);
    if (fadeIn > 0) chain.push(`afade=t=in:st=0:d=${fmt(fadeIn)}`);
    if (fadeOut > 0) {
      const start = Math.max(0, duration - fadeOut);
      chain.push(`afade=t=out:st=${fmt(start)}:d=${fmt(fadeOut)}`);
    }
    // Sempre alinhamos o áudio ao início da trilha cortada.
    chain.push("asetpts=PTS-STARTPTS");
    return `[${label}]${chain.join(",")}`;
  };

  if (audioName) {
    args.push("-i", audioName);

    if (audioMode === "misturar" && videoHasAudio) {
      // Mistura a trilha original do vídeo com a música importada.
      const music = buildAudioFilters("1:a");
      args.push(
        "-filter_complex",
        `${music}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
        "-map",
        "0:v",
        "-map",
        "[aout]"
      );
    } else {
      // Substitui totalmente o áudio pelo importado (caso mais comum:
      // vídeo do CapCut + música do Suno).
      const music = buildAudioFilters("1:a");
      args.push("-filter_complex", `${music}[aout]`, "-map", "0:v", "-map", "[aout]");
    }
  } else {
    // Sem áudio importado: apenas mantém o vídeo (e o áudio original, se houver).
    args.push("-map", "0:v");
    if (videoHasAudio) args.push("-map", "0:a");
  }

  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    outputName
  );

  return args;
}
