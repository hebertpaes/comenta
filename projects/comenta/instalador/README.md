# Instalador legado — Comenta 1.0

Esta pasta guarda um instalador em Bash herdado de uma base **Whaticket/Atendechat**.
Ele continua aqui como referência e para quem mantém uma instalação própria dessa base.

> **Ele não instala o Comenta 1.0 deste monorepo.** O caminho oficial de instalação do
> Comenta 1.0 é `deploy/bootstrap.sh` (com `deploy/docker-compose.yml`), descrito no
> cabeçalho do próprio script e em `deploy/RUNBOOK.md`.

## O que o instalador faz

Há dois pontos de entrada, os dois com o mesmo menu interativo (`lib/_inquiry.sh`):

- `install_primaria`: prepara o servidor do zero e depois instala a primeira instância.
- `install_instancia`: instala mais uma instância num servidor já preparado (pula as
  etapas de sistema).

O menu tem seis opções:

| Opção | O que faz de fato                                                                                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Instala uma instância (passos abaixo).                                                                                                                                                                      |
| 1     | Atualiza uma instância: para os processos no PM2, `git pull`, `npm install`/`npm update -f` e rebuild de `frontend/` e `backend/`, `npx sequelize db:migrate` e `npx sequelize db:seed`, e reinicia no PM2. |
| 2     | Deleta uma instância: container Redis, vhosts do Nginx, banco e usuário do Postgres, pasta `/home/deploy/<nome>` e processos do PM2.                                                                        |
| 3     | Bloqueia uma instância: `pm2 stop <nome>-backend`.                                                                                                                                                          |
| 4     | Desbloqueia uma instância: `pm2 start <nome>-backend`.                                                                                                                                                      |
| 5     | Altera os domínios: recria os vhosts, troca `BACKEND_URL`, `FRONTEND_URL` e `REACT_APP_BACKEND_URL` nos `.env` de `backend/` e `frontend/` e roda o Certbot de novo.                                        |

As opções 1 a 5 recusam nome de instância vazio ou com `/`, `..`, espaços ou curingas
(`* ? [ ]`) antes de qualquer `rm`, `dropdb`, `docker` ou `pm2`.

### Preparação do servidor (`install_primaria`)

- `apt update` e dependências do Puppeteer/Chromium;
- Node.js 20 (NodeSource), `npm@latest` e PM2 global;
- PostgreSQL (apt.postgresql.org) e Docker CE;
- Nginx (remove `sites-enabled/default`) e Certbot via snap;
- usuário `deploy` no grupo `sudo`, com senha aleatória gravada só no arquivo `config`
  (fora do Git, `chmod 700`).

A senha que o menu pede vale para o banco e o Redis da instância; a do usuário `deploy`
é gerada automaticamente.

### Instalação de uma instância

1. `git clone` da URL informada em `/home/deploy/<instância>/`, como `deploy`
   (repositório privado precisa de credencial ou deploy key configurada à mão).
2. Redis em container (`redis-<instância>`) na porta informada, com senha.
3. Banco e usuário Postgres com o nome da instância.
4. `backend/.env` com `DB_*`, `REDIS_URI`, `BACKEND_URL`, `FRONTEND_URL`, `JWT_*`,
   `USER_LIMIT`, `CONNECTIONS_LIMIT` e `npm_package_version="1.0.0"`.
5. `backend/`: `npm install --force`, `npm run build`, `npx sequelize db:migrate`,
   `npx sequelize db:seed:all` e `pm2 start dist/server.js`.
6. `frontend/`: `.env` com `REACT_APP_BACKEND_URL`, build, um `server.js` (Express,
   CommonJS) que serve `build/` e `pm2 start server.js`.
7. Vhosts do Nginx para os dois domínios (proxy para `127.0.0.1:<porta>`, com WebSocket)
   e `certbot --nginx` com o e-mail fixo `deploy@deploy.com`.

## Por que ele não instala o Comenta 1.0

O instalador espera um repositório com as pastas `backend/` (Express + Sequelize) e
`frontend/` (React com variáveis `REACT_APP_*`). O Comenta 1.0 é outro sistema:

1. **Pastas.** Os apps estão em `saas/api`, `saas/web` e `site`; não existem `backend/`
   nem `frontend/`, então os `cd` falham e o resto dos passos roda no lugar errado.
2. **Build da API.** A `saas/api` compila com `tsc -p tsconfig.build.json` e precisa do
   `@comenta/shared` compilado antes (`npm run build -w @comenta/shared`); o instalador
   não faz isso nem instala o workspace pela raiz.
3. **Migrações.** Não há Sequelize. O esquema é aplicado com `drizzle-kit push`.
4. **Seed.** O seed real é `npm run db:seed` (`tsx src/db/seed.ts`), não
   `sequelize db:seed:all`.
5. **Ponto de entrada.** O build gera `dist/index.js`, e a produção roda
   `npx tsx src/index.ts`; não existe `dist/server.js`.
6. **Variáveis de ambiente.** A API lê `DATABASE_URL`, `REDIS_URL`, `API_URL`, `APP_URL`
   e `CORS_ORIGINS` e não carrega arquivo `.env`. Com o instalador ela subiria com os
   valores padrão de desenvolvimento (inclusive o `JWT_SECRET` de exemplo).
7. **`NODE_ENV`.** O instalador grava `NODE_ENV=` vazio; a API só aceita `development`,
   `test` ou `production`. Sob o PM2 ela rodaria como `development`, e o seed criaria o
   usuário de demonstração.
8. **Limites.** `USER_LIMIT` e `CONNECTIONS_LIMIT` não são lidos; a API limita usuários
   pelo plano gravado no banco.
9. **Painel.** A `saas/web` usa Vite e lê `VITE_API_URL` no build, não
   `REACT_APP_BACKEND_URL`.
10. **Servidor do painel.** O `server.js` gerado usa `require("express")` e serve
    `build/`; a `saas/web` é ESM, não tem Express e gera `dist/`.
11. **Node.** O instalador põe Node 20; o monorepo exige Node 22 ou mais novo.
12. **WhatsApp.** A API usa Baileys (sem navegador) e grava as sessões em
    `WHATSAPP_DATA_DIR` (padrão `/data/wa`); o instalador instala dependências do
    Puppeteer, que não são usadas, e não cria essa pasta.
13. **Site.** O site institucional (Next.js, `site/`) não é tratado: sem build, PM2 nem
    vhost.
14. **Porta.** A porta escrita no `.env` não é lida; todas as instâncias tentariam
    usar a 4000, enquanto o Nginx aponta para a porta informada.

O README antigo desta pasta mostrava variáveis `GERENCIANET_*` e `MAIL_*`. O instalador
não as grava, e a API do Comenta 1.0 não tem integração com Gerencianet/Efí.

## Quando ainda pode servir

- Para quem mantém uma instalação própria de **Whaticket/Atendechat** (repositório com
  `backend/` e `frontend/` nos moldes originais) e quer o mesmo fluxo de instâncias com
  PM2, Nginx e Certbot.
- Como referência das etapas de servidor (Nginx, Certbot, Redis em Docker) caso alguém
  monte um instalador sem Docker para o Comenta no futuro.

Mesmo nesses casos, revise antes de rodar: a lista de pacotes do Puppeteer inclui pacotes
que não existem nas versões recentes do Ubuntu (por exemplo `libappindicator1` e
`libgconf-2-4`), e o script não foi testado em Ubuntu 22.04/24.04.

## Como usar (base Whaticket/Atendechat)

No servidor, como root (os scripts gravam o arquivo `config` como root, com `chmod 700`,
e depois o leem):

```bash
chmod +x install_primaria install_instancia   # se o clone não trouxer a permissão
sudo ./install_primaria     # servidor novo
sudo ./install_instancia    # instância adicional
```

## Instalar o Comenta 1.0

Use o `deploy/bootstrap.sh` na raiz do monorepo. Ele sobe site, painel, API, Postgres e
Redis em Docker e publica tudo pelo Nginx do host com HTTPS. As instruções de uso e as
variáveis (`DOMAIN`, `BRANCH`, `EMAIL`, `SKIP_SSL` etc.) estão no cabeçalho do script.

## Origem e licença

O código deste instalador vem do instalador do **Atendechat** (base Whaticket), com
ajustes de textos e correções pontuais feitos no projeto Comenta. O arquivo `LICENSE` que
veio com o código é a WTFPL versão 2 (copyright riservato.xyz). O README original do
Atendechat dizia "todos os direitos reservados" ao Atendechat; confirme os termos com a
origem antes de redistribuir.
