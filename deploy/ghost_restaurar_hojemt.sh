#!/usr/bin/env bash
# =============================================================
# ghost_restaurar_hojemt.sh — manda o que está no git para o Ghost do servidor
# =============================================================
# Envia duas coisas que vivem neste repositório:
#
#   1. o TEMA  — ghost/content/themes/hojemt (Hoje MT, USA TODAY design)
#   2. o CONTEÚDO — ghost/content/themes/hojemt/content/noticias.json,
#      um export do Ghost com 317 posts e 13 tags
#
# LEIA ANTES DE IMPORTAR O CONTEÚDO: desses 317 posts, 300 usam as imagens de
# placeholder do próprio tema (/assets/img/ph-1..4.svg) e 17 usam fotos de banco
# (Unsplash). Nenhum traz foto de pauta nem crédito de fonte. É conteúdo de
# semente, não o acervo fotografado do portal — por isso a importação é opcional
# e não roda sozinha.
#
# Uso, no servidor (como root). O RAMO aparece duas vezes de propósito: uma no
# endereço de onde o script é baixado, outra em BRANCH, que é o ramo que ele
# clona no servidor. Se os dois não baterem, o script baixa uma versão e usa
# outra — por isso a variável vai junto no comando:
#
#   ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
#   curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/ghost_restaurar_hojemt.sh" \
#     | sudo BRANCH="$ramo" GHOST_ADMIN_API_KEY='<id real>:<secret real>' bash
#
# Variáveis:
#   GHOST_ADMIN_API_KEY  id:secret (Ghost → Settings → Integrations → Add custom
#                        integration). Sem ela o tema ainda é instalado por
#                        cópia de arquivo, mas a ativação e a importação de
#                        conteúdo têm de ser feitas pelo admin.
#   GHOST_ADMIN_URL      default http://127.0.0.1:2368
#   IMPORTAR_CONTEUDO=1  importa os 317 posts (o Ghost mescla por slug; posts
#                        que já existem são ignorados, não duplicados)
#   ATIVAR_TEMA=0        envia o tema mas não o ativa
#   BRANCH / BASE        ramo e pasta do repositório (default main, /srv/comenta).
#                        Hoje ghost-api.mjs só existe no ramo de trabalho, então
#                        BRANCH é obrigatório até o merge em main.
set -euo pipefail

BRANCH="${BRANCH:-main}"
BASE="${BASE:-/srv/comenta}"
GHOST_ADMIN_URL="${GHOST_ADMIN_URL:-http://127.0.0.1:2368}"
GHOST_ADMIN_API_KEY="${GHOST_ADMIN_API_KEY:-}"
IMPORTAR_CONTEUDO="${IMPORTAR_CONTEUDO:-0}"
ATIVAR_TEMA="${ATIVAR_TEMA:-1}"
REPO="https://github.com/hebertpaes/comenta.git"
export GHOST_ADMIN_URL GHOST_ADMIN_API_KEY

log(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }
[ "$(id -u)" = "0" ] || die "rode como root (use sudo)."
command -v node >/dev/null 2>&1 || die "node não encontrado (o Ghost precisa dele; rode o bootstrap.sh antes)."
command -v zip >/dev/null 2>&1 || die "zip não encontrado — instale com: apt-get install -y zip"
# "id:secret" é o texto de exemplo do cabeçalho. Colado como está, o Ghost
# devolveria um 401 seco lá na frente, depois de já ter mexido no tema.
case "$GHOST_ADMIN_API_KEY" in
  id:secret|"<id real>:<secret real>")
    die "GHOST_ADMIN_API_KEY=$GHOST_ADMIN_API_KEY é o exemplo do cabeçalho, não uma chave. Pegue a sua em Ghost → Settings → Integrations → Add custom integration (campo Admin API key)." ;;
esac

log "1/4 Repositório (ramo $BRANCH)"
REPO_DIR="$BASE/comenta"
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch origin "$BRANCH" --depth 1 -q
  git -C "$REPO_DIR" checkout -q "$BRANCH" 2>/dev/null || git -C "$REPO_DIR" checkout -q -B "$BRANCH" FETCH_HEAD
  git -C "$REPO_DIR" reset --hard -q FETCH_HEAD
else
  mkdir -p "$BASE"
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$REPO_DIR"
fi
TEMA_DIR="$REPO_DIR/ghost/content/themes/hojemt"
EXPORT_JSON="$TEMA_DIR/content/noticias.json"
API="$REPO_DIR/deploy/ghost-api.mjs"
[ -d "$TEMA_DIR" ] || die "tema não encontrado em $TEMA_DIR (ramo $BRANCH)"
[ -f "$API" ] || die "deploy/ghost-api.mjs não existe no ramo $BRANCH. Ele ainda não foi para main — rode de novo com BRANCH=claude/exciting-thompson-4rhut2 (o mesmo ramo do endereço de onde você baixou este script)."
echo "  commit: $(git -C "$REPO_DIR" rev-parse --short HEAD)"

log "2/4 Ghost"
if [ -n "$GHOST_ADMIN_API_KEY" ]; then
  node "$API" info || die "não consegui falar com o Ghost em $GHOST_ADMIN_URL."
  # Backup ANTES de mexer: se a importação trouxer algo indesejado, este arquivo
  # é o caminho de volta (Ghost → Settings → Labs → Import content).
  BACKUP="/var/backups/ghost-antes-$(date +%Y%m%d%H%M%S).json"
  mkdir -p /var/backups
  node "$API" export "$BACKUP" || die "não consegui exportar o conteúdo atual — parando aqui, para não mexer em nada sem caminho de volta."
  chmod 600 "$BACKUP"
  echo "  backup do conteúdo atual: $BACKUP"
else
  echo "  sem GHOST_ADMIN_API_KEY — sigo só com a cópia de arquivo do tema."
fi

log "3/4 Tema"
ZIP="$(mktemp -d)/hojemt.zip"
# Empacota a PASTA, não o .zip versionado: o zip do repo é gerado e envelhece.
( cd "$TEMA_DIR" && zip -qr "$ZIP" . -x '.*' -x '__MACOSX/*' ) \
  || die "falhou empacotar o tema (o pacote 'zip' está instalado?)."
echo "  empacotado: $(du -h "$ZIP" | cut -f1)"

if [ -n "$GHOST_ADMIN_API_KEY" ]; then
  node "$API" upload-theme "$ZIP"
  [ "$ATIVAR_TEMA" = "1" ] && node "$API" activate-theme hojemt
else
  GHOST_DIR="$(find /var/www -maxdepth 3 -name config.production.json -printf '%h\n' 2>/dev/null | head -n1 || true)"
  [ -n "$GHOST_DIR" ] || die "não achei a instalação do Ghost em /var/www — passe GHOST_ADMIN_API_KEY."
  DESTINO="$GHOST_DIR/content/themes/hojemt"
  [ -d "$DESTINO" ] && mv -f "$DESTINO" "$DESTINO.antes-$(date +%Y%m%d%H%M%S)"
  mkdir -p "$DESTINO"
  cp -a "$TEMA_DIR/." "$DESTINO/"
  DONO="$(stat -c '%U:%G' "$GHOST_DIR/content/themes" 2>/dev/null || echo ghost:ghost)"
  chown -R "$DONO" "$DESTINO"
  echo "  copiado para $DESTINO (dono $DONO)"
  ( cd "$GHOST_DIR" && sudo -u "${DONO%%:*}" ghost restart ) >/dev/null 2>&1 \
    && echo "  Ghost reiniciado." || echo "  reinicie o Ghost à mão (ghost restart)."
  echo "  ATIVE o tema em Settings → Design → Change theme → hojemt."
fi
rm -rf "$(dirname "$ZIP")"

log "4/4 Conteúdo"
if [ ! -f "$EXPORT_JSON" ]; then
  echo "  $EXPORT_JSON não existe — nada a importar."
elif [ "$IMPORTAR_CONTEUDO" != "1" ]; then
  echo "  Pulado. Os 317 posts do export NÃO foram importados."
  echo "  São conteúdo de semente: 300 deles usam as imagens de placeholder do"
  echo "  tema e nenhum tem crédito de fonte. Se é isso mesmo que você quer no ar,"
  echo "  rode de novo com IMPORTAR_CONTEUDO=1."
elif [ -z "$GHOST_ADMIN_API_KEY" ]; then
  echo "  IMPORTAR_CONTEUDO=1 pedido, mas sem GHOST_ADMIN_API_KEY."
  echo "  Importe pelo admin: Settings → Labs → Import content → $EXPORT_JSON"
else
  node "$API" import "$EXPORT_JSON"
  node "$API" info
fi

log "Concluído"
