#!/usr/bin/env bash
# =============================================================================
#  ghost_migrar_de_outro_servidor.sh — clona um Ghost que está em OUTRO servidor
#  (a VM hmt da Azure, por exemplo) para o Ghost DESTA máquina: banco inteiro
#  (mysqldump) + content/ (imagens, arquivos, mídia, temas, settings).
#
#  Roda NA VM NOVA, como root, num terminal interativo (o ssh vai pedir a senha
#  da origem uma vez — por isso não funciona por `curl | bash`, que rouba o
#  stdin). O repositório já está clonado pelo cloud-init:
#
#    sudo ORIGEM=hmt@20.55.8.18 bash /srv/comenta/comenta/deploy/ghost_migrar_de_outro_servidor.sh
#
#  Variáveis:
#    ORIGEM            (obrigatório) usuario@host do servidor antigo. O usuário
#                      precisa de sudo sem senha lá (o padrão das VMs da Azure).
#    ORIGEM_PORTA      porta SSH (default 22)
#    ORIGEM_SSH_OPTS   ex.: "-i /root/.ssh/chave" (default: nada — senha)
#    ORIGEM_GHOST_DIR  pasta do Ghost na origem (default: procura em /var/www)
#    GHOST_DIR         Ghost local (default /var/www/ghost)
#    GHOST_USER        dono do Ghost local (default ubuntu)
#
#  O que acontece, nesta ordem — e para antes de tocar em qualquer coisa se a
#  versão da origem for MAIS NOVA que a local (o Ghost migra o banco para
#  frente no boot, nunca para trás):
#    1. abre UMA conexão SSH (ControlMaster) e reaproveita nas demais
#    2. lê o config.production.json da origem: pasta, versão, credenciais do MySQL
#    3. mysqldump da origem → /var/backups/ghost-origem-<ts>.sql
#    4. tar de content/{images,files,media,themes,settings} da origem → local
#    5. para o Ghost local, guarda o banco atual em /var/backups/ghost-antes-<ts>.sql,
#       recria ghost_prod com o dump da origem, sobe o Ghost (migrações rodam sozinhas)
#    6. confere título e nº de posts
#  A url (https://hojemt.com.br) continua a do config local: o Ghost guarda os
#  links no banco como __GHOST_URL__, então nada precisa ser reescrito.
# =============================================================================
set -euo pipefail

ORIGEM="${ORIGEM:-}"
ORIGEM_PORTA="${ORIGEM_PORTA:-22}"
ORIGEM_SSH_OPTS="${ORIGEM_SSH_OPTS:-}"
ORIGEM_GHOST_DIR="${ORIGEM_GHOST_DIR:-}"
GHOST_DIR="${GHOST_DIR:-/var/www/ghost}"
GHOST_USER="${GHOST_USER:-ubuntu}"
TS="$(date +%Y%m%d%H%M%S)"
BACKUPS=/var/backups

log(){ printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die(){ printf '\n\033[1;31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" = "0" ] || die "rode como root (sudo)."
[ -n "$ORIGEM" ] || die "ORIGEM é obrigatório (ex.: ORIGEM=hmt@20.55.8.18)."
[ -t 0 ] || die "preciso de um terminal (o ssh vai pedir a senha da origem). Rode o arquivo direto, não por curl | bash."
[ -f "$GHOST_DIR/config.production.json" ] || die "não há Ghost em $GHOST_DIR (rode o cloud-init/instalação antes)."
for c in ssh tar mysql mysqldump python3; do command -v "$c" >/dev/null 2>&1 || die "falta o comando $c."; done

# Uma conexão só: a senha é pedida uma vez e as chamadas seguintes reaproveitam.
CTL="/run/ghost-migra-$$"
# shellcheck disable=SC2086
SSH=(ssh -p "$ORIGEM_PORTA" $ORIGEM_SSH_OPTS -o ControlMaster=auto -o ControlPath="$CTL" -o ControlPersist=15m -o ServerAliveInterval=30 "$ORIGEM")
limpa(){ ssh -o ControlPath="$CTL" -O exit "$ORIGEM" >/dev/null 2>&1 || true; rm -f "$CTL"; }
trap limpa EXIT

log "1/6 Conectando em $ORIGEM"
"${SSH[@]}" 'sudo -n true' 2>/dev/null || die "não consegui entrar em $ORIGEM com sudo sem senha. Confira usuário, senha/chave e o sudo de lá."
echo "  ok: $("${SSH[@]}" 'hostname; uname -m' | tr '\n' ' ')"

log "2/6 Lendo o Ghost da origem"
if [ -z "$ORIGEM_GHOST_DIR" ]; then
  ORIGEM_GHOST_DIR="$("${SSH[@]}" 'sudo find /var/www -maxdepth 3 -name config.production.json -printf "%h\n" 2>/dev/null | head -n1' || true)"
fi
[ -n "$ORIGEM_GHOST_DIR" ] || die "não achei config.production.json em /var/www na origem — passe ORIGEM_GHOST_DIR."
CFG_ORIGEM="$(mktemp)"; trap 'rm -f "$CFG_ORIGEM"; limpa' EXIT
"${SSH[@]}" "sudo cat '$ORIGEM_GHOST_DIR/config.production.json'" > "$CFG_ORIGEM"
VER_ORIGEM="$("${SSH[@]}" "sudo python3 -c 'import json;print(json.load(open(\"$ORIGEM_GHOST_DIR/current/package.json\"))[\"version\"])'" 2>/dev/null || echo "?")"
VER_LOCAL="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$GHOST_DIR/current/package.json" 2>/dev/null || echo "?")"
# credenciais do MySQL da origem, um valor por linha (campo vazio não desloca os outros)
eval "$(python3 - "$CFG_ORIGEM" <<'PY'
import json, shlex, sys
c = json.load(open(sys.argv[1]))
db = c.get("database", {}); cn = db.get("connection", {}) if isinstance(db.get("connection"), dict) else {}
print("O_CLIENT=" + shlex.quote(str(db.get("client", ""))))
for k, v in (("O_HOST", cn.get("host", "localhost")), ("O_PORT", cn.get("port", 3306)), ("O_USER", cn.get("user", "")),
             ("O_PASS", cn.get("password", "")), ("O_DB", cn.get("database", "")), ("O_URL", c.get("url", ""))):
    print(k + "=" + shlex.quote(str(v)))
PY
)"
echo "  pasta: $ORIGEM_GHOST_DIR | url: $O_URL | Ghost $VER_ORIGEM (local: $VER_LOCAL)"
echo "  banco: $O_CLIENT $O_DB em $O_HOST:$O_PORT como $O_USER"
case "$O_CLIENT" in mysql|mysql2) ;; *) die "a origem usa '$O_CLIENT', não MySQL — este script só migra MySQL→MySQL." ;; esac
[ -n "$O_DB" ] && [ -n "$O_USER" ] || die "config da origem sem usuário/banco."
if [ "$VER_ORIGEM" != "?" ] && [ "$VER_LOCAL" != "?" ] \
   && [ "$(printf '%s\n%s\n' "$VER_ORIGEM" "$VER_LOCAL" | sort -V | tail -n1)" != "$VER_LOCAL" ]; then
  die "a origem está no Ghost $VER_ORIGEM, mais novo que o local $VER_LOCAL — atualize o local (ghost update) antes de migrar. Nada foi alterado."
fi

log "3/6 Dump do banco da origem"
mkdir -p "$BACKUPS"
DUMP="$BACKUPS/ghost-origem-$TS.sql"
install -m 600 /dev/null "$DUMP"
# A senha vai por MYSQL_PWD dentro da sessão remota, não na linha de comando do mysqldump.
"${SSH[@]}" "sudo MYSQL_PWD=$(printf '%q' "$O_PASS") mysqldump --single-transaction --quick --no-tablespaces \
  -h $(printf '%q' "$O_HOST") -P $(printf '%q' "$O_PORT") -u $(printf '%q' "$O_USER") $(printf '%q' "$O_DB")" > "$DUMP" \
  || die "mysqldump na origem falhou (veja acima)."
grep -q 'CREATE TABLE `posts`' "$DUMP" || die "o dump não tem a tabela posts — não parece um banco do Ghost. Guardei em $DUMP."
echo "  $DUMP ($(du -h "$DUMP" | cut -f1)), $(grep -c '^INSERT INTO' "$DUMP") blocos de INSERT"

log "4/6 content/ da origem (imagens, arquivos, mídia, temas, settings)"
CONTENT_TMP="$GHOST_DIR/content.origem-$TS"
mkdir -p "$CONTENT_TMP"
# tar pelo ssh: não depende de rsync instalado em nenhum dos lados.
"${SSH[@]}" "cd '$ORIGEM_GHOST_DIR/content' && sudo tar -cf - \$(for d in images files media themes settings; do [ -d \$d ] && printf '%s ' \$d; done)" \
  | tar -C "$CONTENT_TMP" -xf - || die "falhou copiar o content/ da origem."
echo "  $(du -sh "$CONTENT_TMP" | cut -f1) em $CONTENT_TMP: $(ls "$CONTENT_TMP" | tr '\n' ' ')"

log "5/6 Trocando o banco e o content/ locais"
sudo -u "$GHOST_USER" -H ghost stop --dir "$GHOST_DIR" >/dev/null 2>&1 || true
eval "$(python3 - "$GHOST_DIR/config.production.json" <<'PY'
import json, shlex, sys
cn = json.load(open(sys.argv[1]))["database"]["connection"]
for k, v in (("L_USER", cn.get("user", "")), ("L_PASS", cn.get("password", "")), ("L_DB", cn.get("database", ""))):
    print(k + "=" + shlex.quote(str(v)))
PY
)"
ANTES="$BACKUPS/ghost-antes-$TS.sql"
install -m 600 /dev/null "$ANTES"
mysqldump --single-transaction --quick --no-tablespaces "$L_DB" > "$ANTES" 2>/dev/null || echo "  (banco local vazio/novo: sem backup a fazer)"
echo "  banco local anterior em $ANTES"
mysql -e "DROP DATABASE IF EXISTS \`$L_DB\`; CREATE DATABASE \`$L_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci; GRANT ALL PRIVILEGES ON \`$L_DB\`.* TO '$L_USER'@'localhost'; FLUSH PRIVILEGES;"
mysql "$L_DB" < "$DUMP"
echo "  dump importado."
DONO="$(stat -c '%U:%G' "$GHOST_DIR/content")"
for d in images files media themes settings; do
  [ -d "$CONTENT_TMP/$d" ] || continue
  if [ -d "$GHOST_DIR/content/$d" ] && [ -n "$(ls -A "$GHOST_DIR/content/$d" 2>/dev/null)" ]; then
    mv "$GHOST_DIR/content/$d" "$GHOST_DIR/content/$d.antes-$TS"
  else
    rm -rf "$GHOST_DIR/content/$d"
  fi
  mv "$CONTENT_TMP/$d" "$GHOST_DIR/content/$d"
done
rmdir "$CONTENT_TMP" 2>/dev/null || true
chown -R "$DONO" "$GHOST_DIR/content"
echo "  content/ trocado (o anterior ficou em content/*.antes-$TS; dono $DONO)."
# O boot roda as migrações pendentes se a origem era mais antiga.
sudo -u "$GHOST_USER" -H ghost start --dir "$GHOST_DIR"

log "6/6 Conferindo"
for _ in $(seq 1 20); do
  curl -fsS -m 5 http://127.0.0.1:2368/ghost/api/admin/site/ >/dev/null 2>&1 && break; sleep 3
done
curl -fsS -m 5 http://127.0.0.1:2368/ghost/api/admin/site/ 2>/dev/null \
  | python3 -c 'import sys,json;s=json.load(sys.stdin)["site"];print(f"  {s[\"title\"]} — {s[\"url\"]} — Ghost {s[\"version\"]}")' \
  || echo "  o Ghost ainda não respondeu — veja: sudo -u $GHOST_USER ghost log --dir $GHOST_DIR"
echo "  posts publicados: $(mysql -N "$L_DB" -e "SELECT COUNT(*) FROM posts WHERE type='post' AND status='published'")"
echo "  usuários (as senhas vieram junto — entre com a conta da origem): $(mysql -N "$L_DB" -e "SELECT GROUP_CONCAT(email SEPARATOR ', ') FROM users")"
echo
echo "Pronto. Se algo saiu errado, o caminho de volta é:"
echo "  mysql $L_DB < $ANTES   e   mv content/*.antes-$TS de volta, depois ghost restart."
