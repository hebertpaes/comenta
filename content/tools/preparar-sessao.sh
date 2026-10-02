#!/usr/bin/env bash
# Prepara uma sessão nova (rotina em sessão nova, contêiner reciclado) para as rotinas do HOJE MT.
# Idempotente e não interativo. Chamado pelo hook SessionStart (.claude/hooks/session-start.sh)
# e, nas rotinas, logo depois do checkout do branch (o hook só vale a partir do branch padrão).
#   bash content/tools/preparar-sessao.sh
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"
mkdir -p "${HOJEMT_TMP:-/tmp/hojemt}"

# 1) Node: dependências do workspace content (ghost admin-api, sharp, rss-parser, playwright-core)
if ! node -e 'require.resolve("@tryghost/admin-api");require.resolve("playwright-core");require.resolve("sharp")' 2>/dev/null; then
  echo "preparar-sessao: npm install -w content"
  npm install -w content --no-audit --no-fund --loglevel=error || echo "preparar-sessao: AVISO npm install falhou"
else
  echo "preparar-sessao: dependências Node ok"
fi

# 2) Python: edge-tts (voz dos boletins) e imageio-ffmpeg (ffmpeg dos vídeos), Pillow (imagens)
faltam=""
python3 -c 'import edge_tts' 2>/dev/null || faltam="$faltam edge-tts"
python3 -c 'import imageio_ffmpeg' 2>/dev/null || faltam="$faltam imageio-ffmpeg"
python3 -c 'import PIL' 2>/dev/null || faltam="$faltam pillow"
if [ -n "$faltam" ]; then
  echo "preparar-sessao: pip install$faltam"
  pip install --quiet --disable-pip-version-check $faltam 2>/dev/null \
    || pip install --quiet --disable-pip-version-check --user $faltam \
    || echo "preparar-sessao: AVISO pip install falhou ($faltam)"
else
  echo "preparar-sessao: dependências Python ok"
fi

# 3) Chromium (Playwright) pré-instalado nas sessões web
ls /opt/pw-browsers/chromium-*/chrome-linux/chrome >/dev/null 2>&1 \
  && echo "preparar-sessao: Chromium ok" \
  || echo "preparar-sessao: AVISO Chromium não encontrado em /opt/pw-browsers (defina CHROME=/caminho)"

# 4) Credenciais (só presença, nunca valores)
# shellcheck disable=SC1091
source "$RAIZ/content/tools/ambiente.sh" >/dev/null
if [ -n "${GHOST_ADMIN_URL:-}" ] && [ -n "${GHOST_ADMIN_API_KEY:-}" ]; then
  echo "preparar-sessao: credenciais do Ghost ok"
else
  echo "preparar-sessao: credenciais do Ghost AUSENTES (variáveis de ambiente GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY)"
fi
exit 0
