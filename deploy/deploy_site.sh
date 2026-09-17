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
#   O ramo vai duas vezes: na URL (escolhe a versão do script) e em BRANCH
#   (escolhe o código que o servidor clona). Hoje este arquivo não está em
#   main, então "main" na URL dá 404 e o comando falha calado.
#   ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
#   curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/deploy_site.sh" \
#     | sudo BRANCH="$ramo" EMAIL=voce@exemplo.com bash
#
# Rodar de novo é seguro: o vhost é reescrito inteiro a cada deploy, já com o
# bloco 443 quando existe certificado (o HTTPS não cai entre um deploy e o
# certbot), e o release em uso nunca é apagado por baixo do PM2.
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
#   SKIP_SSL=1       pula o certbot (útil antes do DNS propagar). Se já houver
#                    certificado cobrindo o domínio, o HTTPS continua no ar.
#   TAKE_OVER=1      se outro site do Nginx já responde por um dos DOMAINS (o
#                    Ghost, por exemplo), o padrão é PARAR sem mexer no Nginx.
#                    Com TAKE_OVER=1 o site assume o domínio: o vhost do outro
#                    site é desabilitado (o arquivo é preservado) e, se houver
#                    algo na porta 2368, /ghost e /content/ continuam indo para
#                    o Ghost — o admin segue em DOMINIO/ghost/.
#   GHOST_UPSTREAM   destino de /ghost e /content/ no modo TAKE_OVER
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
PRIMARY="${DOMAINS%% *}"
WEBROOT="/var/www/html"

log(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }
[ "$(id -u)" = "0" ] || die "rode como root (use sudo)."
[ -n "$PRIMARY" ] || die "DOMAINS está vazio."

export DEBIAN_FRONTEND=noninteractive

# `apt-get install` sem um `update` recente falha numa VM com o índice velho —
# e isso acontecia justamente quando só faltava o certbot.
APT_UPDATED=0
# DPkg::Lock::Timeout: no primeiro boot de uma VM o unattended-upgrades ainda
# segura o lock do dpkg, e sem esperar o apt falha na hora — o cloud-init
# terminaria sem instalar nada.
APT_OPTS="-o DPkg::Lock::Timeout=600"
apt_install(){
  # shellcheck disable=SC2086
  if [ "$APT_UPDATED" != "1" ]; then apt-get $APT_OPTS update -y >/dev/null; APT_UPDATED=1; fi
  # shellcheck disable=SC2086
  apt-get $APT_OPTS install -y "$@"
}

log "1/5 Dependências (Node 22, PM2, Nginx, Certbot)"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  APT_UPDATED=1   # o script da NodeSource já roda o update
  apt_install nodejs
fi
command -v pm2 >/dev/null 2>&1 || npm install -g pm2 --no-audit --no-fund
command -v nginx >/dev/null 2>&1 || apt_install nginx
command -v certbot >/dev/null 2>&1 || apt_install certbot python3-certbot-nginx
command -v git >/dev/null 2>&1 || apt_install git
command -v openssl >/dev/null 2>&1 || apt_install openssl
echo "  node $(node -v) · pm2 $(pm2 -v) · nginx ok"

mkdir -p "$BASE/releases"

# Pasta do release. Se já existe uma com este commit (redeploy do mesmo SHA), o
# PM2 pode estar rodando de dentro dela — apagar seria derrubar o site. Então
# cria uma irmã com sufixo de tempo e troca o symlink no fim.
release_dir_for(){
  local dir="$BASE/releases/${1:0:12}"
  [ -e "$dir" ] && dir="$dir-$(date +%s)"
  printf '%s' "$dir"
}

if [ -n "$RELEASE_TARBALL" ]; then
  # ---------------------------------------------- modo 1: tarball do GitHub
  [ -f "$RELEASE_TARBALL" ] || die "tarball não encontrado: $RELEASE_TARBALL"
  REV="${REVISION:-$(date +%Y%m%d%H%M%S)}"
  RELEASE_DIR="$(release_dir_for "$REV")"
  log "2/5 Release $RELEASE_DIR (tarball)"
  mkdir -p "$RELEASE_DIR"
  tar -xzf "$RELEASE_TARBALL" -C "$RELEASE_DIR"
  rm -f "$RELEASE_TARBALL"
  # O tar restaura o mtime da pasta com a data do build no runner; a poda por
  # `ls -t` usa esse mtime. Carimba com a hora do deploy.
  touch "$RELEASE_DIR"
else
  # ---------------------------------------------- modo 2: clona e builda aqui
  REPO_DIR="$BASE/repo"
  log "2/5 Repositório em $REPO_DIR (branch $BRANCH)"
  if [ -d "$REPO_DIR/.git" ]; then
    git -C "$REPO_DIR" fetch origin "$BRANCH" --depth 1 -q
    git -C "$REPO_DIR" checkout -q "$BRANCH" 2>/dev/null || git -C "$REPO_DIR" checkout -q -B "$BRANCH" FETCH_HEAD
    git -C "$REPO_DIR" reset --hard -q FETCH_HEAD
  else
    git clone --branch "$BRANCH" --depth 1 "$REPO" "$REPO_DIR"
  fi
  REV="$(git -C "$REPO_DIR" rev-parse HEAD)"
  RELEASE_DIR="$(release_dir_for "$REV")"

  log "   Build do site (npm ci + next build) — pode demorar numa VM pequena"
  ( cd "$REPO_DIR" \
    && npm ci --ignore-scripts --no-audit --no-fund \
    && NEXT_TELEMETRY_DISABLED=1 npm run build -w @comenta/site )

  # Mesma montagem do site/Dockerfile e do workflow: standalone + static + public.
  mkdir -p "$RELEASE_DIR/site/.next"
  cp -a "$REPO_DIR/site/.next/standalone/." "$RELEASE_DIR/"
  cp -a "$REPO_DIR/site/.next/static" "$RELEASE_DIR/site/.next/static"
  cp -a "$REPO_DIR/site/public" "$RELEASE_DIR/site/public"
  echo "$REV" > "$RELEASE_DIR/REVISION"
  touch "$RELEASE_DIR"
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

# Mantém só os 3 releases mais recentes — e nunca o que está no ar.
CURRENT_TARGET="$(readlink -f "$BASE/current" 2>/dev/null || true)"
ls -1dt "$BASE"/releases/* 2>/dev/null | tail -n +4 | while read -r old; do
  [ "$(readlink -f "$old")" = "$CURRENT_TARGET" ] && continue
  rm -rf "$old"
done || true

log "4/5 Nginx ($DOMAINS)"
CONF="/etc/nginx/sites-available/intsoft.com.br"
ENABLED="/etc/nginx/sites-enabled/intsoft.com.br"

# Outro site habilitado já responde por algum destes domínios? O Nginx entrega
# o nome ao primeiro bloco que casar, na ordem alfabética dos arquivos — e em
# qualquer ordem um dos dois sites some sem aviso. Por isso o padrão é parar
# aqui, antes de tocar no Nginx, e deixar a decisão com quem opera o servidor.
# Varre sites-enabled E conf.d: o nginx.conf do Ubuntu inclui os dois.
CONFLICTS=""
for d in $DOMAINS; do
  d_re="$(printf '%s' "$d" | sed 's/\./\\./g')"
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -f "$f" ] || continue
    [ "$f" = "$ENABLED" ] && continue
    [ "$f" = "$CONF" ] && continue
    if grep -qE "^[[:space:]]*server_name[^;]*[[:space:]]$d_re([[:space:]]|;)" "$f" 2>/dev/null; then
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
  echo "       /ghost e /content/ continuam no Ghost (admin em https://$PRIMARY/ghost/)."
  die "conflito de server_name no Nginx (use TAKE_OVER=1 para assumir o domínio)."
fi
# Ghost na mesma máquina? Mantém o admin e as mídias dele no domínio. Precisa
# vir ANTES de desabilitar os vhosts: o upstream de reserva sai de dentro deles.
if [ -z "$GHOST_UPSTREAM" ] && ss -ltn 2>/dev/null | grep -qE '[:.]2368[[:space:]]'; then
  GHOST_UPSTREAM="http://127.0.0.1:2368"
fi
if [ -n "$CONFLICTS" ] && [ -z "$GHOST_UPSTREAM" ]; then
  # `ss` pode não existir, e o Ghost pode não estar na 2368: o proxy_pass do
  # vhost que está saindo diz para onde o site dele ia.
  for f in $CONFLICTS; do
    GHOST_UPSTREAM="$(grep -hoE 'proxy_pass[[:space:]]+https?://[^;[:space:]]+' "$f" 2>/dev/null \
      | head -n1 | awk '{print $2}' || true)"
    [ -n "$GHOST_UPSTREAM" ] && { echo "  upstream herdado de $f: $GHOST_UPSTREAM"; break; }
  done
fi
if [ -n "$CONFLICTS" ] && [ -z "$GHOST_UPSTREAM" ]; then
  echo "  AVISO: não achei para onde o vhost que está saindo mandava o tráfego."
  echo "  /ghost e /content/ NÃO serão preservados. Se o Ghost está nesta máquina,"
  echo "  rode de novo com GHOST_UPSTREAM=http://127.0.0.1:2368 (ou a porta certa)."
fi
if [ -n "$CONFLICTS" ]; then
  for f in $CONFLICTS; do
    if [ -L "$f" ]; then
      # Link em sites-enabled: some o link, o arquivo real fica em sites-available.
      echo "  TAKE_OVER=1: desabilitando $f (arquivo mantido em $(readlink -f "$f"))"
      rm -f "$f"
    else
      # Arquivo de verdade (conf.d, ou sites-enabled sem link): renomeia, não apaga.
      echo "  TAKE_OVER=1: desabilitando $f (renomeado para $f.disabled)"
      mv -f "$f" "$f.disabled"
    fi
  done
fi

GHOST_LOCATIONS=""
if [ -n "$GHOST_UPSTREAM" ]; then
  echo "  /ghost e /content/ -> $GHOST_UPSTREAM"
  # `location = /ghost` é obrigatório: o site tem uma página Next em /ghost, e
  # sem esta linha quem digita o endereço sem a barra final cai nela em vez do
  # admin do Ghost.
  GHOST_LOCATIONS="
    # Ghost na mesma máquina: admin, API e mídias continuam no domínio.
    location = /ghost { return 301 /ghost/; }
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

APP_LOCATIONS="$(cat <<NGX
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
NGX
)"

# Certificado que já cobre o domínio principal (pode ter sido emitido pelo
# Ghost). Enquanto existir, o vhost gerado aqui já sai com o bloco 443 — é o
# que impede o HTTPS de cair a cada deploy, antes de o certbot rodar.
# Dois layouts convivem no mesmo servidor: o do certbot,
# /etc/letsencrypt/live/<nome>/fullchain.pem, e o que o ghost-cli cria com o
# acme.sh, /etc/letsencrypt/<domínio>/fullchain.cer.
CERT_FULLCHAIN=""; CERT_KEY=""; CERT_NAME=""

cert_tem_dominio(){
  openssl x509 -in "$1" -noout -ext subjectAltName 2>/dev/null \
    | grep -qE "DNS:$(printf '%s' "$2" | sed 's/\./\\./g')(,|$| )"
}

find_cert(){
  CERT_FULLCHAIN=""; CERT_KEY=""; CERT_NAME=""
  local d nome
  for d in /etc/letsencrypt/live/*/; do
    d="${d%/}"
    [ -f "$d/fullchain.pem" ] && [ -f "$d/privkey.pem" ] || continue
    if cert_tem_dominio "$d/fullchain.pem" "$PRIMARY"; then
      CERT_FULLCHAIN="$d/fullchain.pem"; CERT_KEY="$d/privkey.pem"
      CERT_NAME="$(basename "$d")"       # nome da linhagem, para o --cert-name
      return 0
    fi
  done
  for d in /etc/letsencrypt/*/; do
    d="${d%/}"; nome="$(basename "$d")"
    [ -f "$d/fullchain.cer" ] && [ -f "$d/$nome.key" ] || continue
    if cert_tem_dominio "$d/fullchain.cer" "$PRIMARY"; then
      CERT_FULLCHAIN="$d/fullchain.cer"; CERT_KEY="$d/$nome.key"
      return 0                            # acme.sh: não é linhagem do certbot
    fi
  done
  return 0
}

cert_cobre_todos(){
  local d
  [ -n "$CERT_FULLCHAIN" ] || return 1
  for d in $DOMAINS; do cert_tem_dominio "$CERT_FULLCHAIN" "$d" || return 1; done
}

# Escreve o vhost (80, mais 443 quando há certificado), testa e recarrega.
# `nginx -t && systemctl reload` NÃO aborta com set -e — o erro fica no meio de
# uma lista &&, que o errexit ignora. Por isso o teste é explícito, com volta
# para a configuração anterior se não passar.
write_vhost(){
  local backup=""
  [ -f "$CONF" ] && { backup="$(mktemp)"; cp -a "$CONF" "$backup"; }

  mkdir -p "$WEBROOT/.well-known/acme-challenge"

  # Sem default_server nem catch-all: o bloco responde só pelos domínios da lista.
  {
    cat <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAINS;

    client_max_body_size 20M;

    # Renovação do Let's Encrypt (webroot): tem de continuar em texto puro,
    # inclusive quando o resto do :80 redireciona para o HTTPS.
    location ^~ /.well-known/acme-challenge/ {
        root $WEBROOT;
        default_type text/plain;
        try_files \$uri =404;
    }
NGX
    if [ -n "$CERT_FULLCHAIN" ]; then
      cat <<NGX

    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAINS;

    ssl_certificate $CERT_FULLCHAIN;
    ssl_certificate_key $CERT_KEY;
NGX
      # `http2 on;` só existe a partir do nginx 1.25.1; no 1.24 do Ubuntu 24.04
      # a diretiva é desconhecida e o `nginx -t` reprova a configuração inteira.
      NGX_VER="$(nginx -v 2>&1 | sed -n 's|.*nginx/\([0-9.]*\).*|\1|p' || true)"
      if [ -n "$NGX_VER" ] && [ "$(printf '%s\n1.25.1\n' "$NGX_VER" | sort -V | head -n1)" = "1.25.1" ]; then
        echo "    http2 on;"
      fi
      [ -f /etc/letsencrypt/options-ssl-nginx.conf ] && echo "    include /etc/letsencrypt/options-ssl-nginx.conf;"
      [ -f /etc/letsencrypt/ssl-dhparams.pem ] && echo "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
      echo
      echo "    client_max_body_size 20M;"
    fi
    printf '%s\n' "$GHOST_LOCATIONS"
    printf '%s\n' "$APP_LOCATIONS"
    echo "}"
  } > "$CONF"

  ln -sfn "$CONF" "$ENABLED"
  rm -f /etc/nginx/sites-enabled/default
  if ! nginx -t 2>&1; then
    if [ -n "$backup" ]; then
      cp -a "$backup" "$CONF"; rm -f "$backup"
      nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
      die "nginx -t recusou a configuração nova; voltei para a anterior."
    fi
    rm -f "$ENABLED"
    die "nginx -t recusou a configuração nova; deixei o vhost desabilitado."
  fi
  rm -f "$backup"
  systemctl reload nginx || die "systemctl reload nginx falhou."
}

find_cert
write_vhost
[ -n "$CERT_FULLCHAIN" ] && echo "  HTTPS mantido no ar com o certificado $CERT_FULLCHAIN"

# Imagens Ubuntu da Oracle Cloud sobem com iptables rejeitando tudo menos a 22
# (além da security list da VCN). Abre 80/443 só se essa regra existir, e
# persiste para sobreviver ao reboot.
if command -v iptables >/dev/null 2>&1 && iptables -C INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; then
  for port in 80 443; do
    if ! iptables -C INPUT -p tcp -m state --state NEW -m tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      # Entra logo ANTES do primeiro REJECT/DROP da chain. Uma posição fixa
      # (era 5) só acerta no layout exato da imagem da Oracle; em qualquer
      # outro, a regra cairia depois do REJECT e não valeria nada.
      POS="$(iptables -L INPUT --line-numbers -n 2>/dev/null | awk '$2=="REJECT"||$2=="DROP"{print $1; exit}' || true)"
      iptables -I INPUT "${POS:-1}" -p tcp -m state --state NEW -m tcp --dport "$port" -j ACCEPT
    fi
  done
  netfilter-persistent save >/dev/null 2>&1 || true
  echo "  iptables: 80 e 443 liberadas."
fi

log "5/5 HTTPS (Let's Encrypt)"
CERT_ARGS=""
for d in $DOMAINS; do CERT_ARGS="$CERT_ARGS -d $d"; done
CERT_NAME="${CERT_NAME:-$PRIMARY}"
# Conta Let's Encrypt já registrada neste servidor (um certificado emitido
# antes, pelo Ghost por exemplo)? Então o certbot dispensa o -m.
HAS_LE_ACCOUNT=0
if [ -d /etc/letsencrypt/accounts ] && find /etc/letsencrypt/accounts -name regr.json 2>/dev/null | grep -q .; then
  HAS_LE_ACCOUNT=1
fi
if [ "$SKIP_SSL" = "1" ]; then
  echo "  SKIP_SSL=1 — pulei o certbot. Depois: certbot certonly --webroot -w $WEBROOT$CERT_ARGS -m SEU@EMAIL --agree-tos && $0"
elif cert_cobre_todos; then
  echo "  certificado $CERT_NAME já cobre $DOMAINS — nada a emitir (a renovação é do systemd timer do certbot)."
elif [ -z "$EMAIL" ] && [ "$HAS_LE_ACCOUNT" != "1" ]; then
  echo "  EMAIL não definido e sem conta Let's Encrypt — pulei o SSL."
  echo "  Rode: certbot certonly --webroot -w $WEBROOT$CERT_ARGS -m SEU@EMAIL --agree-tos"
else
  EMAIL_ARGS=""
  [ -n "$EMAIL" ] && EMAIL_ARGS="-m $EMAIL"
  # --webroot em vez de --nginx: o certbot não edita o vhost (que este script
  # reescreve inteiro a cada deploy), só grava o certificado. --expand amplia a
  # linhagem existente quando ela cobre parte dos nomes, em vez de falhar.
  # shellcheck disable=SC2086
  if certbot certonly --webroot -w "$WEBROOT" --cert-name "$CERT_NAME" \
       --non-interactive --agree-tos --expand --keep-until-expiring $EMAIL_ARGS $CERT_ARGS; then
    find_cert
    if [ -n "$CERT_FULLCHAIN" ]; then
      write_vhost
      echo "  HTTPS no ar: https://$PRIMARY"
    fi
  else
    echo "  certbot falhou (o DNS de todos os domínios já aponta para este servidor?)."
    echo "  O site segue no ar em HTTP. Reveja o DNS e rode este script de novo."
  fi
fi

log "Concluído — release ${REV:0:12}"
for _ in $(seq 1 15); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/health"; then echo "  /health respondeu 200 na porta $PORT."; break; fi
  sleep 1
done
cat <<FIM
  Site ......... http://$PRIMARY  (e os demais: $DOMAINS)
  Pasta ........ $BASE/current -> $RELEASE_DIR
  Logs ......... pm2 logs $APP_NAME
  Reiniciar .... pm2 restart $APP_NAME
FIM
