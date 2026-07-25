# 🎬 Comenta — Editor de Vídeo e Música

Editor **web** que importa arquivos exportados de apps externos (ex.: vídeo do
**CapCut**, música do **Suno**) e edita tudo **no navegador**, sem enviar nada
para servidores. Todo o processamento roda localmente com **FFmpeg (WebAssembly)**.

## ✨ O que dá pra fazer (MVP)

- **Importar** um vídeo (MP4, MOV…) e, opcionalmente, uma música (MP3, WAV…).
- **Cortar / aparar** o vídeo (definindo início e fim).
- **Juntar áudio + vídeo**: substituir totalmente o áudio pela música importada
  ou **misturar** a música com o áudio original.
- **Ajustar o áudio**: volume, *fade in* e *fade out*.
- **Exportar** o resultado em **MP4** e baixar.

## 🚀 Como rodar

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente `http://localhost:5173`).

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## 🧩 Como funciona a "integração" com Suno, CapCut etc.

Suno e CapCut não oferecem uma API pública oficial para integração direta.
O fluxo realista e que funciona hoje é:

1. Você **exporta/baixa** o arquivo no app externo (MP4 no CapCut, MP3 no Suno).
2. **Importa** esse arquivo no Comenta.
3. Edita e **baixa** o resultado final.

Isso mantém tudo dentro do que os apps permitem e não depende de nenhuma
credencial ou integração não oficial.

## ⚙️ Detalhes técnicos

- **React + Vite** para a interface.
- **@ffmpeg/ffmpeg** (FFmpeg.wasm) para corte, mixagem, fades e exportação.
- O FFmpeg multithread usa `SharedArrayBuffer`, então a página precisa ser
  *cross-origin isolated*. Os cabeçalhos `COOP`/`COEP` já estão configurados no
  `vite.config.js` para os servidores de dev e de preview. Em produção, o host
  precisa enviar:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`

## 🗺️ Próximos passos (ideias)

- Múltiplas trilhas de áudio e vídeo (timeline).
- Legendas automáticas.
- Cortes automáticos por IA (estilo Vizard) para gerar clipes curtos.
- Presets de proporção (9:16 para Reels/TikTok, 1:1, 16:9).
- Filtros e textos sobrepostos.

## ⚠️ Direitos autorais

Use apenas conteúdo que você tenha direito de usar. O Comenta não hospeda nem
distribui mídia — ele apenas edita arquivos que você mesmo fornece.
