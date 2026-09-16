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
#                    (default: intsoft.com.br www.intsoft.com.br — comenta.com.br
#                    ainda aponta para o Cloud Run; inclua quando o DNS mudar)
#   PORT             porta do Next (default: 3000)
#   EMAIL            e-mail do Let's Encrypt. Sem ele, o certbot só roda se o
#                    servidor já tiver uma conta Let's Encrypt (é o caso de um
#                    servidor que já emitiu certificado antes); senão o SSL é pulado.
#   SKIP_SSL=1       pula o certbot (útil antes do DNS propagar)
#   TAKE_OVER=1      se outro site do Nginx já responde por um dos DOMAINS (o
#                    Ghost, por exemplo), o padrão é PARAR sem mexer no Nginx.
#                    Com TAKE_OVER=1 o site assume o domínio: o vhost do outro
#                    site é desabilitado (o arquivo fica em sites-available) e,
#                    se houver algo na porta 2368, /ghost/ e /content/ continuam
#                    indo para o Ghost — o admin segue em DOMINIO/ghost/.
#   GHOST_UPSTREAM   destino de /ghost/ e /content/ no modo TAKE_OVER
#                    (default: http://127.0.0.1:2368 se a porta estiver escutando)
#   NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_API_URL  URLs embutidas no build (modo 2)
set -euo pipefail

RELEASE_TARBALL="${RELEASE_TARBALL:-}"
REVISION="${REVISION:-}"
BRANCH="${BRANCH:-main}"
BASE="${BASE:-/srv/comenta-site}"
DOMAINS="${DOMAINS:-intsoft.com.br www.intsoft.com.br}"
PORT="${PORT:-3000}"
EMAIL="${EMAIL:-}"
SKIP_SSL="${SKIP_SSL:-0}"
TAKE_OVER="${TAKE_OVER:-0}"
GHOST_UPSTREAM="${GHOST_UPSTREAM:-}"
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
CONF="/etc/nginx/sites-available/intsoft.com.br"
ENABLED="/etc/nginx/sites-enabled/intsoft.com.br"

# Outro site habilitado já responde por algum destes domínios? O Nginx entrega
# o nome ao primeiro bloco que casar, na ordem alfabética dos arquivos — e em
# qualquer ordem um dos dois sites some sem aviso. Por isso o padrão é parar
# aqui, antes de tocar no Nginx, e deixar a decisão com quem opera o servidor.
# TAKE_OVER=1 desabilita o outro vhost (o arquivo fica em sites-available) e
# mantém /ghost/ e /content/ indo para o Ghost.
CONFLICTS=""
for d in $DOMAINS; do
  for f in /etc/nginx/sites-enabled/*; do
    [ -e "$f" ] || continue
    [ "$f" = "$ENABLED" ] && continue
    if grep -qE "^[[:space:]]*server_name[^;]*[[:space:]]$(printf '%s' "$d" | sed 's/\./\\./g')([[:space:]]|;)" "$f" 2>/dev/null; then
      case " $CONFLICTS " in *" $f "*) ;; *) CONFLICTS="$CONFLICTS $f";; esac
    fi
  done
done
if [ -n "$CONFLICTS" ] && [ "$TAKE_OVER" != "1" ]; then
  echo "  Estes vhosts já respondem por um dos domínios ($DOMAINS):"
  for f in $CONFLICTS; do echo "    - $f ($(readlink -f "$f"))"; done
  echo "  Nada foi alterado no Nginx. O app está no ar em http://127.0.0.1:$PORT."
  echo "  Escolha um caminho e rode de novo:"
  echo "    1) mover o outro site para outro nome (ex.: blog.intsoft.com.br) e repetir o deploy; ou"
  echo "    2) TAKE_OVER=1 — o site assume o domínio, o outro vhost é desabilitado e"
  echo "       /ghost/ e /content/ continuam no Ghost (admin em https://$(echo "$DOMAINS" | awk '{print $1}')/ghost/)."
  die "conflito de server_name no Nginx (use TAKE_OVER=1 para assumir o domínio)."
fi
if [ -n "$CONFLICTS" ]; then
  for f in $CONFLICTS; do
    echo "  TAKE_OVER=1: desabilitando $f (arquivo mantido em $(readlink -f "$f"))"
    rm -f "$f"
  done
fi

# Ghost na mesma máquina? Mantém o admin e as mídias dele no domínio.
if [ -z "$GHOST_UPSTREAM" ] && ss -ltn 2>/dev/null | grep -qE '[:.]2368[[:space:]]'; then
  GHOST_UPSTREAM="http://127.0.0.1:2368"
fi
GHOST_LOCATIONS=""
if [ -n "$GHOST_UPSTREAM" ]; then
  echo "  /ghost/ e /content/ -> $GHOST_UPSTREAM"
  GHOST_LOCATIONS="
    # Ghost na mesma máquina: admin, API e mídias continuam no domínio.
    location ^~ /ghost/ {
        proxy_pass $GHOST_UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50M;
    }
    location ^~ /content/ {
        proxy_pass $GHOST_UPSTREAM;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
"
fi

# Sem default_server nem catch-all: o bloco responde só pelos domínios da lista.
cat > "$CONF" <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAINS;

    client_max_body_size 20M;
$GHOST_LOCATIONS
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
ln -sfn "$CONF" "$ENABLED"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "5/5 HTTPS (Let's Encrypt)"
CERT_ARGS=""
for d in $DOMAINS; do CERT_ARGS="$CERT_ARGS -d $d"; done
# Conta Let's Encrypt já registrada neste servidor (um certificado emitido
# antes, pelo Ghost por exemplo)? Então o certbot dispensa o -m.
HAS_LE_ACCOUNT=0
if [ -d /etc/letsencrypt/accounts ] && find /etc/letsencrypt/accounts -name regr.json 2>/dev/null | grep -q .; then
  HAS_LE_ACCOUNT=1
fi
if [ "$SKIP_SSL" = "1" ]; then
  echo "  SKIP_SSL=1 — pulei o certbot. Depois: certbot --nginx$CERT_ARGS -m SEU@EMAIL --agree-tos"
elif [ -z "$EMAIL" ] && [ "$HAS_LE_ACCOUNT" != "1" ]; then
  echo "  EMAIL não definido e sem conta Let's Encrypt — pulei o SSL. Rode: certbot --nginx$CERT_ARGS -m SEU@EMAIL --agree-tos"
else
  EMAIL_ARGS=""
  [ -n "$EMAIL" ] && EMAIL_ARGS="-m $EMAIL"
  # --expand: se já existe certificado com parte destes nomes (o do Ghost),
  # amplia em vez de falhar pedindo confirmação.
  # shellcheck disable=SC2086
  certbot --nginx --non-interactive --agree-tos --redirect --expand $EMAIL_ARGS $CERT_ARGS \
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
