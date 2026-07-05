import { useEffect, useMemo, useRef, useState } from 'react'
import { renderVideo } from './ffmpeg.js'

const EXTERNAL_APPS = [
  { name: 'CapCut', tipo: 'vídeo', dica: 'Exporte como MP4 e importe aqui.' },
  { name: 'Suno', tipo: 'música', dica: 'Baixe a faixa em MP3 e importe aqui.' },
  { name: 'InShot', tipo: 'vídeo', dica: 'Exporte o clipe em MP4.' },
  { name: 'YouTube Studio', tipo: 'áudio', dica: 'Use áudios que você tenha direito de usar.' },
]

function readDuration(file, kind) {
  return new Promise((resolve) => {
    const el = document.createElement(kind === 'video' ? 'video' : 'audio')
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      resolve({ duration: el.duration || 0 })
      URL.revokeObjectURL(el.src)
    }
    el.onerror = () => resolve({ duration: 0 })
    el.src = URL.createObjectURL(file)
  })
}

function secondsToLabel(s) {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function App() {
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)

  const [audioFile, setAudioFile] = useState(null)
  const [audioDuration, setAudioDuration] = useState(0)

  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [volume, setVolume] = useState(100)
  const [fadeIn, setFadeIn] = useState(0)
  const [fadeOut, setFadeOut] = useState(0)
  const [audioMode, setAudioMode] = useState('substituir')

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [resultUrl, setResultUrl] = useState(null)
  const logRef = useRef(null)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  async function onPickVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorMsg('')
    setVideoFile(file)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    const { duration } = await readDuration(file, 'video')
    // Alguns contêineres (ex.: webm gravado ao vivo) reportam duração
    // Infinity/0. Nesses casos desativamos o corte e usamos o vídeo inteiro.
    const safe = Number.isFinite(duration) && duration > 0 ? duration : 0
    setVideoDuration(safe)
    setTrimStart(0)
    setTrimEnd(safe ? Number(safe.toFixed(2)) : 0)
  }

  async function onPickAudio(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorMsg('')
    setAudioFile(file)
    const { duration } = await readDuration(file, 'audio')
    setAudioDuration(duration)
  }

  const trimmedDuration = useMemo(
    () => Math.max(0, trimEnd - trimStart),
    [trimStart, trimEnd],
  )

  // Quando a duração é desconhecida (videoDuration === 0) permitimos renderizar
  // o vídeo inteiro; caso contrário exigimos um trecho com duração positiva.
  const canRender =
    videoFile && !busy && (videoDuration === 0 || trimmedDuration > 0)

  async function onRender() {
    if (!canRender) return
    setBusy(true)
    setErrorMsg('')
    setResultUrl(null)
    setProgress(0)
    setLogs([])
    setStatusMsg('Carregando o motor de edição (FFmpeg)…')

    try {
      const url = await renderVideo({
        videoFile,
        audioFile,
        options: {
          trimStart,
          trimEnd,
          volume: volume / 100,
          fadeIn,
          fadeOut,
          audioMode,
          videoHasAudio: true,
        },
        onLog: (m) => setLogs((prev) => [...prev.slice(-200), m]),
        onProgress: (r) => {
          setProgress(r)
          setStatusMsg('Renderizando o vídeo final…')
        },
      })
      setResultUrl(url)
      setStatusMsg('Pronto! 🎉')
    } catch (err) {
      console.error(err)
      setErrorMsg(
        'Não foi possível renderizar. Tente um arquivo menor ou verifique se ' +
          'o formato é suportado. Detalhe: ' + (err?.message || String(err)),
      )
      setStatusMsg('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>🎬 Comenta <span>Editor</span></h1>
        <p>
          Edite vídeo e música que vieram de apps externos — como
          <strong> CapCut</strong> e <strong>Suno</strong> — direto no navegador.
          Nada é enviado para servidores: tudo acontece no seu computador.
        </p>
      </header>

      <div className="apps-row">
        {EXTERNAL_APPS.map((a) => (
          <div key={a.name} className="app-chip" title={a.dica}>
            <strong>{a.name}</strong>
            <span>{a.tipo}</span>
          </div>
        ))}
      </div>

      <main className="grid">
        <section className="panel">
          <h2>1. Importar</h2>

          <label className="drop">
            <input type="file" accept="video/*" onChange={onPickVideo} />
            <div className="drop-inner">
              <span className="drop-icon">📹</span>
              <span>{videoFile ? videoFile.name : 'Escolher vídeo (ex.: CapCut)'}</span>
              {videoDuration > 0 && (
                <small>Duração: {secondsToLabel(videoDuration)}</small>
              )}
            </div>
          </label>

          <label className="drop">
            <input type="file" accept="audio/*" onChange={onPickAudio} />
            <div className="drop-inner">
              <span className="drop-icon">🎵</span>
              <span>{audioFile ? audioFile.name : 'Escolher música (ex.: Suno) — opcional'}</span>
              {audioDuration > 0 && (
                <small>Duração: {secondsToLabel(audioDuration)}</small>
              )}
            </div>
          </label>

          {videoUrl && (
            <video className="preview" src={videoUrl} controls />
          )}
        </section>

        <section className="panel">
          <h2>2. Editar</h2>

          <fieldset disabled={!videoFile}>
            <div className="field">
              <div className="field-head">
                <label>Cortar vídeo</label>
                <span className="val">
                  {secondsToLabel(trimStart)} → {secondsToLabel(trimEnd)}
                  {' '}({trimmedDuration.toFixed(1)}s)
                </span>
              </div>
              <div className="range-pair">
                <input
                  type="range" min={0} max={videoDuration} step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd))}
                />
                <input
                  type="range" min={0} max={videoDuration} step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart))}
                />
              </div>
            </div>

            <div className="field">
              <div className="field-head">
                <label>Volume da música</label>
                <span className="val">{volume}%</span>
              </div>
              <input
                type="range" min={0} max={200} step={5}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                disabled={!audioFile}
              />
            </div>

            <div className="field two">
              <div>
                <div className="field-head">
                  <label>Fade in</label>
                  <span className="val">{fadeIn}s</span>
                </div>
                <input
                  type="range" min={0} max={10} step={0.5}
                  value={fadeIn}
                  onChange={(e) => setFadeIn(Number(e.target.value))}
                  disabled={!audioFile}
                />
              </div>
              <div>
                <div className="field-head">
                  <label>Fade out</label>
                  <span className="val">{fadeOut}s</span>
                </div>
                <input
                  type="range" min={0} max={10} step={0.5}
                  value={fadeOut}
                  onChange={(e) => setFadeOut(Number(e.target.value))}
                  disabled={!audioFile}
                />
              </div>
            </div>

            <div className="field">
              <label>Como aplicar a música</label>
              <div className="segmented">
                <button
                  type="button"
                  className={audioMode === 'substituir' ? 'active' : ''}
                  onClick={() => setAudioMode('substituir')}
                  disabled={!audioFile}
                >
                  Substituir áudio
                </button>
                <button
                  type="button"
                  className={audioMode === 'misturar' ? 'active' : ''}
                  onClick={() => setAudioMode('misturar')}
                  disabled={!audioFile}
                >
                  Misturar com o original
                </button>
              </div>
            </div>
          </fieldset>

          <button className="render-btn" onClick={onRender} disabled={!canRender}>
            {busy ? 'Processando…' : '✨ Gerar vídeo final'}
          </button>

          {busy && (
            <div className="progress">
              <div className="bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {statusMsg && <p className="status">{statusMsg}</p>}
          {errorMsg && <p className="error">{errorMsg}</p>}
        </section>

        <section className="panel">
          <h2>3. Exportar</h2>
          {resultUrl ? (
            <>
              <video className="preview" src={resultUrl} controls />
              <a className="download-btn" href={resultUrl} download="comenta-final.mp4">
                ⬇️ Baixar MP4
              </a>
            </>
          ) : (
            <p className="hint">
              O resultado aparece aqui depois de gerar o vídeo. Você poderá
              assistir e baixar em MP4.
            </p>
          )}

          {logs.length > 0 && (
            <details className="logs">
              <summary>Ver logs técnicos</summary>
              <pre ref={logRef}>{logs.join('\n')}</pre>
            </details>
          )}
        </section>
      </main>

      <footer className="foot">
        <p>
          Processamento local com FFmpeg (WebAssembly). Importe seus próprios
          arquivos exportados dos apps — respeite os direitos autorais das
          músicas e vídeos que usar.
        </p>
      </footer>
    </div>
  )
}
