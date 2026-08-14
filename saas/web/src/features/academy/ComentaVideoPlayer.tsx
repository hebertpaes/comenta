import { useEffect, useRef, useState } from "react";

interface ComentaVideoPlayerProps {
  src: string;
  title: string;
  type?: "video" | "iframe" | "link";
  aspectRatio?: "16/9" | "9/16" | "1/1";
  onEnded?: () => void;
}

export function ComentaVideoPlayer({
  src,
  title,
  type = "video",
  aspectRatio = "16/9",
  onEnded,
}: ComentaVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentAspect, setCurrentAspect] = useState<"16/9" | "9/16" | "1/1">(aspectRatio);

  useEffect(() => {
    setCurrentAspect(aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onEnded, src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      void video.play();
      setIsPlaying(true);
    }
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    seek(Math.min(Math.max(video.currentTime + seconds, 0), duration));
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (video) {
      video.volume = newVolume;
      video.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 1;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    setPlaybackSpeed(speed);
    if (video) {
      video.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      void container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec) || timeInSec === 0) return "00:00";
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{
        width: "100%",
        maxWidth: currentAspect === "9/16" ? 380 : "100%",
        aspectRatio: currentAspect,
        margin: currentAspect === "9/16" ? "0 auto" : 0,
        borderRadius: 20,
        overflow: "hidden",
        background: "#050508",
        position: "relative",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        border: "2px solid rgba(255,255,255,0.1)",
        userSelect: "none",
        transition: "all 0.3s ease",
      }}
    >
      {type === "iframe" ? (
        <iframe
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            src={src}
            onClick={togglePlay}
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: currentAspect === "9/16" ? "cover" : "contain",
              cursor: "pointer",
            }}
          />

          {/* Botão Gigante Central de Play / Pause quando Pausado */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(4px)",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  background: "linear-gradient(135deg, #6d28d9, #4285f4)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  boxShadow: "0 10px 30px rgba(109, 40, 217, 0.6)",
                  transition: "transform 0.2s ease",
                }}
              >
                ▶
              </div>
            </div>
          )}

          {/* BARRA DE CONTROLES PERSONALIZADA DO COMENTA PLAYER */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "16px 16px 12px",
              background: "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4), transparent)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: showControls || !isPlaying ? 1 : 0,
              transition: "opacity 0.3s ease",
              zIndex: 20,
            }}
          >
            {/* TIMELINE / SCRUBBER BAR */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 3,
                  appearance: "none",
                  background: `linear-gradient(to right, #6d28d9 0%, #4285f4 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) 100%)`,
                  cursor: "pointer",
                }}
              />
            </div>

            {/* BARRA DE BOTÕES & RECURSOS */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "#fff", fontSize: 13 }}>
              {/* Controles de Play, Voltar 10s, Avançar 10s */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    background: "none",
                    border: 0,
                    color: "#fff",
                    fontSize: 16,
                    cursor: "pointer",
                    padding: 4,
                  }}
                  title={isPlaying ? "Pausar" : "Reproduzir"}
                >
                  {isPlaying ? "⏸️" : "▶️"}
                </button>

                <button
                  type="button"
                  onClick={() => skip(-10)}
                  style={{ background: "none", border: 0, color: "rgba(255,255,255,0.8)", fontSize: 13, cursor: "pointer" }}
                  title="Voltar 10 segundos"
                >
                  ↺ 10s
                </button>

                <button
                  type="button"
                  onClick={() => skip(10)}
                  style={{ background: "none", border: 0, color: "rgba(255,255,255,0.8)", fontSize: 13, cursor: "pointer" }}
                  title="Avançar 10 segundos"
                >
                  ↻ 10s
                </button>

                {/* Tempo Decorrido / Total */}
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#eef0f4", marginLeft: 4 }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Lado Direito: Volume, Velocidade, Aspect Ratio & Tela Cheia */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                {/* Controle de Volume */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    type="button"
                    onClick={toggleMute}
                    style={{ background: "none", border: 0, color: "#fff", cursor: "pointer", fontSize: 14 }}
                  >
                    {isMuted || volume === 0 ? "🔇" : "🔊"}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    style={{ width: 50, height: 4, cursor: "pointer" }}
                  />
                </div>

                {/* Velocidade de Reprodução */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 6,
                    padding: "2px 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <option value={0.75} style={{ color: "#000" }}>0.75x</option>
                  <option value={1} style={{ color: "#000" }}>1.0x Normal</option>
                  <option value={1.25} style={{ color: "#000" }}>1.25x</option>
                  <option value={1.5} style={{ color: "#000" }}>1.5x</option>
                  <option value={2} style={{ color: "#000" }}>2.0x Rápido</option>
                </select>

                {/* Seletor do Modo de Formato Visual */}
                <select
                  value={currentAspect}
                  onChange={(e) => setCurrentAspect(e.target.value as any)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 6,
                    padding: "2px 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <option value="16/9" style={{ color: "#000" }}>📺 16:9 Cinema</option>
                  <option value="9/16" style={{ color: "#000" }}>📱 9:16 Shorts</option>
                  <option value="1/1" style={{ color: "#000" }}>🔳 1:1 Feed</option>
                </select>

                {/* Tela Cheia */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  style={{ background: "none", border: 0, color: "#fff", cursor: "pointer", fontSize: 14 }}
                  title="Tela Cheia"
                >
                  {isFullscreen ? "🗗" : "⛶"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
