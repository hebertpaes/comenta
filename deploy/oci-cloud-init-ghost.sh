#!/usr/bin/env bash
# =============================================================================
#  oci-cloud-init-ghost.sh — primeiro boot de uma VM Ubuntu 24.04 na Oracle:
#  instala o Ghost (MySQL + Nginx + systemd, via ghost-cli, igual ao servidor
#  de intsoft.com.br) para DOMAIN, com o tema hojemt deste repositório, título
#  e descrição do portal, e HTTPS automático assim que o DNS apontar para cá.
#
#  É o que deploy/oci-new-instance.sh manda no user_data com STACK=ghost. Numa
#  VM que já existe, como root:
#
#    ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
#    curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/oci-cloud-init-ghost.sh" \
#      | sudo BRANCH="$ramo" DOMAIN=hojemt.com.br EMAIL=voce@exemplo.com bash
#
#  Variáveis:
#    DOMAIN      (obrigatório) ex.: hojemt.com.br — o Ghost nasce em http://DOMAIN
#                e passa para https sozinho quando o DNS resolver para esta VM
#    EMAIL       e-mail do Let's Encrypt. Sem ele o certificado não é emitido
#                (edite /etc/ghost-ssl.env depois; o cron continua tentando)
#    BRANCH      ramo do repositório de onde vem o tema (default: main)
#    SITE_TITLE  título (default: Hoje MT)
#    SITE_DESC   descrição (default: a do portal)
#    TIMEZONE    fuso do Ghost (default: America/Cuiaba)
#    GHOST_DIR   default /var/www/ghost
#    BASE        onde o repositório é clonado (default /srv/comenta — o mesmo
#                que deploy/ghost_restaurar_hojemt.sh usa depois)
#
#  Log em /var/log/ghost-install.log. No fim, /root/LEIA-ghost.txt lista o que
#  ainda é manual: DNS, conta do dono e importação dos 317 posts.
# =============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
BRANCH="${BRANCH:-main}"
SITE_TITLE="${SITE_TITLE:-Hoje MT}"
SITE_DESC="${SITE_DESC:-Portal de notícias de Mato Grosso: política, economia, agronegócio, cidades, esportes e grandes reportagens em tempo real.}"
TIMEZONE="${TIMEZONE:-America/Cuiaba}"
GHOST_DIR="${GHOST_DIR:-/var/www/ghost}"
BASE="${BASE:-/srv/comenta}"
REPO="https://github.com/hebertpaes/comenta.git"
LOG="${LOG:-/var/log/ghost-install.log}"
# O ghost-cli recusa rodar como root; o ubuntu da imagem da Oracle tem sudo sem senha.
GHOST_USER="${GHOST_USER:-ubuntu}"

exec > >(tee -a "$LOG") 2>&1
log(){ printf '\n[%s] ==> %s\n' "$(date +%T)" "$*"; }
die(){ printf '\n[%s] ERRO: %s\n' "$(date +%T)" "$*" >&2; exit 1; }
# Com set -e um passo que falha encerra o script; sem isto o log terminaria
# no meio, sem dizer que parou nem onde.
trap 'printf "\n[%s] ERRO na linha %s — instalação interrompida; veja %s\n" "$(date +%T)" "$LINENO" "$LOG" >&2' ERR

[ "$(id -u)" = "0" ] || die "rode como root."
[ -n "$DOMAIN" ] || die "DOMAIN é obrigatório (ex.: DOMAIN=hojemt.com.br)."
case "$DOMAIN" in *[!a-zA-Z0-9.-]*|*"'"*) die "DOMAIN inválido: $DOMAIN" ;; esac
id "$GHOST_USER" >/dev/null 2>&1 || die "usuário $GHOST_USER não existe (a imagem não é Ubuntu?)."
echo "DOMAIN=$DOMAIN | BRANCH=$BRANCH | EMAIL=${EMAIL:-(vazio)} | $(date)"

export DEBIAN_FRONTEND=noninteractive
# No 1º boot o unattended-upgrades segura o lock do apt por alguns minutos.
APT="apt-get -o DPkg::Lock::Timeout=600 -y -q"

log "1/8 Firewall local (a imagem da Oracle rejeita tudo menos a 22)"
if iptables -S INPUT 2>/dev/null | grep -qE -- '-j (REJECT|DROP)'; then
  for porta in 80 443; do
    if ! iptables -C INPUT -p tcp -m state --state NEW -m tcp --dport "$porta" -j ACCEPT 2>/dev/null; then
      POS="$(iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"||$2=="DROP"{print $1; exit}' || true)"
      iptables -I INPUT "${POS:-1}" -p tcp -m state --state NEW -m tcp --dport "$porta" -j ACCEPT
    fi
  done
  $APT update
  $APT install iptables-persistent
  netfilter-persistent save
  echo "  80 e 443 liberadas."
else
  echo "  sem regra de REJECT — nada a liberar."
fi

log "2/8 Swap (só se a VM for pequena)"
MEM_MB="$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)"
if [ "$(swapon --show --noheadings | wc -l)" = "0" ] && [ "$MEM_MB" -lt 4096 ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  swap de 2G ativado (RAM: ${MEM_MB}MB)."
else
  echo "  RAM ${MEM_MB}MB — sem swap extra."
fi

log "3/8 Pacotes: Nginx, MySQL, Node 22, ghost-cli"
$APT update
$APT install nginx mysql-server curl git zip unzip dnsutils ca-certificates python3
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//; s/\..*//')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  $APT install nodejs
fi
npm install -g ghost-cli@latest --no-audit --no-fund
echo "  node $(node -v) | ghost-cli $(ghost --version 2>/dev/null | head -n1 || echo '?') | $(nginx -v 2>&1) | $(mysql --version | cut -d' ' -f1-3)"

log "4/8 Banco ghost_prod no MySQL"
systemctl enable --now mysql
DBPASS="$(openssl rand -hex 16)"
# O root do MySQL do Ubuntu autentica pelo socket: sem senha, como root do sistema.
mysql <<SQL
CREATE DATABASE IF NOT EXISTS ghost_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'ghost'@'localhost' IDENTIFIED BY '$DBPASS';
ALTER USER 'ghost'@'localhost' IDENTIFIED BY '$DBPASS';
GRANT ALL PRIVILEGES ON ghost_prod.* TO 'ghost'@'localhost';
FLUSH PRIVILEGES;
SQL
install -m 600 /dev/null /root/ghost-db.txt
printf 'banco ghost_prod | usuario ghost | senha %s\n' "$DBPASS" > /root/ghost-db.txt
echo "  credenciais em /root/ghost-db.txt (também ficam em $GHOST_DIR/config.production.json)."

log "5/8 Ghost em $GHOST_DIR (ghost-cli, como $GHOST_USER)"
mkdir -p "$GHOST_DIR"
chown "$GHOST_USER:$GHOST_USER" "$GHOST_DIR"
chmod 775 "$GHOST_DIR"
# --no-setup-mysql: o banco já existe acima. --no-setup-ssl: o certificado vem
# no passo 8, quando o DNS apontar para cá (agora ainda não aponta).
sudo -u "$GHOST_USER" -H env DBPASS="$DBPASS" bash -c '
  cd "$1" && ghost install \
    --url "http://$2" --db mysql --dbhost localhost --dbuser ghost --dbpass "$DBPASS" --dbname ghost_prod \
    --process systemd --no-setup-ssl --no-setup-mysql --no-prompt --no-check-mem --start --dir "$1"
' _ "$GHOST_DIR" "$DOMAIN"
# Sem o vhost default o Ghost responde também pelo IP (útil antes do DNS).
rm -f /etc/nginx/sites-enabled/default
# www → domínio raiz (o ghost-cli só configura o nome principal).
cat > "/etc/nginx/sites-available/www.$DOMAIN.conf" <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name www.$DOMAIN;
    return 301 http://$DOMAIN\$request_uri;
}
NGX
ln -sfn "/etc/nginx/sites-available/www.$DOMAIN.conf" "/etc/nginx/sites-enabled/www.$DOMAIN.conf"
nginx -t && systemctl reload nginx

log "6/8 Tema hojemt (repositório, ramo $BRANCH)"
mkdir -p "$BASE"
if [ -d "$BASE/comenta/.git" ]; then
  git -C "$BASE/comenta" fetch origin "$BRANCH" --depth 1 -q
  git -C "$BASE/comenta" checkout -q -B "$BRANCH" FETCH_HEAD
else
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$BASE/comenta"
fi
TEMA_SRC="$BASE/comenta/ghost/content/themes/hojemt"
[ -f "$TEMA_SRC/package.json" ] || die "tema não encontrado em $TEMA_SRC (ramo $BRANCH)."
TEMA_DST="$GHOST_DIR/content/themes/hojemt"
rm -rf "$TEMA_DST"
cp -a "$TEMA_SRC" "$TEMA_DST"
# O ghost-cli entrega content/ ao usuário de sistema "ghost"; o tema segue o dono da pasta.
DONO="$(stat -c '%U:%G' "$GHOST_DIR/content/themes")"
chown -R "$DONO" "$TEMA_DST"
echo "  tema em $TEMA_DST (dono $DONO), commit $(git -C "$BASE/comenta" rev-parse --short HEAD)"

log "7/8 Título, descrição, idioma, fuso e tema ativo"
# Antes de existir a conta do dono não há Admin API; as configurações entram
# direto na tabela settings e o restart recarrega o cache do Ghost.
esc(){ printf '%s' "$1" | sed "s/'/''/g"; }
mysql ghost_prod <<SQL
UPDATE settings SET value='hojemt'                 WHERE \`key\`='active_theme';
UPDATE settings SET value='$(esc "$SITE_TITLE")'   WHERE \`key\`='title';
UPDATE settings SET value='$(esc "$SITE_DESC")'    WHERE \`key\`='description';
UPDATE settings SET value='pt-br'                  WHERE \`key\`='locale';
UPDATE settings SET value='$(esc "$TIMEZONE")'     WHERE \`key\`='timezone';
UPDATE settings SET value='#00a859'                WHERE \`key\`='accent_color';
SQL
sudo -u "$GHOST_USER" -H ghost restart --dir "$GHOST_DIR"
echo "  $(mysql -N ghost_prod -e "SELECT CONCAT(\`key\`,'=',value) FROM settings WHERE \`key\` IN ('title','active_theme','locale','timezone') ORDER BY \`key\`" | tr '\n' ' ')"

log "8/8 HTTPS automático quando o DNS de $DOMAIN apontar para cá"
install -m 600 /dev/null /etc/ghost-ssl.env
printf 'DOMAIN=%s\nEMAIL=%s\nGHOST_DIR=%s\nGHOST_USER=%s\n' "$DOMAIN" "$EMAIL" "$GHOST_DIR" "$GHOST_USER" > /etc/ghost-ssl.env
cat > /usr/local/sbin/ghost-ssl-quando-dns.sh <<'SSL'
#!/usr/bin/env bash
# Cron de 5 em 5 min até conseguir: quando DOMAIN resolver para o IP público
# desta VM, emite o certificado (ghost setup ssl = acme.sh, em
# /etc/letsencrypt/DOMAIN/), troca a url para https, reinicia e se desliga.
# Com o proxy do Cloudflare ligado o DNS devolve o IP do Cloudflare e nunca
# casa — deixe a nuvem cinza até o certificado sair.
set -uo pipefail
. /etc/ghost-ssl.env
exec >> /var/log/ghost-install.log 2>&1
exec 9>/run/ghost-ssl.lock
flock -n 9 || exit 0
IP="$(curl -s -m 5 -H 'Authorization: Bearer Oracle' http://169.254.169.254/opc/v2/vnics/ \
      | python3 -c 'import sys,json; print(json.load(sys.stdin)[0].get("publicIp",""))' 2>/dev/null || true)"
[ -n "$IP" ] || IP="$(curl -fsS -m 10 https://api.ipify.org 2>/dev/null || true)"
DNS="$(dig +short A "$DOMAIN" @1.1.1.1 2>/dev/null | tail -n1)"
[ -n "$IP" ] && [ "$DNS" = "$IP" ] || exit 0   # ainda não aponta para cá: silêncio
if [ -z "$EMAIL" ]; then
  echo "[ssl $(date +%T)] $DOMAIN já aponta para $IP, mas EMAIL está vazio em /etc/ghost-ssl.env — sem ele não emito o certificado."
  exit 0
fi
echo "[ssl $(date +%T)] $DOMAIN → $IP: emitindo certificado"
if sudo -u "$GHOST_USER" -H bash -c "cd '$GHOST_DIR' && ghost setup ssl --sslemail '$EMAIL' --no-prompt && ghost config url 'https://$DOMAIN' && ghost restart"; then
  sed -i "s|return 301 http://$DOMAIN|return 301 https://$DOMAIN|" "/etc/nginx/sites-available/www.$DOMAIN.conf" 2>/dev/null || true
  nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
  rm -f /etc/cron.d/ghost-ssl
  echo "[ssl $(date +%T)] pronto: https://$DOMAIN"
else
  echo "[ssl $(date +%T)] falhou; tento de novo em 5 min."
fi
SSL
chmod 700 /usr/local/sbin/ghost-ssl-quando-dns.sh
echo "*/5 * * * * root /usr/local/sbin/ghost-ssl-quando-dns.sh" > /etc/cron.d/ghost-ssl
chmod 644 /etc/cron.d/ghost-ssl
echo "  cron armado (/etc/cron.d/ghost-ssl). EMAIL=${EMAIL:-VAZIO — edite /etc/ghost-ssl.env}"

IP_PUB="$(curl -s -m 5 -H 'Authorization: Bearer Oracle' http://169.254.169.254/opc/v2/vnics/ \
          | python3 -c 'import sys,json; print(json.load(sys.stdin)[0].get("publicIp",""))' 2>/dev/null || true)"
cat > /root/LEIA-ghost.txt <<TXT
Ghost instalado para $DOMAIN em $GHOST_DIR — $(date)
IP público desta VM: ${IP_PUB:-(veja no console)}
Log: $LOG | MySQL: /root/ghost-db.txt

Falta, nesta ordem:
1. DNS (Cloudflare, zona $DOMAIN): registro A "@" e "www" → ${IP_PUB:-<IP desta VM>},
   nuvem CINZA (DNS only). O certificado sai sozinho em até 5 min depois que
   propagar (acompanhe: tail -f $LOG). Só depois disso ligue o proxy laranja,
   com SSL/TLS em "Full (strict)".
2. Conta do dono: https://$DOMAIN/ghost/ (antes do DNS o painel não carrega
   pelo IP, porque ele busca os assets pela url configurada).
3. Os 317 posts e as 13 tags do repositório: no painel, Settings → Integrations
   → Add custom integration → copie a Admin API key e rode aqui:
     sudo BRANCH=$BRANCH BASE=$BASE GHOST_ADMIN_API_KEY='<id>:<secret>' \\
          IMPORTAR_CONTEUDO=1 bash $BASE/comenta/deploy/ghost_restaurar_hojemt.sh
   (300 dos 317 posts usam as imagens de placeholder do tema; as fotos do
   acervo não estão no repositório.)
TXT
log "Concluído — leia /root/LEIA-ghost.txt"
cat /root/LEIA-ghost.txt
