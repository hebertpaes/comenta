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
#   bash local-mac.sh
#
# Sobe: site (3000) + painel (8080) + API (4000) + Postgres +
# Redis + Ghost/blog (2368) + MySQL. Node NÃO é necessário —
# o painel é buildado dentro de um container.
set -euo pipefail
cd "$(dirname "$0")"

info(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "Docker Desktop não encontrado. Instale: https://www.docker.com/products/docker-desktop/"
docker info >/dev/null 2>&1 || die "O Docker não está rodando. Abra o Docker Desktop, espere ficar verde e rode de novo."

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

# ---- 2) Build do painel (Vite) dentro de um container node ----
info "Buildando o painel (sem precisar de Node no seu Mac)"
docker run --rm \
  -e VITE_API_URL="http://localhost:4000" \
  -v "$(cd .. && pwd)/saas/web":/app -w /app \
  node:22-alpine sh -c "npm ci && npm run build"

# ---- 3) Sobe toda a stack ----
info "Subindo todos os serviços (pode demorar na 1ª vez — baixa imagens e builda)"
docker compose -f docker-compose.yml -f compose.local.yml --env-file .env up -d --build

info "Status"
docker compose -f docker-compose.yml -f compose.local.yml ps

cat <<EOF

\033[1;32m✔ Tudo no ar no seu Mac:\033[0m
  Site .... http://localhost:3000
  Painel .. http://localhost:8080   (login: admin@comenta.com.br / comenta123)
  API ..... http://localhost:4000/docs   (OpenAPI)
  Blog .... http://localhost:2368/ghost  (Ghost — crie o admin no 1º acesso)

Comandos úteis:
  Ver logs .... docker compose -f docker-compose.yml -f compose.local.yml logs -f
  Parar ....... docker compose -f docker-compose.yml -f compose.local.yml down
  Parar+limpar  docker compose -f docker-compose.yml -f compose.local.yml down -v
EOF
