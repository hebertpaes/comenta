#!/bin/bash
# Hook SessionStart: prepara as sessões web (inclusive as rotinas que abrem sessão nova)
# para as rotinas do HOJE MT. Só roda no ambiente remoto (Claude Code na web).
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
bash content/tools/preparar-sessao.sh
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export HOJEMT_TMP=/tmp/hojemt' >> "$CLAUDE_ENV_FILE"
fi
