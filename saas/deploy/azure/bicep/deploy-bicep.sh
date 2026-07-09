#!/usr/bin/env bash
#
# Comenta SaaS — deploy no Azure via Bicep (para o Azure Cloud Shell).
#
# Faz o que é declarativo pelo main.bicep (Postgres, Redis, Storage, Log
# Analytics, Container Apps Environment + Container App) e cuida das partes
# imperativas em volta: build da imagem da API (az acr build), habilitar o site
# estático e publicar o painel React.
#
# Uso:
#   1. az login  (o Cloud Shell já vem autenticado)
#   2. cd saas/deploy/azure/bicep
#   3. (opcional) export ANTHROPIC_API_KEY="sk-ant-..."
#   4. bash deploy-bicep.sh
#
set -euo pipefail

# ── Configuração ────────────────────────────────────────────────────────────
LOCATION="${LOCATION:-brazilsouth}"
RG="${RG:-rg-comenta}"
SUFFIX="${SUFFIX:-$(openssl rand -hex 3)}"

ACR_NAME="comentaacr${SUFFIX}"          # 5-50 alnum, minúsculo, único
STORAGE="comentaweb${SUFFIX}"           # tem de casar com main.bicep
IMAGE_TAG="comenta-api:latest"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../../../api" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/../../../web" && pwd)"
BICEP="$SCRIPT_DIR/main.bicep"

# Segredos gerados (hex = seguro em URL; base64 ok como valor de env)
PG_PASS="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -base64 48)"
JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

say "Comenta SaaS → Azure (Bicep) | região=$LOCATION | RG=$RG | sufixo=$SUFFIX"
echo "  Guarde o sufixo para reexecutar contra os mesmos recursos: SUFFIX=$SUFFIX"

# ── Providers + extensão ────────────────────────────────────────────────────
say "Registrando providers…"
az extension add --name containerapp --upgrade --only-show-errors 1>/dev/null
for ns in Microsoft.App Microsoft.DBforPostgreSQL Microsoft.Cache \
          Microsoft.ContainerRegistry Microsoft.Storage Microsoft.OperationalInsights; do
  az provider register --namespace "$ns" --wait --only-show-errors 1>/dev/null &
done
wait

# ── Resource group ──────────────────────────────────────────────────────────
say "Resource group $RG…"
az group create -n "$RG" -l "$LOCATION" --only-show-errors 1>/dev/null

# ── ACR + build remoto da imagem (precisa existir antes do deployment) ───────
say "Container Registry $ACR_NAME + build da imagem da API…"
az acr create -n "$ACR_NAME" -g "$RG" --sku Basic --admin-enabled true \
  --only-show-errors 1>/dev/null
az acr build --registry "$ACR_NAME" --image "$IMAGE_TAG" "$API_DIR" \
  --only-show-errors 1>/dev/null
ACR_SERVER="$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)"
ACR_USER="$(az acr credential show -n "$ACR_NAME" --query username -o tsv)"
ACR_PASS="$(az acr credential show -n "$ACR_NAME" --query 'passwords[0].value' -o tsv)"

# ── Deployment Bicep (todo o resto) ─────────────────────────────────────────
say "Deployment do main.bicep…"
OUT="$(az deployment group create \
  -g "$RG" --template-file "$BICEP" \
  --parameters \
    location="$LOCATION" \
    suffix="$SUFFIX" \
    pgPassword="$PG_PASS" \
    jwtSecret="$JWT_SECRET" \
    jwtRefreshSecret="$JWT_REFRESH_SECRET" \
    anthropicApiKey="$ANTHROPIC_API_KEY" \
    acrLoginServer="$ACR_SERVER" \
    acrUsername="$ACR_USER" \
    acrPassword="$ACR_PASS" \
    apiImage="$ACR_SERVER/$IMAGE_TAG" \
  --query properties.outputs -o json)"

API_URL="$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["apiUrl"]["value"])')"
WEB_URL="$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["webUrl"]["value"])')"
PG_HOST="$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["pgHost"]["value"])')"
REDIS_HOST="$(echo "$OUT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["redisHost"]["value"])')"

# ── Site estático + publicação do painel ────────────────────────────────────
say "Habilitando site estático e publicando o painel (VITE_API_URL=$API_URL)…"
STORAGE_KEY="$(az storage account keys list -n "$STORAGE" -g "$RG" --query '[0].value' -o tsv)"
az storage blob service-properties update --account-name "$STORAGE" \
  --account-key "$STORAGE_KEY" --static-website \
  --index-document index.html --404-document index.html \
  --only-show-errors 1>/dev/null

( cd "$WEB_DIR" && npm ci --no-audit --no-fund && VITE_API_URL="$API_URL" npm run build )
az storage blob upload-batch --account-name "$STORAGE" --account-key "$STORAGE_KEY" \
  -s "$WEB_DIR/dist" -d '$web' --overwrite --only-show-errors 1>/dev/null

# ── Resumo ──────────────────────────────────────────────────────────────────
cat <<RESUMO

────────────────────────────────────────────────────────────
✅ Comenta SaaS provisionado no Azure (via Bicep)

  Painel (web)   : $WEB_URL
  API            : $API_URL
  API docs       : $API_URL/docs
  Login demo     : admin@comenta.com.br / comenta123

  Recursos (RG $RG):
    Postgres     : $PG_HOST
    Redis        : $REDIS_HOST:6380 (TLS)
    Registry     : $ACR_SERVER
    Storage      : $STORAGE

  Reexecutar (mesmos recursos):  SUFFIX=$SUFFIX RG=$RG bash deploy-bicep.sh
  Logs da API:  az containerapp logs show -n comenta-api -g $RG --follow
  Apagar tudo:  az group delete -n $RG --yes --no-wait
────────────────────────────────────────────────────────────
RESUMO
