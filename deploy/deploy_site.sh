#!/usr/bin/env bash
# =============================================================
# deploy_site.sh — publica o site do Comenta (Next.js) num servidor Ubuntu,
# servindo intsoft.com.br e comenta.com.br pelo Nginx com SSL.
# =============================================================
# Dois jeitos de usar:
#
# 1) Pelo GitHub (recomendado): o workflow .github/workflows/deploy.yml builda
#    no runner, manda um tarball e roda este script com RELEASE_TARBALL. O
#    servidor não compila nada. Veja deploy/GITHUB-DEPLOY.md.
#
# 2) Na mão, direto no servidor (clona o repo e builda lá):
#
#   curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/main/deploy/deploy_site.sh \
#     | sudo EMAIL=voce@exemplo.com bash
#
# Variáveis (todas opcionais):
#   RELEASE_TARBALL  tarball pronto (modo 1). Sem ele, entra no modo 2.
#   REVISION         commit publicado (só para o nome da pasta do release)
#   BRANCH           ramo do repo no modo 2 (default: main)
#   BASE             pasta de instalação (default: /srv/comenta-site)
#   DOMAINS          domínios do Nginx, separados por espaço
#                    (default: intsoft.com.br www.intsoft.com.br comenta.com.br www.comenta.com.br)
#   PORT             porta do Next (default: 3000)
#   EMAIL            e-mail do Let's Encrypt; sem ele o SSL é pulado
#   SKIP_SSL=1       pula o certbot (útil antes do DNS propagar)
#   NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_API_URL  URLs embutidas no build (modo 2)
set -euo pipefail

RELEASE_TARBALL="${RELEASE_TARBALL:-}"
REVISION="${REVISION:-}"
BRANCH="${BRANCH:-main}"
BASE="${BASE:-/srv/comenta-site}"
DOMAINS="${DOMAINS:-intsoft.com.br www.intsoft.com.br comenta.com.br www.comenta.com.br}"
PORT="${PORT:-3000}"
EMAIL="${EMAIL:-}"
SKIP_SSL="${SKIP_SSL:-0}"
REPO="https://github.com/hebertpaes/comenta.git"
APP_NAME="comenta-site"

log(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }
[ "$(id -u)" = "0" ] || die "rode como root (use sudo)."

export DEBIAN_FRONTEND=noninteractive

log "1/5 Dependências (Node 22, PM2, Nginx, Certbot)"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null 2>&1 || npm install -g pm2 --no-audit --no-fund
command -v nginx >/dev/null 2>&1 || { apt-get update -y && apt-get install -y nginx; }
command -v certbot >/dev/null 2>&1 || apt-get install -y certbot python3-certbot-nginx
command -v git >/dev/null 2>&1 || apt-get install -y git
echo "  node $(node -v) · pm2 $(pm2 -v) · nginx ok"

mkdir -p "$BASE/releases"

if [ -n "$RELEASE_TARBALL" ]; then
  # ---------------------------------------------- modo 1: tarball do GitHub
  [ -f "$RELEASE_TARBALL" ] || die "tarball não encontrado: $RELEASE_TARBALL"
  REV="${REVISION:-$(date +%Y%m%d%H%M%S)}"
  RELEASE_DIR="$BASE/releases/${REV:0:12}"
  log "2/5 Release $RELEASE_DIR (tarball)"
  rm -rf "$RELEASE_DIR" && mkdir -p "$RELEASE_DIR"
  tar -xzf "$RELEASE_TARBALL" -C "$RELEASE_DIR"
  rm -f "$RELEASE_TARBALL"
else
  # ---------------------------------------------- modo 2: clona e builda aqui
  REPO_DIR="$BASE/repo"
  log "2/5 Repositório em $REPO_DIR (branch $BRANCH)"
  if [ -d "$REPO_DIR/.git" ]; then
    git -C "$REPO_DIR" fetch origin "$BRANCH" --depth 1 -q
    git -C "$REPO_DIR" checkout -q "$BRANCH"
    git -C "$REPO_DIR" reset --hard -q "origin/$BRANCH"
  else
    git clone --branch "$BRANCH" --depth 1 "$REPO" "$REPO_DIR"
  fi
  REV="$(git -C "$REPO_DIR" rev-parse HEAD)"
  RELEASE_DIR="$BASE/releases/${REV:0:12}"

  log "   Build do site (npm ci + next build) — pode demorar numa VM pequena"
  ( cd "$REPO_DIR" \
    && npm ci --ignore-scripts --no-audit --no-fund \
    && NEXT_TELEMETRY_DISABLED=1 npm run build -w @comenta/site )

  # Mesma montagem do site/Dockerfile e do workflow: standalone + static + public.
  rm -rf "$RELEASE_DIR" && mkdir -p "$RELEASE_DIR/site/.next"
  cp -a "$REPO_DIR/site/.next/standalone/." "$RELEASE_DIR/"
  cp -a "$REPO_DIR/site/.next/static" "$RELEASE_DIR/site/.next/static"
  cp -a "$REPO_DIR/site/public" "$RELEASE_DIR/site/public"
  echo "$REV" > "$RELEASE_DIR/REVISION"
fi

[ -f "$RELEASE_DIR/site/server.js" ] || die "release incompleto: falta site/server.js em $RELEASE_DIR"
ln -sfn "$RELEASE_DIR" "$BASE/current"

log "3/5 PM2 ($APP_NAME na porta $PORT)"
# HOSTNAME fixo em 127.0.0.1: só o Nginx fala com o Next. Reiniciar com --update-env
# faz o processo já existente pegar a pasta nova do symlink.
cat > "$BASE/ecosystem.config.cjs" <<ECO
module.exports = {
  apps: [
    {
      name: "$APP_NAME",
      cwd: "$BASE/current",
      script: "site/server.js",
      env: { NODE_ENV: "production", PORT: "$PORT", HOSTNAME: "127.0.0.1", NEXT_TELEMETRY_DISABLED: "1" },
      max_memory_restart: "400M",
    },
  ],
};
ECO
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$BASE/ecosystem.config.cjs" --update-env >/dev/null
else
  pm2 start "$BASE/ecosystem.config.cjs" >/dev/null
fi
pm2 save >/dev/null
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
pm2 status "$APP_NAME" | tail -n +1

# Mantém só os 3 releases mais recentes.
ls -1dt "$BASE"/releases/* 2>/dev/null | tail -n +4 | xargs -r rm -rf

log "4/5 Nginx ($DOMAINS)"
# Mesmo arquivo que o deploy/oracle_setup.sh usava: substitui o servidor de
# espera da porta 2368 pelo site de verdade, sem deixar dois blocos brigando
# pelos mesmos server_name.
CONF="/etc/nginx/sites-available/intsoft.com.br"
cat > "$CONF" <<NGX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAINS _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGX
ln -sfn "$CONF" /etc/nginx/sites-enabled/intsoft.com.br
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "5/5 HTTPS (Let's Encrypt)"
CERT_ARGS=""
for d in $DOMAINS; do CERT_ARGS="$CERT_ARGS -d $d"; done
if [ "$SKIP_SSL" = "1" ]; then
  echo "  SKIP_SSL=1 — pulei o certbot. Depois: certbot --nginx$CERT_ARGS -m SEU@EMAIL --agree-tos"
elif [ -z "$EMAIL" ]; then
  echo "  EMAIL não definido — pulei o SSL. Rode: certbot --nginx$CERT_ARGS -m SEU@EMAIL --agree-tos"
else
  # shellcheck disable=SC2086
  certbot --nginx --non-interactive --agree-tos --redirect -m "$EMAIL" $CERT_ARGS \
    || echo "  certbot falhou (o DNS de todos os domínios já aponta para este servidor?). Reveja e rode manualmente."
fi

log "Concluído — release ${REV:0:12}"
for i in $(seq 1 15); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/health"; then echo "  /health respondeu 200 na porta $PORT."; break; fi
  sleep 1
done
cat <<FIM
  Site ......... http://$(echo "$DOMAINS" | awk '{print $1}')  (e os demais: $DOMAINS)
  Pasta ........ $BASE/current -> $RELEASE_DIR
  Logs ......... pm2 logs $APP_NAME
  Reiniciar .... pm2 restart $APP_NAME
FIM
