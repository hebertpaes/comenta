# Deploy do Comenta SaaS no Azure

Provisiona a stack inteira em **serviços gerenciados**, usando só o **Azure CLI**
— feito para colar e rodar no **Cloud Shell** do próprio portal, sem Docker
local nem servidor.

| Componente      | Serviço Azure                                    | Papel                           |
| --------------- | ------------------------------------------------ | ------------------------------- |
| Banco           | **PostgreSQL Flexible Server** (`Standard_B1ms`) | dados (SSL obrigatório)         |
| Fila / realtime | **Azure Cache for Redis** (`Basic C0`)           | BullMQ + Socket.IO (TLS 6380)   |
| Imagem          | **Container Registry** (`Basic`)                 | build remoto via `az acr build` |
| API             | **Container Apps** (Fastify, porta 4000)         | ingress HTTPS, réplicas 1–3     |
| Painel          | **Storage static website** (React/Vite)          | SPA servida como estático       |

## Pré-requisitos

- Uma assinatura Azure com permissão de **Contributor** (para criar recursos).
- Os arquivos da pasta `saas/` acessíveis no Cloud Shell (clone do repo ou upload).
- _(Opcional)_ uma `ANTHROPIC_API_KEY` — sem ela a API sobe normal, mas os
  endpoints `/ai` (classificar/resumir/sugerir) respondem `503`.

## Como rodar

1. No [portal](https://portal.azure.com), abra o **Cloud Shell** (ícone `>_` no
   topo) e escolha o ambiente **Bash**.
2. Obtenha os arquivos, por exemplo:
   ```bash
   git clone <URL-do-seu-repo> comenta && cd comenta/deploy/azure
   ```
3. _(Opcional)_ habilite a IA:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```
4. Execute:
   ```bash
   bash deploy.sh
   ```

O script gera senhas/segredos sozinho, faz o build remoto da imagem da API,
compila o painel apontando para a URL real da API e publica tudo. No fim ele
imprime as URLs e o **login demo** (`admin@comenta.com.br` / `comenta123`).

> ⏱️ O Azure Cache for Redis costuma levar **15–20 min** para provisionar — é a
> etapa mais lenta. O restante é rápido.

## Reexecutar / atualizar

Os nomes de recursos globalmente únicos usam um **sufixo aleatório**, impresso
no início da execução. Para reatingir os mesmos recursos (ex.: subir uma nova
versão da API), reexecute com o mesmo sufixo:

```bash
SUFFIX=abc123 RG=rg-comenta bash deploy.sh
```

Para atualizar **apenas** a API depois de mudar o código:

```bash
az acr build --registry comentaacr<sufixo> --image comenta-api:latest ../../api
az containerapp update -n comenta-api -g rg-comenta \
  --image comentaacr<sufixo>.azurecr.io/comenta-api:latest
```

## Detalhes que o script já resolve

- **SSL do Postgres**: a `DATABASE_URL` sai com `?sslmode=require` (o Flexible
  Server recusa conexão sem TLS).
- **TLS do Redis**: usa `rediss://…:6380` e faz **URL-encode** da chave (que
  contém `+ / =`) — senão o `ioredis` interpreta errado.
- **CORS x URL**: o painel é criado antes da API para que o `CORS_ORIGINS` já
  saia com a origem exata; o build do painel só roda depois, com a URL real da
  API em `VITE_API_URL`.
- **Socket.IO**: ativa _sticky sessions_ no ingress para funcionar com mais de
  uma réplica.
- **Migração + seed**: o comando de start do container espelha o `docker-compose`
  (`drizzle-kit push` + `seed` idempotente + `index.ts`).

## Domínio customizado (app./api.comenta.com.br)

O deploy base sobe nos domínios padrão do Azure. Para usar os domínios do
projeto, depois de rodar o script:

**API (`api.comenta.com.br`) no Container App:**

```bash
az containerapp hostname add     -n comenta-api -g rg-comenta --hostname api.comenta.com.br
az containerapp hostname bind    -n comenta-api -g rg-comenta --hostname api.comenta.com.br \
  --environment comenta-env --validation-method CNAME     # cria/gerencia o certificado
```

Aponte no seu DNS um `CNAME api → <fqdn-do-container-app>` (o FQDN impresso no
resumo) e o registro `asuid.api` de validação que o comando indicar.

**Painel (`app.comenta.com.br`):** o Storage static website não faz TLS em
domínio próprio sozinho — coloque um **Azure Front Door** (ou CDN) na frente do
endpoint `$web` e vincule o domínio + certificado ali. Lembre de acrescentar
`https://app.comenta.com.br` ao `CORS_ORIGINS` da API:

```bash
az containerapp update -n comenta-api -g rg-comenta \
  --set-env-vars CORS_ORIGINS="https://app.comenta.com.br"
```

## Custo aproximado (menores tiers, ordem de grandeza)

Postgres B1ms + Redis Basic C0 + Container Apps (1 réplica) + ACR Basic +
Storage ficam, somados, na casa de **algumas dezenas de dólares/mês**. Valores
variam por região e uso — confira na
[calculadora Azure](https://azure.microsoft.com/pricing/calculator/). Para
subir/derrubar em testes, o `az group delete -n rg-comenta --yes` remove tudo.

## Operação

```bash
# logs em tempo real da API
az containerapp logs show -n comenta-api -g rg-comenta --follow

# status/health
curl https://<fqdn-da-api>/health

# apagar toda a stack
az group delete -n rg-comenta --yes --no-wait
```
