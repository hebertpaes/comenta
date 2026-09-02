import { useEffect, useRef, useState } from 'react'
import { computeEnergy, suggestClips } from './clipEngine.js'
import { extractAudioSamples, exportClip } from './clips.js'

const RATIOS = [
  { id: '9:16', label: '9:16 · Vertical', dica: 'Reels, TikTok e Shorts' },
  { id: '1:1', label: '1:1 · Quadrado', dica: 'Feed' },
  { id: 'original', label: 'Original', dica: 'Mantém a proporção do vídeo' },
]

const TARGETS = [
  { sec: 15, label: '~15s' },
  { sec: 30, label: '~30s' },
  { sec: 60, label: '~60s' },
]

function secondsToLabel(s) {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function readDuration(file) {
  return new Promise((resolve) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      resolve(el.duration || 0)
      URL.revokeObjectURL(el.src)
    }
    el.onerror = () => resolve(0)
    el.src = URL.createObjectURL(file)
  })
}

function scoreClass(score) {
  if (score >= 70) return 'score high'
  if (score >= 45) return 'score mid'
  return 'score low'
}

export default function ClipsStudio() {
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)

  const [targetSec, setTargetSec] = useState(30)
  const [ratio, setRatio] = useState('9:16')

  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [clips, setClips] = useState(null)
  const [exportingIdx, setExportingIdx] = useState(-1)
  const [results, setResults] = useState({})

  const previewRef = useRef(null)
  const stopAtRef = useRef(null)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const onTime = () => {
      if (stopAtRef.current != null && el.currentTime >= stopAtRef.current) {
        el.pause()
        stopAtRef.current = null
      }
    }
    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [videoUrl])

  async function onPickVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorMsg('')
    setStatusMsg('')
    setClips(null)
    setResults({})
    setVideoFile(file)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    const duration = await readDuration(file)
    setVideoDuration(Number.isFinite(duration) && duration > 0 ? duration : 0)
  }

  async function onAnalyze() {
    if (!videoFile || analyzing) return
    setAnalyzing(true)
    setErrorMsg('')
    setClips(null)
    setResults({})
    setProgress(0)
    setStatusMsg('Carregando o motor de análise (FFmpeg)…')

    try {
      const { samples, sampleRate } = await extractAudioSamples({
        file: videoFile,
        onLog: () => {},
        onProgress: (r) => {
          setProgress(r)
          setStatusMsg('Analisando o áudio do vídeo…')
        },
      })

      let energy = null
      if (samples && samples.length > 0) {
        energy = computeEnergy(samples, sampleRate, 0.5)
      }

      const suggestions = suggestClips({
        rms: energy ? energy.rms : null,
        windowSec: energy ? energy.windowSec : 0.5,
        videoDuration:
          videoDuration > 0
            ? videoDuration
            : energy
              ? energy.rms.length * energy.windowSec
              : 0,
        targetSec,
        maxClips: 5,
      })

      if (suggestions.length === 0) {
        setErrorMsg(
          'Não foi possível sugerir clipes para este vídeo. Verifique se o ' +
            'arquivo tem duração válida.',
        )
        setStatusMsg('')
      } else {
        setClips(suggestions)
        setStatusMsg(
          `Análise concluída: ${suggestions.length} ` +
            (suggestions.length === 1 ? 'clipe sugerido' : 'clipes sugeridos') +
            '. 🎉',
        )
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(
        'A análise falhou. Tente um arquivo menor ou outro formato. Detalhe: ' +
          (err?.message || String(err)),
      )
      setStatusMsg('')
    } finally {
      setAnalyzing(false)
    }
  }

  function onPreview(clip) {
    const el = previewRef.current
    if (!el) return
    stopAtRef.current = clip.end
    el.currentTime = clip.start
    el.play()
  }

  function updateClip(idx, patch) {
    setClips((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c
        const next = { ...c, ...patch }
        const max = videoDuration > 0 ? videoDuration : next.end
        next.start = Math.max(0, Math.min(next.start, max))
        next.end = Math.max(next.start + 1, Math.min(next.end, max))
        return next
      }),
    )
    setResults((prev) => {
      if (!(idx in prev)) return prev
      const next = { ...prev }
      URL.revokeObjectURL(next[idx])
      delete next[idx]
      return next
    })
  }

  async function onExport(clip, idx) {
    if (exportingIdx >= 0 || analyzing) return
    setExportingIdx(idx)
    setErrorMsg('')
    setProgress(0)
    setStatusMsg(`Exportando o clipe ${idx + 1}…`)

    try {
      const url = await exportClip({
        file: videoFile,
        clip,
        ratio,
        onLog: () => {},
        onProgress: (r) => setProgress(r),
      })
      setResults((prev) => ({ ...prev, [idx]: url }))
      setStatusMsg(`Clipe ${idx + 1} pronto! 🎉`)
    } catch (err) {
      console.error(err)
      setErrorMsg(
        'A exportação falhou. Detalhe: ' + (err?.message || String(err)),
      )
      setStatusMsg('')
    } finally {
      setExportingIdx(-1)
    }
  }

  const busy = analyzing || exportingIdx >= 0

  return (
    <div className="clips-studio">
      <section className="panel">
        <h2>1. Enviar vídeo longo</h2>

        <label className="drop">
          <input type="file" accept="video/*" onChange={onPickVideo} />
          <div className="drop-inner">
            <span className="drop-icon">🎥</span>
            <span>
              {videoFile
                ? videoFile.name
                : 'Escolher vídeo (podcast, live, aula, gameplay…)'}
            </span>
            {videoDuration > 0 && (
              <small>Duração: {secondsToLabel(videoDuration)}</small>
            )}
          </div>
        </label>

        {videoUrl && <video ref={previewRef} className="preview" src={videoUrl} controls />}

        <div className="field">
          <label>Duração alvo dos clipes</label>
          <div className="segmented">
            {TARGETS.map((t) => (
              <button
                key={t.sec}
                type="button"
                className={targetSec === t.sec ? 'active' : ''}
                onClick={() => setTargetSec(t.sec)}
                disabled={busy}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Proporção de exportação</label>
          <div className="segmented">
            {RATIOS.map((r) => (
              <button
                key={r.id}
                type="button"
                title={r.dica}
                className={ratio === r.id ? 'active' : ''}
                onClick={() => setRatio(r.id)}
                disabled={busy}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="render-btn"
          onClick={onAnalyze}
          disabled={!videoFile || busy}
        >
          {analyzing ? 'Analisando…' : '🔍 Encontrar melhores momentos'}
        </button>

        {busy && (
          <div className="progress">
            <div
              className="bar"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
        {statusMsg && <p className="status">{statusMsg}</p>}
        {errorMsg && <p className="error">{errorMsg}</p>}
      </section>

      <section className="panel">
        <h2>2. Clipes sugeridos</h2>

        {!clips && (
          <p className="hint">
            Envie um vídeo e clique em <strong>Encontrar melhores momentos</strong>.
            A análise acontece no seu navegador: o app mede a energia do áudio
            para achar os trechos com mais chance de engajar — nada é enviado
            para servidores.
          </p>
        )}

        {clips && clips.length > 0 && (
          <ul className="clip-list">
            {clips.map((clip, idx) => (
              <li key={idx} className="clip-card">
                <div className="clip-head">
                  <span className={scoreClass(clip.score)}>
                    ⚡ {clip.score}
                  </span>
                  <strong>Clipe {idx + 1}</strong>
                  <span className="clip-range">
                    {secondsToLabel(clip.start)} → {secondsToLabel(clip.end)} ·{' '}
                    {(clip.end - clip.start).toFixed(0)}s
                  </span>
                </div>
                <p className="clip-reason">{clip.reason}</p>

                <div className="clip-tune">
                  <label>
                    Início (s)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={clip.start}
                      onChange={(e) =>
                        updateClip(idx, { start: Number(e.target.value) })
                      }
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Fim (s)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={clip.end}
                      onChange={(e) =>
                        updateClip(idx, { end: Number(e.target.value) })
                      }
                      disabled={busy}
                    />
                  </label>
                </div>

                <div className="clip-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => onPreview(clip)}
                    disabled={!videoUrl}
                  >
                    ▶ Ver trecho
                  </button>
                  <button
                    type="button"
                    className="mini-render-btn"
                    onClick={() => onExport(clip, idx)}
                    disabled={busy}
                  >
                    {exportingIdx === idx ? 'Exportando…' : '✂️ Exportar clipe'}
                  </button>
                </div>

                {results[idx] && (
                  <a
                    className="download-btn"
                    href={results[idx]}
                    download={`clipe-${idx + 1}.mp4`}
                  >
                    ⬇️ Baixar clipe {idx + 1} (MP4)
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
