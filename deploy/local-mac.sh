#!/usr/bin/env bash
# =============================================================
# local-mac.sh — sobe TODO o Comenta no seu Mac (ou Linux/PC)
# com Docker Desktop. Só localhost, sem domínio nem SSL.
# =============================================================
# Requisito único: Docker Desktop instalado e ABERTO.
#   https://www.docker.com/products/docker-desktop/
#
# Uso:
#   cd deploy
#   bash local-mac.sh            # só no Mac (localhost)
#   bash local-mac.sh --lan      # + acessível pelo iPhone no mesmo Wi-Fi
#
# Sobe: site (3000) + painel (8080) + API (4000) + Postgres +
# Redis + Ghost/blog (2368) + MySQL. Node NÃO é necessário —
# o painel é buildado dentro de um container.
set -euo pipefail
cd "$(dirname "$0")"

info(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }

# ---- 0) Modo LAN (--lan): expõe painel/site/API no Wi-Fi ----
LAN=0
[ "${1:-}" = "--lan" ] && LAN=1
COMPOSE_FILES=(-f docker-compose.yml -f compose.local.yml)

if [ "$LAN" = 1 ]; then
  # en0 é o Wi-Fi no Mac; en1 cobre quem usa adaptador Ethernet.
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
  [ -n "$LAN_IP" ] || die "Não achei o IP da LAN. Conecte-se ao Wi-Fi e tente de novo."
  export LAN_IP
  # Origens extras para o CORS da API (o painel no IP é outra origem).
  export LAN_ORIGINS=",http://$LAN_IP:8080,http://$LAN_IP:3000"
  COMPOSE_FILES+=(-f compose.lan.yml)
  info "Modo LAN: painel/site/API também em $LAN_IP (qualquer aparelho do Wi-Fi alcança)"
fi

# (a checagem do Docker acontece depois de gerar o .env — ver abaixo)

# ---- 1) .env com segredos aleatórios (só na 1ª vez) ----
if [ ! -f .env ]; then
  info "Gerando .env com segredos aleatórios"
  R(){ openssl rand -hex "$1"; }
  cat > .env <<EOF
# Gerado por local-mac.sh — NÃO versione este arquivo.
NEXT_PUBLIC_NEWS_SOURCE=https://hojemt.com.br
NEXT_PUBLIC_WHATSAPP=5566999999999

DB_PASSWORD=$(R 16)
REDIS_PASSWORD=$(R 16)

GHOST_URL=http://localhost:2368
GHOST_DB_PASSWORD=$(R 16)

JWT_SECRET=$(R 32)
JWT_REFRESH_SECRET=$(R 32)

# Opcional: cole sua chave da Anthropic para ligar a IA (classificar/resumir/sugerir).
ANTHROPIC_API_KEY=
AI_MODEL_CLASSIFY=claude-haiku-4-5
AI_MODEL_SUMMARIZE=claude-haiku-4-5
AI_MODEL_SUGGEST=claude-sonnet-5
EOF
  echo "  .env criado. (Edite depois para pôr ANTHROPIC_API_KEY e seu WhatsApp.)"
else
  echo "  .env já existe — mantido."
fi

# ---- A partir daqui o Docker precisa estar rodando ----
command -v docker >/dev/null 2>&1 || die "Docker Desktop não encontrado. Instale: https://www.docker.com/products/docker-desktop/"
docker info >/dev/null 2>&1 || die "O Docker não está rodando. Abra o Docker Desktop, espere ficar verde e rode de novo (o .env já foi criado)."

# ---- 2) Build do painel (Vite) dentro de um container node ----
# O repositório é um monorepo npm workspaces: o lockfile é único, na raiz, e o
# painel importa @comenta/shared (que precisa do dist gerado pelo tsc). Montar
# só saas/web não funciona — lá não há lockfile e o `npm ci` aborta.
# Sem VITE_API_URL de propósito: o painel deriva a API do host que o serviu
# (ver saas/web/src/lib/http.ts), então o mesmo build atende localhost e o IP
# da LAN, sem recompilar por endereço.
info "Buildando o painel (sem precisar de Node no seu Mac)"
docker run --rm \
  -v "$(cd .. && pwd)":/repo -w /repo \
  node:22-alpine sh -c "npm ci --ignore-scripts && npm run build -w @comenta/shared && npm run build -w @comenta/web"

# ---- 3) Sobe toda a stack ----
info "Subindo todos os serviços (pode demorar na 1ª vez — baixa imagens e builda)"
docker compose "${COMPOSE_FILES[@]}" --env-file .env up -d --build

info "Status"
docker compose "${COMPOSE_FILES[@]}" ps

cat <<EOF

\033[1;32m✔ Tudo no ar no seu Mac:\033[0m
  Site .... http://localhost:3000
  Painel .. http://localhost:8080   (login: admin@comenta.com.br / comenta123)
  API ..... http://localhost:4000/docs   (OpenAPI)
  Blog .... http://localhost:2368/ghost  (Ghost — crie o admin no 1º acesso)

Comandos úteis:
  Ver logs .... docker compose ${COMPOSE_FILES[*]} logs -f
  Parar ....... docker compose ${COMPOSE_FILES[*]} down
  Parar+limpar  docker compose ${COMPOSE_FILES[*]} down -v
EOF

if [ "$LAN" = 1 ]; then
  cat <<EOF

\033[1;32m📱 No iPhone (mesmo Wi-Fi):\033[0m
  Site .... http://$LAN_IP:3000
  Painel .. http://$LAN_IP:8080

  As ferramentas (n8n, Metabase, NocoDB) e os bancos seguem só no Mac.
  Para tirar da rede, rode de novo sem --lan.
EOF
fi
