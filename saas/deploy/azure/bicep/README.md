# Comenta SaaS no Azure — variante Bicep

Mesma stack do [`../deploy.sh`](../deploy.sh) (script az CLI puro), porém com a
infraestrutura declarada em **Bicep** e versionada. Bom para reprodutibilidade,
revisão em PR e `what-if`.

- **`main.bicep`** — declara Postgres Flexible Server (+ banco + firewall p/
  serviços Azure), Azure Cache for Redis, Storage account, Log Analytics,
  Container Apps Environment e o Container App da API.
- **`deploy-bicep.sh`** — wrapper que orquestra o que **não** é declarativo:
  cria o ACR e faz `az acr build` da imagem, roda o `az deployment group create`
  e depois habilita o site estático + publica o painel React.

> Build de imagem (`az acr build`) e upload de blobs são operações de
> _data-plane_ — por isso ficam no wrapper, não no template.

## Rodar (Azure Cloud Shell)

```bash
cd saas/deploy/azure/bicep
export ANTHROPIC_API_KEY="sk-ant-..."   # opcional (sem ela, /ai responde 503)
bash deploy-bicep.sh
```

Ao final imprime as URLs (painel, API, `/docs`) e o login demo
`admin@comenta.com.br` / `comenta123`.

## O que o template já resolve

- **SSL do Postgres**: `DATABASE_URL` montada com `?sslmode=require`.
- **TLS do Redis**: `rediss://…:6380`, com a chave passada por `uriComponent()`
  (URL-encode nativo do Bicep) — evita quebra do `ioredis` com `+ / =`.
- **CORS**: `CORS_ORIGINS` e `APP_URL` derivam de
  `storage.properties.primaryEndpoints.web` (sem ordem manual entre painel e API).
- **API_URL**: derivada de `<app>.<env.defaultDomain>` (FQDN determinístico),
  sem passo de update pós-deploy.
- **Socket.IO**: `ingress.stickySessions.affinity = 'sticky'`.
- **Migração + seed**: `command/args` do container espelham o `docker-compose`.

## Só declarativo (sem o wrapper)

Se você já tem a imagem no ACR e o site estático habilitado, dá para aplicar só
o template:

```bash
az deployment group create -g rg-comenta --template-file main.bicep \
  --parameters suffix=ab12cd pgPassword=... jwtSecret=... jwtRefreshSecret=... \
               acrLoginServer=<acr>.azurecr.io acrUsername=<u> acrPassword=<p> \
               apiImage=<acr>.azurecr.io/comenta-api:latest
```

Pré-visualizar mudanças sem aplicar: troque `create` por `what-if`.

## Observação

Este template foi escrito e conferido estruturalmente, mas **não foi compilado
com `bicep build` neste ambiente** (sem `az`/`bicep` disponível). Antes do
primeiro uso, rode `az bicep build --file main.bicep` (ou
`az deployment group what-if`) para validação final na sua conta.
