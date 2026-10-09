# Ambiente comum das rotinas do HOJE MT. Use com `source`, a partir de qualquer pasta:
#   source content/tools/ambiente.sh            # prepara e diz se as credenciais estão ok
#   source content/tools/ambiente.sh --checar   # idem; retorna 1 se faltar credencial do Ghost
#
# Credenciais: GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY vêm das VARIÁVEIS DE AMBIENTE
# do ambiente do Claude Code (configuração do ambiente na web), nunca do repositório.
# Se não estiverem no ambiente, o script tenta, nesta ordem, um arquivo local fora do
# repositório: $HOJEMT_ENV_FILE ou um .env.ghost de scratchpad desta máquina.
# Nunca imprime valores; só "ok" ou "ausente".

_hojemt_raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export HOJEMT_RAIZ="$_hojemt_raiz"
export HOJEMT_TMP="${HOJEMT_TMP:-/tmp/hojemt}"
mkdir -p "$HOJEMT_TMP"
export TMPDIR="${TMPDIR_HOJEMT:-$HOJEMT_TMP}"
export NODE_NO_WARNINGS=1
if [ -f /root/.ccr/ca-bundle.crt ]; then
  export NODE_USE_ENV_PROXY=1
  export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
fi

if [ -z "${GHOST_ADMIN_URL:-}" ] || [ -z "${GHOST_ADMIN_API_KEY:-}" ]; then
  for _arq in "${HOJEMT_ENV_FILE:-}" /tmp/claude-0/*/*/scratchpad/.env.ghost; do
    if [ -n "$_arq" ] && [ -f "$_arq" ]; then
      set -a; . "$_arq"; set +a
      break
    fi
  done
  unset _arq
fi

if [ -n "${GHOST_ADMIN_URL:-}" ] && [ -n "${GHOST_ADMIN_API_KEY:-}" ]; then
  echo "ambiente HOJE MT: raiz $HOJEMT_RAIZ · temporários em $HOJEMT_TMP · credenciais do Ghost: ok"
  _hojemt_ok=0
else
  echo "ambiente HOJE MT: credenciais do Ghost AUSENTES (configure GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY nas variáveis de ambiente do ambiente do Claude Code; nunca no chat nem no repositório)"
  _hojemt_ok=1
fi
[ -n "${OPENAI_API_KEY:-}" ] && echo "chave da OpenAI (imagem das charges): ok" || echo "chave da OpenAI (imagem das charges): ausente — charges caem no generate-image do Canva"
unset _hojemt_raiz
if [ "${1:-}" = "--checar" ]; then
  _r=$_hojemt_ok; unset _hojemt_ok; return $_r 2>/dev/null || exit $_r
fi
unset _hojemt_ok
