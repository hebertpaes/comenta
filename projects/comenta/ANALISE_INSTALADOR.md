# Análise do Instalador (instaladormain.zip)

## Situação na 1.0

> **O instalador de `projects/comenta/instalador/` não instala o Comenta 1.0.**
> Ele é o instalador Bash do Atendechat/Whaticket com a marca trocada e foi
> feito para um repositório com pastas `backend/` (Express + Sequelize) e
> `frontend/` (React com Create React App). O Comenta 1.0 é um monorepo com
> `saas/api` (Fastify + Drizzle), `saas/web` (Vite) e `site` (Next), e se
> instala com **`deploy/bootstrap.sh` + `deploy/docker-compose.yml`** (ver
> [`deploy/RUNBOOK.md`](../../deploy/RUNBOOK.md) e o [`README.md`](README.md)).
> O instalador fica no repositório só como referência histórica.

### Incompatibilidades com o Comenta 1.0

| Ponto              | O instalador faz                                                                                                                     | O Comenta 1.0 precisa                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pastas             | `cd /home/deploy/<instância>/backend` e `/frontend` (`lib/_backend.sh`, `lib/_frontend.sh`)                                          | `saas/api`, `saas/web` e `site`; `backend/` e `frontend/` não existem, e os comandos seguintes rodam na pasta errada                                      |
| Build da API       | `npm install --force && npm run build` dentro de `backend/`                                                                          | `npm ci` na raiz do monorepo e `npm run build -w @comenta/shared` antes da API e do painel                                                                |
| Banco              | `npx sequelize db:migrate`, `db:seed:all` (e `npx sequelize db:seed` sem o `--seed` obrigatório, que falha, na atualização)          | Drizzle: `drizzle-kit push` (`npm run db:push`) e `npm run db:seed`; não há Sequelize nem migrações versionadas                                           |
| Ponto de entrada   | `pm2 start dist/server.js`                                                                                                           | Produção roda `npx tsx src/index.ts`; o build gera `dist/index.js`                                                                                        |
| Variáveis da API   | Arquivo `backend/.env` com `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `REDIS_URI`, `BACKEND_URL`, `FRONTEND_URL`, `NODE_ENV=` vazio | Variáveis de ambiente `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `API_URL`, `CORS_ORIGINS`, `JWT_SECRET`, `NODE_ENV=production`; a API não lê arquivo `.env` |
| Limites            | `USER_LIMIT` e `CONNECTIONS_LIMIT` no `.env`                                                                                         | Limites por plano no banco; essas variáveis não são lidas                                                                                                 |
| Painel             | `REACT_APP_BACKEND_URL` e um `server.js` CommonJS com Express servindo `build/`                                                      | `VITE_API_URL` no build, pacote ESM sem Express, saída em `dist/`                                                                                         |
| Node               | Node 20 (NodeSource)                                                                                                                 | Node 22 ou mais novo (`engines` da raiz; imagens `node:22-alpine`)                                                                                        |
| WhatsApp           | Instala as dependências do Puppeteer/Chromium                                                                                        | Baileys, por WebSocket, sem navegador; credenciais em `WHATSAPP_DATA_DIR` (padrão `/data/wa`), que o instalador não cria                                  |
| Porta              | Grava `PORT` num `.env` que a API não lê                                                                                             | Sem a variável, toda instância sobe na 4000 e colide, enquanto o Nginx aponta para a porta 4xxx informada                                                 |
| Site Next          | Não trata                                                                                                                            | `site/` precisa de build e de vhost próprios                                                                                                              |
| Pacotes do sistema | `libappindicator1`, `gconf-service`, `libgconf-2-4`, `libasound2`                                                                    | Esses pacotes não existem (ou viraram virtuais) no Ubuntu 22.04/24.04, o que provavelmente derruba o `apt-get` inteiro (não testado em máquina)           |

### Afirmações desta análise que estavam erradas

A análise original (abaixo) foi escrita antes de existir o código do Comenta.
Conferida com o código da 1.0:

- **"Dependências do Puppeteer (Chromium para o WhatsApp Web)":** o Comenta não
  usa Puppeteer. O WhatsApp é feito com Baileys, sem navegador
  (`saas/api/src/channels/whatsapp.ts`).
- **"Integração de pagamento preparada para Gerencianet/Efí via `GERENCIANET_*`
  no `.env`":** o `.env` gerado pelo instalador não tem `GERENCIANET_*` (só o
  README herdado do Atendechat mostrava essas variáveis), e o Comenta 1.0 não
  tem integração de pagamento nenhuma.
- **"Alternativa moderna: stack Docker do repositório `intsoft-app`
  (`manage-stacks.sh`)":** `intsoft-app/manage-stacks.sh` não faz parte deste
  repositório e não é usado. A alternativa real, e oficial na 1.0, é
  `deploy/bootstrap.sh` + `deploy/docker-compose.yml`.
- **"Instalação limpa em Ubuntu 22.04 via `install_primaria`"** (critério do
  antigo `CODEX_TASK.md`): não se cumpre para o Comenta, pelas
  incompatibilidades acima, e a lista de pacotes do sistema provavelmente falha
  nessas versões do Ubuntu.
- **"Rebrandado para Comenta":** só o banner, os menus e as mensagens. O
  `instalador/README.md` herdado continuou descrevendo o Atendechat até a 1.0
  (quando foi reescrito como "Instalador legado"); o `package-lock.json` ainda
  se chama `atendechat-deploy` e o `LICENSE` é o original.
- **"Senha de deploy":** a pergunta inicial define só a senha do banco e do
  Redis; a senha do usuário `deploy` é gerada aleatoriamente.

### Correções feitas no instalador

Além das quatro da tabela "Problemas encontrados" (abaixo), o commit `998179c`
corrigiu o heredoc do `git clone`, a ordem de `dropdb`/`dropuser`, o `sed` do
`.env` por chave, o repositório Docker com `$(lsb_release -cs)`, a criação do
banco via `sudo -u postgres`, os espaços no `.env` do frontend e o
`deploy_password` indefinido.

Na 1.0 entraram:

- "Desbloquear" usava `${empresa_bloquear}` (vazio) e não desbloqueava; agora
  usa `${empresa_desbloquear}`.
- Deletar, bloquear, desbloquear e alterar domínio validam o nome da instância
  antes de qualquer `rm`, `dropdb`, `docker` ou `pm2` (antes, deletar com nome
  vazio executava `rm -rf /home/deploy/`).
- `install_primaria` e `install_instancia` passaram a ter permissão de execução.
- Banner, menu e `instalador/README.md` dizem que o instalador é legado e
  apontam para `deploy/bootstrap.sh`; `npm_package_version` gravado no `.env`
  passou de `6.0.1` (herdado do Atendechat) para `1.0.0`.

Continuam como estão (o instalador é legado e não será evoluído): mesma senha
para Postgres e Redis, role Postgres `SUPERUSER` por instância, e-mail fixo
`deploy@deploy.com` no Certbot, o typo `REGIS_OPT_LIMITER_DURATION` e as
dependências `nodemon`/`ts-node` sem uso no `package.json`.

---

## Análise original (histórica)

Análise técnica do instalador enviado (base Atendechat), que originou o
`instalador/` deste projeto. Mantida como registro; as correções estão na seção
anterior.

## O que é

Instalador CLI em Bash para provisionar, em uma VPS Ubuntu, instâncias de uma
plataforma de atendimento via WhatsApp (arquitetura Whaticket/Atendechat):
backend Express + frontend React + PostgreSQL + Redis (Docker) + PM2 + Nginx +
Certbot (SSL).

## Estrutura

```
instalador/
├── install_primaria      # 1ª instalação: dependências do sistema + 1ª instância
├── install_instancia     # instâncias adicionais (pula dependências do sistema)
├── config                # senhas geradas na instalação (NÃO versionar)
├── lib/
│   ├── _system.sh        # sistema: usuário deploy, node, docker, nginx, certbot,
│   │                     #   clone do código, atualizar/deletar/bloquear instância
│   ├── _backend.sh       # .env, redis, dependências, build, migrate, seed, pm2
│   ├── _frontend.sh      # .env, dependências, build, pm2, nginx
│   └── _inquiry.sh       # CLI interativa (menu e perguntas)
├── utils/_banner.sh      # banner ASCII
└── variables/            # cores e variáveis (JWT secrets, senhas geradas)
```

## Fluxo de instalação (install_primaria)

1. **Menu**: instalar / atualizar / deletar / bloquear / desbloquear / alterar domínio.
2. **Perguntas**: senha do banco e do Redis, repositório Git, nome da instância,
   qtde de conexões WhatsApp, qtde de atendentes, domínios frontend/backend,
   portas frontend (3xxx), backend (4xxx) e Redis (5xxx).
3. **Sistema**: apt update, Node.js 20, PM2, Docker, dependências do Puppeteer
   (que a base Atendechat usava; o Comenta não usa Puppeteer), snapd, Nginx,
   Certbot, usuário `deploy`.
4. **Backend**: clone do código, `.env` (Postgres, Redis, JWT, limites),
   container Redis por instância, `npm install`, build,
   `npx sequelize db:migrate`, `npx sequelize db:seed:all`, PM2, virtual host
   Nginx.
5. **Frontend**: `.env` (URL do backend), build, PM2, Nginx.
6. **Rede**: configuração global do Nginx, restart e SSL via Certbot.

Cada instância é isolada por nome: banco próprio, usuário Postgres próprio,
Redis próprio (porta dedicada) e processos PM2 próprios — modelo multi-tenant
por instância/empresa. (O Comenta 1.0 é multi-tenant de outro jeito: várias
empresas no mesmo banco, separadas por `companyId`.)

## Problemas encontrados e correções aplicadas

| #   | Problema                                                                         | Gravidade                         | Correção no `instalador/`                                                                                                 |
| --- | -------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Token GitHub hardcoded** (`ghp_…`) na URL de clone em `lib/_system.sh`         | Crítica (vazamento de credencial) | Removido; o clone agora usa `${link_git}` informado na instalação                                                         |
| 2   | Arquivo `config` com senha de deploy e `db_pass` versionados                     | Crítica                           | Arquivo removido do pacote e adicionado ao `.gitignore`                                                                   |
| 3   | `get_link_git` era chamado em `get_urls()` mas **não existia** (erro em runtime) | Alta                              | Função criada em `lib/_inquiry.sh` (pergunta a URL do repositório)                                                        |
| 4   | Marca Atendechat (banner, menus, mensagens)                                      | —                                 | Banner, menus e mensagens trocados para Comenta (o lock e o LICENSE herdados não foram; o README só foi reescrito na 1.0) |

> ⚠️ **Ação recomendada:** se o token `ghp_…` presente no zip original ainda
> estiver ativo, revogue-o imediatamente em GitHub → Settings → Developer
> settings → Personal access tokens.

## Observações técnicas

- O instalador pressupõe **Ubuntu com sudo/root** e domínios já apontados
  para o servidor (DNS) antes do Certbot.
- `install_instancia` é idêntico ao `install_primaria`, porém com as etapas de
  dependências do sistema comentadas — próprio para adicionar instâncias.
- O `.env` do backend usa a mesma senha para banco e Redis
  (`mysql_root_password`) — em produção, considerar senhas distintas.
- ~~Integração de pagamento preparada para Gerencianet/Efí (PIX) via variáveis
  `GERENCIANET_*` no `.env`.~~ Errado: o `.env` gerado não tem essas variáveis
  e o Comenta não tem integração de pagamento (ver "Situação na 1.0").
- ~~Alternativa moderna ao instalador: a stack Docker Compose do repositório
  `intsoft-app` (`manage-stacks.sh`).~~ Não usado: o caminho Docker do Comenta
  é `deploy/bootstrap.sh` + `deploy/docker-compose.yml`.
