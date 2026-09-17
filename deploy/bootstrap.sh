#!/usr/bin/env bash
# =============================================================
# bootstrap.sh — instala/migra TODO o Comenta num servidor Ubuntu
# =============================================================
# Sobe site + painel + API + Postgres + Redis em Docker e publica tudo pelo
# Nginx do host, com HTTPS. Feito para rodar TAMBÉM num servidor que já tem
# coisa no ar (é o caso do 147.15.103.114, onde o Ghost atende intsoft.com.br):
# nada é sobrescrito sem aviso e o blog continua funcionando.
#
# Uso, no servidor (como root). O RAMO vai duas vezes: no endereço de onde o
# script é baixado e em BRANCH, que é o ramo que ele clona no servidor. Se os
# dois não baterem, ele baixa uma versão e roda outra. A versão em main ainda é
# a antiga (aponta para comenta.com.br), então BRANCH é obrigatório até o merge:
#
#   ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
#   curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/bootstrap.sh" \
#     | sudo BRANCH="$ramo" DOMAIN=intsoft.com.br bash
#
# Endereços que o sistema passa a ocupar:
#   DOMAIN            site (Next)            127.0.0.1:3000
#   www.DOMAIN        idem
#   app.DOMAIN        painel (React)         127.0.0.1:8080
#   api.DOMAIN        API (Fastify)          127.0.0.1:4000
#   blog.DOMAIN       Ghost                  127.0.0.1:2368
#
# Variáveis (todas opcionais):
#   DOMAIN       domínio raiz (default: intsoft.com.br)
#   BRANCH       ramo do repositório (default: main, hoje desatualizado)
#   BASE         diretório de instalação (default: /srv/comenta)
#   EMAIL        e-mail do Let's Encrypt. Sem ele, o certbot só roda se o
#                servidor já tiver uma conta registrada.
#   SKIP_SSL=1   pula o certbot (útil antes de o DNS propagar)
#   TAKE_OVER=1  necessário quando outro vhost já responde por algum destes
#                domínios (o do Ghost, por exemplo). Sem isso o script para
#                antes de tocar no Nginx.
#   GHOST_MODE   auto (default) | external | docker | none
#                auto: se já houver algo na porta 2368, usa esse Ghost
#                (external) e não sobe container nenhum de blog.
#   MOVE_GHOST=1 muda a url do Ghost nativo de https://DOMAIN para
#                https://blog.DOMAIN (só roda se blog.DOMAIN já apontar para
#                este servidor; FORCE_GHOST_MOVE=1 dispensa a checagem, útil
#                quando o Cloudflare está com o proxy ligado).
set -euo pipefail

DOMAIN="${DOMAIN:-intsoft.com.br}"
BRANCH="${BRANCH:-main}"
BASE="${BASE:-/srv/comenta}"
EMAIL="${EMAIL:-}"
SKIP_SSL="${SKIP_SSL:-0}"
TAKE_OVER="${TAKE_OVER:-0}"
GHOST_MODE="${GHOST_MODE:-auto}"
MOVE_GHOST="${MOVE_GHOST:-0}"
FORCE_GHOST_MOVE="${FORCE_GHOST_MOVE:-0}"
REPO="https://github.com/hebertpaes/comenta.git"
WEBROOT="/var/www/html"
CONF="/etc/nginx/sites-available/comenta.conf"
ENABLED="/etc/nginx/sites-enabled/comenta.conf"

log(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }
[ "$(id -u)" = "0" ] || die "rode como root (use sudo)."

# Domínios que este deploy passa a servir, na forma "nomes|porta|corpo|ws".
SITES="$DOMAIN www.$DOMAIN|3000|20m|0
app.$DOMAIN|8080|20m|0
api.$DOMAIN|4000|20m|1
blog.$DOMAIN|2368|50m|0"
TODOS_OS_NOMES="$DOMAIN www.$DOMAIN app.$DOMAIN api.$DOMAIN blog.$DOMAIN"

export DEBIAN_FRONTEND=noninteractive
APT_UPDATED=0
APT_OPTS="-o DPkg::Lock::Timeout=600"   # no 1º boot o unattended-upgrades segura o lock
apt_install(){
  # shellcheck disable=SC2086
  if [ "$APT_UPDATED" != "1" ]; then apt-get $APT_OPTS update -y >/dev/null; APT_UPDATED=1; fi
  # shellcheck disable=SC2086
  apt-get $APT_OPTS install -y "$@"
}

log "0/8 Conferindo o DNS de $DOMAIN"
command -v curl >/dev/null 2>&1 || apt_install curl
MEU_IP="$(curl -fsS -m 10 https://api.ipify.org 2>/dev/null || true)"
[ -n "$MEU_IP" ] || MEU_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "  IP deste servidor: ${MEU_IP:-desconhecido}"
RESOLVIDOS=""; PENDENTES=""
for n in $TODOS_OS_NOMES; do
  ips="$(getent ahostsv4 "$n" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')"
  if [ -z "$ips" ]; then
    printf '  %-24s sem registro A\n' "$n"; PENDENTES="$PENDENTES $n"
  elif printf '%s' " $ips " | grep -q " $MEU_IP "; then
    printf '  %-24s %s (aqui)\n' "$n" "${ips% }"; RESOLVIDOS="$RESOLVIDOS $n"
  else
    printf '  %-24s %s (outro servidor/proxy)\n' "$n" "${ips% }"; PENDENTES="$PENDENTES $n"
  fi
done
if [ -n "$PENDENTES" ]; then
  echo "  Faltando apontar para $MEU_IP:$PENDENTES"
  echo "  (o deploy segue; o HTTPS desses nomes fica para quando o DNS propagar)"
fi

log "1/8 Swap (evita OOM em VM pequena)"
if [ "$(swapon --show --noheadings 2>/dev/null | wc -l)" = "0" ]; then
  MEM_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)
  if [ "${MEM_MB:-0}" -lt 4096 ]; then
    if fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null; then
      chmod 600 /swapfile && mkswap /swapfile >/dev/null 2>&1 && swapon /swapfile || true
      grep -q '^/swapfile' /etc/fstab 2>/dev/null || echo '/swapfile none swap sw 0 0' >> /etc/fstab
      echo "  swap de 2G ativado (RAM: ${MEM_MB}MB)."
    else
      echo "  aviso: não consegui criar swapfile (disco cheio?). Seguindo."
    fi
  else
    echo "  RAM suficiente (${MEM_MB}MB)."
  fi
else
  echo "  swap já ativo."
fi

log "2/8 Dependências (Docker, Nginx, Certbot)"
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh
docker compose version >/dev/null 2>&1 || apt_install docker-compose-plugin || true
command -v nginx >/dev/null 2>&1 || apt_install nginx
command -v certbot >/dev/null 2>&1 || apt_install certbot
command -v git >/dev/null 2>&1 || apt_install git
command -v openssl >/dev/null 2>&1 || apt_install openssl
command -v ss >/dev/null 2>&1 || apt_install iproute2

log "3/8 Repositório em $BASE (ramo $BRANCH)"
mkdir -p "$BASE"
REPO_DIR="$BASE/comenta"
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch origin "$BRANCH" --depth 1 -q
  # `checkout $BRANCH` falha num clone --depth 1 de outro ramo: cria/move o
  # ramo local a partir do FETCH_HEAD que acabou de chegar.
  git -C "$REPO_DIR" checkout -q "$BRANCH" 2>/dev/null || git -C "$REPO_DIR" checkout -q -B "$BRANCH" FETCH_HEAD
  git -C "$REPO_DIR" reset --hard -q FETCH_HEAD
else
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$REPO_DIR"
fi
DEPLOY_DIR="$REPO_DIR/deploy"

log "4/8 Segredos ($DEPLOY_DIR/.env)"
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
  gen(){ openssl rand -hex 32; }
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 16)|"             "$DEPLOY_DIR/.env"
  sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$(openssl rand -hex 16)|"       "$DEPLOY_DIR/.env"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(gen)|"                                "$DEPLOY_DIR/.env"
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(gen)|"                "$DEPLOY_DIR/.env"
  sed -i "s|^GHOST_DB_PASSWORD=.*|GHOST_DB_PASSWORD=$(openssl rand -hex 16)|" "$DEPLOY_DIR/.env"
  echo "  .env gerado com segredos aleatórios. Edite para ANTHROPIC_API_KEY e NEXT_PUBLIC_WHATSAPP."
else
  echo "  .env já existe — segredos mantidos."
fi
# DOMAIN e GHOST_URL sempre alinhados com esta execução: é daqui que o compose
# monta APP_URL, API_URL, CORS_ORIGINS e as NEXT_PUBLIC_* do build do site.
for par in "DOMAIN=$DOMAIN" "GHOST_URL=https://blog.$DOMAIN"; do
  chave="${par%%=*}"
  if grep -q "^$chave=" "$DEPLOY_DIR/.env"; then
    sed -i "s|^$chave=.*|$par|" "$DEPLOY_DIR/.env"
  else
    echo "$par" >> "$DEPLOY_DIR/.env"
  fi
done
echo "  DOMAIN=$DOMAIN"

log "5/8 Build do painel (Vite) e containers"
docker run --rm \
  -e VITE_API_URL="https://api.$DOMAIN" \
  -v "$REPO_DIR":/repo -w /repo \
  node:22-alpine sh -c "npm ci --ignore-scripts && npm run build -w @comenta/shared && npm run build -w @comenta/web"

# Ghost: o servidor de produção já tem um, instalado pelo ghost-cli, escutando
# na 2368. Subir o container do compose ali roubaria a porta e deixaria os dois
# quebrados — por isso o profile "ghost" só entra quando é um servidor limpo.
if [ "$GHOST_MODE" = "auto" ]; then
  if ss -ltn 2>/dev/null | grep -qE '[:.]2368[[:space:]]'; then GHOST_MODE="external"; else GHOST_MODE="docker"; fi
fi
PERFIS=""
case "$GHOST_MODE" in
  external) echo "  Ghost: já existe um na porta 2368 — mantido como está (nenhum container de blog)." ;;
  docker)   echo "  Ghost: subindo o container do compose (profile ghost)."; PERFIS="--profile ghost" ;;
  none)     echo "  Ghost: desligado (GHOST_MODE=none)." ;;
  *)        die "GHOST_MODE deve ser auto, external, docker ou none." ;;
esac
# O deploy_site.sh (caminho "só o site", com PM2) usa a mesma porta 3000 que o
# container do site. Os dois no mesmo servidor brigam pela porta — se o PM2
# estiver segurando a 3000, ele sai de cena aqui.
if command -v pm2 >/dev/null 2>&1 && pm2 describe comenta-site >/dev/null 2>&1; then
  echo "  PM2: parando comenta-site (a porta 3000 passa a ser do container)."
  pm2 delete comenta-site >/dev/null 2>&1 || true
  pm2 save >/dev/null 2>&1 || true
fi

cd "$DEPLOY_DIR"
# shellcheck disable=SC2086
docker compose --env-file .env $PERFIS up -d --build
docker compose ps

log "6/8 Nginx ($TODOS_OS_NOMES)"
# Outro vhost já responde por algum destes nomes? O Nginx entrega o domínio ao
# primeiro bloco que casar: sem checar, um dos dois sites sumiria sem aviso.
CONFLITOS=""
for d in $TODOS_OS_NOMES; do
  d_re="$(printf '%s' "$d" | sed 's/\./\\./g')"
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -f "$f" ] || continue
    [ "$f" = "$ENABLED" ] && continue
    [ "$f" = "$CONF" ] && continue
    if grep -qE "^[[:space:]]*server_name[^;]*[[:space:]]$d_re([[:space:]]|;)" "$f" 2>/dev/null; then
      case " $CONFLITOS " in *" $f "*) ;; *) CONFLITOS="$CONFLITOS $f";; esac
    fi
  done
done
if [ -n "$CONFLITOS" ] && [ "$TAKE_OVER" != "1" ]; then
  echo "  Estes vhosts já respondem por algum dos domínios:"
  for f in $CONFLITOS; do echo "    - $f ($(readlink -f "$f"))"; done
  echo "  Nada foi alterado no Nginx; os containers já estão no ar em 127.0.0.1."
  die "conflito de server_name (rode com TAKE_OVER=1 para o sistema assumir os domínios)."
fi
for f in $CONFLITOS; do
  if [ -L "$f" ]; then
    echo "  TAKE_OVER=1: desabilitando $f (arquivo mantido em $(readlink -f "$f"))"
    rm -f "$f"
  else
    echo "  TAKE_OVER=1: desabilitando $f (renomeado para $f.disabled)"
    mv -f "$f" "$f.disabled"
  fi
done

# Certificado que já cobre um nome (certbot em live/, ou acme.sh do ghost-cli).
cert_tem_dominio(){
  openssl x509 -in "$1" -noout -ext subjectAltName 2>/dev/null \
    | grep -qE "DNS:$(printf '%s' "$2" | sed 's/\./\\./g')(,|$| )"
}
CERT_FULLCHAIN=""; CERT_KEY=""
find_cert(){   # $1 = nome procurado; preenche CERT_FULLCHAIN / CERT_KEY
  CERT_FULLCHAIN=""; CERT_KEY=""
  local d nome
  for d in /etc/letsencrypt/live/*/; do
    d="${d%/}"
    [ -f "$d/fullchain.pem" ] && [ -f "$d/privkey.pem" ] || continue
    if cert_tem_dominio "$d/fullchain.pem" "$1"; then
      CERT_FULLCHAIN="$d/fullchain.pem"; CERT_KEY="$d/privkey.pem"; return 0
    fi
  done
  for d in /etc/letsencrypt/*/; do
    d="${d%/}"; nome="$(basename "$d")"
    [ -f "$d/fullchain.cer" ] && [ -f "$d/$nome.key" ] || continue
    if cert_tem_dominio "$d/fullchain.cer" "$1"; then
      CERT_FULLCHAIN="$d/fullchain.cer"; CERT_KEY="$d/$nome.key"; return 0
    fi
  done
  return 0
}

HTTP2_LINE=""
NGX_VER="$(nginx -v 2>&1 | sed -n 's|.*nginx/\([0-9.]*\).*|\1|p' || true)"
# `http2 on;` só existe a partir do 1.25.1; o Ubuntu 24.04 traz o 1.24, que
# reprova a diretiva e derruba a configuração inteira.
if [ -n "$NGX_VER" ] && [ "$(printf '%s\n1.25.1\n' "$NGX_VER" | sort -V | head -n1)" = "1.25.1" ]; then
  HTTP2_LINE="    http2 on;"
fi

bloco(){   # $1=nomes  $2=porta  $3=client_max_body_size  $4=1 se websocket
  local nomes="$1" porta="$2" corpo="$3" ws="$4" extra=""
  [ "$ws" = "1" ] && extra='
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;'
  find_cert "${nomes%% *}"
  cat <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $nomes;
    server_tokens off;
    client_max_body_size $corpo;

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
$HTTP2_LINE
    server_name $nomes;
    server_tokens off;
    client_max_body_size $corpo;

    ssl_certificate $CERT_FULLCHAIN;
    ssl_certificate_key $CERT_KEY;
NGX
    [ -f /etc/letsencrypt/options-ssl-nginx.conf ] && echo "    include /etc/letsencrypt/options-ssl-nginx.conf;"
    [ -f /etc/letsencrypt/ssl-dhparams.pem ] && echo "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
  fi
  cat <<NGX

    gzip on;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:$porta;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;$extra
    }
}
NGX
}

# Reescreve o arquivo inteiro a cada execução — inclusive o bloco 443, quando
# já existe certificado. É isso que impede o HTTPS de cair entre a gravação do
# vhost e o certbot. `nginx -t && reload` NÃO aborta com set -e (o erro fica no
# meio de uma lista &&), por isso o teste é explícito e volta atrás se falhar.
escreve_nginx(){
  local backup=""
  mkdir -p "$WEBROOT/.well-known/acme-challenge"
  [ -f "$CONF" ] && { backup="$(mktemp)"; cp -a "$CONF" "$backup"; }
  {
    echo "# Gerado por deploy/bootstrap.sh — não edite à mão (é reescrito a cada deploy)."
    printf '%s\n' "$SITES" | while IFS='|' read -r nomes porta corpo ws; do
      [ -n "$nomes" ] && bloco "$nomes" "$porta" "$corpo" "$ws"
    done
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
escreve_nginx
echo "  vhost gravado em $CONF"

# Imagens Ubuntu da Oracle rejeitam tudo menos a 22 no iptables local.
if command -v iptables >/dev/null 2>&1 && iptables -C INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; then
  for porta in 80 443; do
    if ! iptables -C INPUT -p tcp -m state --state NEW -m tcp --dport "$porta" -j ACCEPT 2>/dev/null; then
      POS="$(iptables -L INPUT --line-numbers -n 2>/dev/null | awk '$2=="REJECT"||$2=="DROP"{print $1; exit}' || true)"
      iptables -I INPUT "${POS:-1}" -p tcp -m state --state NEW -m tcp --dport "$porta" -j ACCEPT
    fi
  done
  netfilter-persistent save >/dev/null 2>&1 || true
  echo "  iptables: 80 e 443 liberadas."
fi

log "7/8 HTTPS (Let's Encrypt)"
HAS_LE_ACCOUNT=0
if [ -d /etc/letsencrypt/accounts ] && find /etc/letsencrypt/accounts -name regr.json 2>/dev/null | grep -q .; then
  HAS_LE_ACCOUNT=1
fi
if [ "$SKIP_SSL" = "1" ]; then
  echo "  SKIP_SSL=1 — certbot pulado."
elif [ -z "$EMAIL" ] && [ "$HAS_LE_ACCOUNT" != "1" ]; then
  echo "  EMAIL não definido e sem conta Let's Encrypt — SSL pulado."
elif [ -z "$RESOLVIDOS" ]; then
  echo "  Nenhum domínio aponta para este servidor ainda — SSL pulado."
else
  EMAIL_ARGS=""; [ -n "$EMAIL" ] && EMAIL_ARGS="-m $EMAIL"
  # Um certificado por nome: assim um registro de DNS que ainda não propagou
  # não impede a emissão dos outros (era o que o -d de 5 nomes fazia).
  # --webroot: o certbot não edita o Nginx, que este script reescreve inteiro.
  for d in $RESOLVIDOS; do
    # shellcheck disable=SC2086
    certbot certonly --webroot -w "$WEBROOT" --cert-name "$d" \
      --non-interactive --agree-tos --expand --keep-until-expiring $EMAIL_ARGS -d "$d" \
      && echo "  certificado ok: $d" \
      || echo "  certbot falhou em $d — siga sem HTTPS nesse nome e rode de novo depois."
  done
  escreve_nginx   # regrava os vhosts já com os blocos 443 dos certificados novos
fi

log "8/8 Ghost"
if [ "$GHOST_MODE" = "external" ]; then
  GHOST_DIR="$(find /var/www -maxdepth 3 -name config.production.json -printf '%h\n' 2>/dev/null | head -n1 || true)"
  URL_ATUAL=""
  if [ -n "$GHOST_DIR" ]; then
    URL_ATUAL="$(grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' "$GHOST_DIR/config.production.json" 2>/dev/null \
      | head -n1 | sed 's|.*"\(https\{0,1\}://[^"]*\)".*|\1|' || true)"
    URL_ATUAL="${URL_ATUAL%/}"   # sem a barra final, para o case abaixo casar
  fi
  echo "  instalação: ${GHOST_DIR:-não encontrada} | url atual: ${URL_ATUAL:-?}"
  case "$URL_ATUAL" in
    *"//$DOMAIN"|*"//www.$DOMAIN")
      # O Ghost ainda acha que mora no domínio raiz, que agora é do site: sem
      # mudar a url dele, o blog redireciona o visitante para o site novo.
      BLOG_AQUI=0
      case " $RESOLVIDOS " in *" blog.$DOMAIN "*) BLOG_AQUI=1;; esac
      if [ "$MOVE_GHOST" != "1" ]; then
        echo "  AVISO: o Ghost ainda está configurado em $URL_ATUAL, que agora é do site."
        echo "  Para movê-lo: rode de novo com MOVE_GHOST=1 (depois de criar o A de blog.$DOMAIN)."
      elif [ "$BLOG_AQUI" != "1" ] && [ "$FORCE_GHOST_MOVE" != "1" ]; then
        die "MOVE_GHOST=1 pedido, mas blog.$DOMAIN ainda não aponta para $MEU_IP — mover agora deixaria o blog sem endereço nenhum. Crie o registro A (ou use FORCE_GHOST_MOVE=1 se o Cloudflare está proxiando)."
      elif [ -n "$GHOST_DIR" ]; then
        DONO="$(stat -c '%U' "$GHOST_DIR" 2>/dev/null || echo ghost)"
        ( cd "$GHOST_DIR" \
          && sudo -u "$DONO" ghost config url "https://blog.$DOMAIN" \
          && sudo -u "$DONO" ghost restart ) \
          && echo "  Ghost movido para https://blog.$DOMAIN" \
          || echo "  não consegui rodar o ghost-cli em $GHOST_DIR — mude a url na mão."
      fi
      ;;
    *) echo "  url do Ghost não é o domínio raiz — nada a mudar." ;;
  esac
fi

log "Concluído"
cat <<FIM
  Site ..... https://$DOMAIN
  Painel ... https://app.$DOMAIN
  API ...... https://api.$DOMAIN    (OpenAPI em /docs)
  Blog ..... https://blog.$DOMAIN   (Ghost, modo $GHOST_MODE)

  Status ... cd $DEPLOY_DIR && docker compose ps
  Logs ..... cd $DEPLOY_DIR && docker compose logs -f api
  Repetir .. sudo BRANCH=$BRANCH DOMAIN=$DOMAIN TAKE_OVER=$TAKE_OVER bash $DEPLOY_DIR/bootstrap.sh
FIM
