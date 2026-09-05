# 🎬 Comenta Studio — Clips IA e Editor de Vídeo

App **web** com dois modos, tudo rodando **no navegador** com
**FFmpeg (WebAssembly)** — nenhum arquivo é enviado para servidores:

- **⚡ Clips IA** — transforma um vídeo longo (podcast, live, aula…) em
  **clipes curtos** prontos para Reels, TikTok e Shorts, no espírito das
  ferramentas de *repurposing* de vídeo (categoria do Vizard, Opus Clip etc.),
  mas como um **protótipo independente**, com marca, textos, design e código
  100% originais.
- **🎛️ Editor** — importa arquivos exportados de apps externos (ex.: vídeo do
  **CapCut**, música do **Suno**) e edita corte, mixagem e fades.

## ⚡ Clips IA (protótipo)

1. **Envie** um vídeo longo.
2. O app **analisa o áudio localmente** (energia sonora por janelas) e sugere
   até 5 clipes com **pontuação de potencial** e o motivo de cada sugestão
   (muita fala/atividade, boa dinâmica, começo após pausa natural…).
3. **Ajuste fino** de início/fim, **pré-visualize** o trecho e escolha a
   **duração alvo** (~15s / ~30s / ~60s) e a **proporção**:
   - `9:16` (vertical, com recorte central) para Reels/TikTok/Shorts;
   - `1:1` (quadrado) para feed;
   - `Original` (sem recorte).
4. **Exporte** cada clipe em **MP4** e baixe.

> A "IA" do protótipo é uma heurística local de energia de áudio
> (`src/clipEngine.js`) — sem serviços externos, sem conta e sem upload.
> Legendas automáticas e detecção de rostos são próximos passos naturais.

## 🎛️ Editor (MVP)

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
- Legendas automáticas nos clipes (reconhecimento de fala local).
- Detecção de rosto para enquadrar o recorte 9:16 no assunto.
- Exportação em lote de todos os clipes sugeridos.
- Filtros e textos sobrepostos.

## ⚠️ Direitos autorais e originalidade

- O modo **Clips IA** é um **protótipo independente** apenas inspirado na
  *categoria* de ferramentas de repurposing de vídeo. Não usa nome, logotipo,
  textos, imagens, código ou qualquer material do Vizard ou de terceiros —
  ideias e funcionalidades não são protegidas por direito autoral; a expressão
  (marca, design, código) aqui é toda própria. O projeto **não é afiliado,
  endossado ou associado** ao Vizard.
- Use apenas conteúdo que você tenha direito de usar. O Comenta Studio não
  hospeda nem distribui mídia — ele apenas edita, localmente, arquivos que
  você mesmo fornece.
