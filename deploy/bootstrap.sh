#!/usr/bin/env bash
# =============================================================
# bootstrap.sh — instala TODO o Comenta num VPS (monorepo único)
# =============================================================
# Uso (como root, no VPS), com DNS já apontando p/ o servidor:
#
#   curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/claude/project-creation-az9g99/deploy/bootstrap.sh \
#     | sudo DOMAIN=comenta.com.br [email protected] bash
#
# ou, se já clonou o repo:
#   sudo DOMAIN=comenta.com.br [email protected] bash deploy/bootstrap.sh
#
# Variáveis (todas opcionais menos EMAIL para o SSL):
#   DOMAIN   domínio raiz (default: comenta.com.br)
#   EMAIL    e-mail para o Let's Encrypt (obrigatório p/ emitir SSL)
#   BRANCH   branch do repo (default: claude/project-creation-az9g99)
#   BASE     diretório de instalação (default: /srv/comenta)
#   SKIP_SSL =1 pula o certbot (útil antes do DNS propagar)
set -euo pipefail

DOMAIN="${DOMAIN:-comenta.com.br}"
BRANCH="${BRANCH:-claude/project-creation-az9g99}"
BASE="${BASE:-/srv/comenta}"
EMAIL="${EMAIL:-}"
SKIP_SSL="${SKIP_SSL:-0}"
REPO="https://github.com/hebertpaes/comenta.git"

log(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }
[ "$(id -u)" = "0" ] || die "rode como root (use sudo)."

log "1/7 Dependências (Docker, Nginx, Certbot)"
export DEBIAN_FRONTEND=noninteractive
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh
docker compose version >/dev/null 2>&1 || { apt-get update -y && apt-get install -y docker-compose-plugin || true; }
command -v nginx >/dev/null 2>&1 || { apt-get update -y && apt-get install -y nginx; }
command -v certbot >/dev/null 2>&1 || apt-get install -y certbot python3-certbot-nginx
command -v git >/dev/null 2>&1 || apt-get install -y git

log "2/7 Repositório em $BASE (branch $BRANCH)"
mkdir -p "$BASE"
REPO_DIR="$BASE/comenta"
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch origin "$BRANCH" --depth 1 -q
  git -C "$REPO_DIR" checkout "$BRANCH" -q
  git -C "$REPO_DIR" reset --hard "origin/$BRANCH" -q
else
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$REPO_DIR"
fi
DEPLOY_DIR="$REPO_DIR/deploy"

log "3/7 Segredos ($DEPLOY_DIR/.env)"
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
  gen(){ openssl rand -hex 32; }
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 16)|"       "$DEPLOY_DIR/.env"
  sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$(openssl rand -hex 16)|" "$DEPLOY_DIR/.env"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(gen)|"                          "$DEPLOY_DIR/.env"
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(gen)|"          "$DEPLOY_DIR/.env"
  echo "  .env gerado com segredos aleatórios. Edite p/ ANTHROPIC_API_KEY e NEXT_PUBLIC_WHATSAPP."
else
  echo "  .env já existe — mantido."
fi

log "4/7 Build do painel (Vite) via container node"
docker run --rm \
  -e VITE_API_URL="https://api.$DOMAIN" \
  -v "$REPO_DIR/saas/web":/app -w /app \
  node:22-alpine sh -c "npm ci && npm run build"

log "5/7 Subindo containers (site + api + painel + postgres + redis)"
cd "$DEPLOY_DIR"
docker compose --env-file .env up -d --build
docker compose ps

log "6/7 Nginx"
CONF_DST="/etc/nginx/sites-available/comenta.conf"
sed "s/comenta\.com\.br/$DOMAIN/g" "$DEPLOY_DIR/nginx/comenta.conf" > "$CONF_DST"
ln -sf "$CONF_DST" /etc/nginx/sites-enabled/comenta.conf
nginx -t && systemctl reload nginx

log "7/7 HTTPS (Let's Encrypt)"
if [ "$SKIP_SSL" = "1" ]; then
  echo "  SKIP_SSL=1 — pulei o certbot. Rode depois:"
  echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN -d api.$DOMAIN"
elif [ -z "$EMAIL" ]; then
  echo "  EMAIL não definido — pulei o SSL. Rode:"
  echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN -d api.$DOMAIN -m SEU@EMAIL --agree-tos"
else
  certbot --nginx --non-interactive --agree-tos -m "$EMAIL" \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "app.$DOMAIN" -d "api.$DOMAIN" \
    || echo "  certbot falhou (DNS já propagou p/ este servidor?). Reveja e rode manualmente."
fi

log "Concluído"
cat <<EOF
  Site .... https://$DOMAIN
  Painel .. https://app.$DOMAIN
  API ..... https://api.$DOMAIN   (OpenAPI em /docs)

  Status:   cd $DEPLOY_DIR && docker compose ps
  Logs:     cd $DEPLOY_DIR && docker compose logs -f site
  Atualizar: sudo DOMAIN=$DOMAIN EMAIL=$EMAIL bash $DEPLOY_DIR/bootstrap.sh
EOF
