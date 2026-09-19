#!/usr/bin/env bash
# =============================================================================
#  ghost_migrar_api.sh — migra o CONTEÚDO de um Ghost para outro só pela Admin
#  API (posts, páginas, tags, tags↔post, autores, configurações). Não precisa
#  de SSH nem de acesso ao servidor: fala HTTPS com os dois /ghost/api/admin/.
#  Roda de qualquer lugar que alcance os dois domínios — inclusive daqui.
#
#    SRC_URL=https://hojemt.com.br     SRC_KEY=<id:secret do Ghost da Azure> \
#    DST_URL=https://blog.intsoft.com.br DST_KEY=<id:secret do Ghost da Oracle> \
#    bash deploy/ghost_migrar_api.sh
#
#  O Ghost mescla por slug na importação: post que já existe não duplica. Antes
#  de importar, exporta o DESTINO para /var/backups (ou ./ se não for root) —
#  caminho de volta.
#
#  LIMITE: a exportação do banco NÃO leva os ARQUIVOS de imagem (só as URLs, que
#  continuam apontando para o domínio de origem). Para um site com poucas fotos
#  isso é aceitável; para o acervo com fotos próprias, use a cópia servidor-a-
#  servidor (deploy/ghost_migrar_de_outro_servidor.sh), que traz content/ junto.
# =============================================================================
set -euo pipefail

SRC_URL="${SRC_URL:-}"; SRC_KEY="${SRC_KEY:-}"
DST_URL="${DST_URL:-}"; DST_KEY="${DST_KEY:-}"
API="$(cd "$(dirname "$0")" && pwd)/ghost-api.mjs"

die(){ printf '\nERRO: %s\n' "$*" >&2; exit 1; }
log(){ printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
command -v node >/dev/null 2>&1 || die "node não encontrado."
[ -f "$API" ] || die "ghost-api.mjs não está ao lado deste script."
for v in SRC_URL SRC_KEY DST_URL DST_KEY; do [ -n "${!v}" ] || die "$v é obrigatório."; done
for k in "$SRC_KEY" "$DST_KEY"; do
  case "$k" in id:secret|"<id real>:<secret real>"|*"<"*) die "chave '$k' é um exemplo, não uma Admin API key real (Ghost → Settings → Integrations → Add custom integration).";; esac
  case "$k" in *:*) ;; *) die "chave '$k' não está no formato id:secret.";; esac
done
[ "$SRC_URL" != "$DST_URL" ] || die "origem e destino são a mesma URL ($SRC_URL) — nada a migrar."

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if [ "$(id -u)" = "0" ]; then BK=/var/backups; else BK="$PWD"; fi
mkdir -p "$BK"; TS="$(date +%Y%m%d%H%M%S)"

log "1/4 Confere origem e destino"
echo -n "  origem : "; GHOST_ADMIN_URL="$SRC_URL" GHOST_ADMIN_API_KEY="$SRC_KEY" node "$API" info || die "não falei com a origem ($SRC_URL). Chave certa? Integração é 'Administrator'?"
echo -n "  destino: "; GHOST_ADMIN_URL="$DST_URL" GHOST_ADMIN_API_KEY="$DST_KEY" node "$API" info || die "não falei com o destino ($DST_URL)."

log "2/4 Backup do destino antes de importar"
BKFILE="$BK/ghost-destino-antes-$TS.json"
GHOST_ADMIN_URL="$DST_URL" GHOST_ADMIN_API_KEY="$DST_KEY" node "$API" export "$BKFILE" || die "não consegui exportar o destino — parando para não importar sem caminho de volta."
chmod 600 "$BKFILE" 2>/dev/null || true
echo "  $BKFILE ($(du -h "$BKFILE" | cut -f1))"

log "3/4 Exporta a origem"
SRCFILE="$TMP/origem.json"
GHOST_ADMIN_URL="$SRC_URL" GHOST_ADMIN_API_KEY="$SRC_KEY" node "$API" export "$SRCFILE" || die "falhou exportar a origem."

log "4/4 Importa no destino ($DST_URL)"
GHOST_ADMIN_URL="$DST_URL" GHOST_ADMIN_API_KEY="$DST_KEY" node "$API" import "$SRCFILE"
echo
echo -n "  destino agora: "; GHOST_ADMIN_URL="$DST_URL" GHOST_ADMIN_API_KEY="$DST_KEY" node "$API" info || true
cat <<TXT

Pronto. O que a Admin API NÃO trouxe: os arquivos de imagem (as URLs em cada
post ainda apontam para $SRC_URL). Se as fotos são de banco/placeholder, tudo
bem; se são o acervo próprio, copie content/images à parte.
Caminho de volta do destino: $BKFILE
TXT
