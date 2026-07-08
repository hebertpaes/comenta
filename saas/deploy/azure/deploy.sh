#!/usr/bin/env bash
#
# Comenta SaaS — provisionamento no Azure (100% az CLI, para o Azure Cloud Shell).
#
# Sobe a stack completa em serviços gerenciados:
#   • Azure Database for PostgreSQL Flexible Server  (banco)
#   • Azure Cache for Redis                          (filas BullMQ / Socket.IO)
#   • Azure Container Registry + Container Apps       (API Fastify, porta 4000)
#   • Azure Storage static website                    (painel React/Vite)
#
# Como usar (no portal → botão "Cloud Shell", ambiente Bash):
#   1. Clone/baixe o repo OU faça upload da pasta saas/.
#   2. cd saas/deploy/azure
#   3. (opcional) export ANTHROPIC_API_KEY="sk-ant-..."   # habilita os endpoints /ai
#   4. bash deploy.sh
#
# Reexecução: exporte o mesmo SUFFIX impresso na 1ª execução para atingir os
# mesmos recursos (ex.: SUFFIX=ab12cd bash deploy.sh). O script é idempotente
# nas partes que suportam (o "create" reclama se já existir — veja o README).
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuração — ajuste à vontade antes de rodar
# ─────────────────────────────────────────────────────────────────────────────
LOCATION="${LOCATION:-brazilsouth}"          # região Azure
RG="${RG:-rg-comenta}"                        # resource group
SUFFIX="${SUFFIX:-$(openssl rand -hex 3)}"    # sufixo p/ nomes globalmente únicos

PG_TIER="Burstable"
PG_SKU="Standard_B1ms"                         # ~menor tier; suba p/ produção real
PG_VERSION="16"
PG_ADMIN="comentaadmin"

REDIS_SKU="Basic"
REDIS_SIZE="c0"                                # 250 MB; use Standard/Premium p/ HA

ACR_NAME="comentaacr${SUFFIX}"                 # 5-50 alnum, minúsculo, único
STORAGE="comentaweb${SUFFIX}"                  # <=24 alnum, minúsculo, único
PG_SERVER="comenta-pg-${SUFFIX}"
REDIS_NAME="comenta-redis-${SUFFIX}"
ENV_NAME="comenta-env"
APP_NAME="comenta-api"
IMAGE_TAG="comenta-api:latest"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../../api" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/../../web" && pwd)"

# Segredos gerados (hex = seguros dentro de URLs, sem precisar de URL-encode)
PG_PASS="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -base64 48)"
JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

say "Comenta SaaS → Azure | região=$LOCATION | RG=$RG | sufixo=$SUFFIX"
echo "  Guarde este sufixo para reexecutar contra os mesmos recursos: SUFFIX=$SUFFIX"

# ─────────────────────────────────────────────────────────────────────────────
# 0. Providers + extensão containerapp
# ─────────────────────────────────────────────────────────────────────────────
say "Registrando resource providers (idempotente)…"
az extension add --name containerapp --upgrade --only-show-errors 1>/dev/null
for ns in Microsoft.App Microsoft.DBforPostgreSQL Microsoft.Cache \
          Microsoft.ContainerRegistry Microsoft.Storage Microsoft.OperationalInsights; do
  az provider register --namespace "$ns" --wait --only-show-errors 1>/dev/null &
done
wait

# ─────────────────────────────────────────────────────────────────────────────
# 1. Resource group
# ─────────────────────────────────────────────────────────────────────────────
say "Resource group $RG…"
az group create -n "$RG" -l "$LOCATION" --only-show-errors 1>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# 2. Storage static website (painel) — criado cedo p/ conhecer a URL do painel,
#    que a API precisa liberar no CORS.
# ─────────────────────────────────────────────────────────────────────────────
say "Storage account $STORAGE (site estático)…"
az storage account create -n "$STORAGE" -g "$RG" -l "$LOCATION" \
  --sku Standard_LRS --kind StorageV2 --only-show-errors 1>/dev/null
STORAGE_KEY="$(az storage account keys list -n "$STORAGE" -g "$RG" \
  --query '[0].value' -o tsv)"
az storage blob service-properties update --account-name "$STORAGE" \
  --account-key "$STORAGE_KEY" --static-website \
  --index-document index.html --404-document index.html \
  --only-show-errors 1>/dev/null
WEB_URL="$(az storage account show -n "$STORAGE" -g "$RG" \
  --query 'primaryEndpoints.web' -o tsv)"
WEB_URL="${WEB_URL%/}"   # sem barra final (origem exata p/ CORS)
echo "  Painel: $WEB_URL"

# ─────────────────────────────────────────────────────────────────────────────
# 3. PostgreSQL Flexible Server (+ banco) — SSL obrigatório
# ─────────────────────────────────────────────────────────────────────────────
say "PostgreSQL Flexible Server $PG_SERVER (pode levar alguns minutos)…"
az postgres flexible-server create \
  --name "$PG_SERVER" -g "$RG" -l "$LOCATION" \
  --tier "$PG_TIER" --sku-name "$PG_SKU" --version "$PG_VERSION" \
  --storage-size 32 \
  --admin-user "$PG_ADMIN" --admin-password "$PG_PASS" \
  --database-name comenta_saas \
  --public-access 0.0.0.0 \
  --yes --only-show-errors 1>/dev/null
PG_HOST="$(az postgres flexible-server show -n "$PG_SERVER" -g "$RG" \
  --query fullyQualifiedDomainName -o tsv)"
DATABASE_URL="postgresql://${PG_ADMIN}:${PG_PASS}@${PG_HOST}:5432/comenta_saas?sslmode=require"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Azure Cache for Redis — TLS na 6380 (rediss://). Provisionamento é lento.
# ─────────────────────────────────────────────────────────────────────────────
say "Azure Cache for Redis $REDIS_NAME (provisionamento costuma levar 15-20 min)…"
az redis create -n "$REDIS_NAME" -g "$RG" -l "$LOCATION" \
  --sku "$REDIS_SKU" --vm-size "$REDIS_SIZE" \
  --minimum-tls-version 1.2 --only-show-errors 1>/dev/null
REDIS_HOST="$(az redis show -n "$REDIS_NAME" -g "$RG" --query hostName -o tsv)"
REDIS_KEY="$(az redis list-keys -n "$REDIS_NAME" -g "$RG" --query primaryKey -o tsv)"
# a chave do Redis contém +/=; precisa de URL-encode dentro da connection string
REDIS_KEY_ENC="$(printf %s "$REDIS_KEY" | jq -sRr @uri)"
REDIS_URL="rediss://:${REDIS_KEY_ENC}@${REDIS_HOST}:6380"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Container Registry + build remoto da imagem da API (sem Docker local)
# ─────────────────────────────────────────────────────────────────────────────
say "Container Registry $ACR_NAME + build da imagem da API…"
az acr create -n "$ACR_NAME" -g "$RG" --sku Basic --admin-enabled true \
  --only-show-errors 1>/dev/null
az acr build --registry "$ACR_NAME" --image "$IMAGE_TAG" "$API_DIR" \
  --only-show-errors 1>/dev/null
ACR_SERVER="$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)"
ACR_USER="$(az acr credential show -n "$ACR_NAME" --query username -o tsv)"
ACR_PASS="$(az acr credential show -n "$ACR_NAME" --query 'passwords[0].value' -o tsv)"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Container Apps — ambiente + app da API
#    O comando de start espelha o docker-compose: migra o schema, roda o seed
#    (idempotente) e sobe o servidor.
# ─────────────────────────────────────────────────────────────────────────────
say "Container Apps environment $ENV_NAME…"
az containerapp env create -n "$ENV_NAME" -g "$RG" -l "$LOCATION" \
  --only-show-errors 1>/dev/null

say "Container App $APP_NAME…"
az containerapp create \
  -n "$APP_NAME" -g "$RG" --environment "$ENV_NAME" \
  --image "$ACR_SERVER/$IMAGE_TAG" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --ingress external --target-port 4000 --transport auto \
  --min-replicas 1 --max-replicas 3 \
  --cpu 0.5 --memory 1.0Gi \
  --secrets "db-url=$DATABASE_URL" "redis-url=$REDIS_URL" \
            "jwt-secret=$JWT_SECRET" "jwt-refresh=$JWT_REFRESH_SECRET" \
            "anthropic-key=$ANTHROPIC_API_KEY" \
  --env-vars NODE_ENV=production PORT=4000 \
             APP_URL="$WEB_URL" \
             CORS_ORIGINS="$WEB_URL" \
             DATABASE_URL=secretref:db-url \
             REDIS_URL=secretref:redis-url \
             JWT_SECRET=secretref:jwt-secret \
             JWT_REFRESH_SECRET=secretref:jwt-refresh \
             ANTHROPIC_API_KEY=secretref:anthropic-key \
             AI_MODEL_CLASSIFY=claude-haiku-4-5 \
             AI_MODEL_SUMMARIZE=claude-haiku-4-5 \
             AI_MODEL_SUGGEST=claude-sonnet-5 \
  --command "/bin/sh" \
  --args "-c" "npx drizzle-kit push --force && npx tsx src/db/seed.ts && npx tsx src/index.ts" \
  --only-show-errors 1>/dev/null

# Socket.IO com múltiplas réplicas precisa de afinidade de sessão
az containerapp ingress sticky-sessions set -n "$APP_NAME" -g "$RG" \
  --affinity sticky --only-show-errors 1>/dev/null

API_FQDN="$(az containerapp show -n "$APP_NAME" -g "$RG" \
  --query properties.configuration.ingress.fqdn -o tsv)"
API_URL="https://$API_FQDN"

# Agora que a API tem URL pública, preenche API_URL
az containerapp update -n "$APP_NAME" -g "$RG" \
  --set-env-vars API_URL="$API_URL" --only-show-errors 1>/dev/null
echo "  API: $API_URL"

# ─────────────────────────────────────────────────────────────────────────────
# 7. Build do painel apontando para a API e publicação no site estático
# ─────────────────────────────────────────────────────────────────────────────
say "Build do painel (VITE_API_URL=$API_URL) + upload…"
( cd "$WEB_DIR" && npm ci --no-audit --no-fund \
    && VITE_API_URL="$API_URL" npm run build )
az storage blob upload-batch --account-name "$STORAGE" --account-key "$STORAGE_KEY" \
  -s "$WEB_DIR/dist" -d '$web' --overwrite --only-show-errors 1>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# Resumo
# ─────────────────────────────────────────────────────────────────────────────
cat <<RESUMO

────────────────────────────────────────────────────────────
✅ Comenta SaaS provisionado no Azure

  Painel (web)   : $WEB_URL
  API            : $API_URL
  API docs       : $API_URL/docs
  Health         : $API_URL/health

  Login demo     : admin@comenta.com.br / comenta123

  Recursos (RG $RG):
    Postgres     : $PG_HOST
    Redis        : $REDIS_HOST:6380 (TLS)
    Registry     : $ACR_SERVER
    Container App: $APP_NAME
    Storage      : $STORAGE

  Reexecutar contra os mesmos recursos:
    SUFFIX=$SUFFIX RG=$RG bash deploy.sh

  Ver logs da API:
    az containerapp logs show -n $APP_NAME -g $RG --follow

  Apagar TUDO:
    az group delete -n $RG --yes --no-wait
────────────────────────────────────────────────────────────
RESUMO
