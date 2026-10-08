# Comenta 1.0 — monorepo

**Comenta 1.0** (versão 1.0.0) é uma plataforma de atendimento multicanal:
API multi-tenant, painel do atendente, site com chat e IA opcional (Claude ou
Gemini). Este documento diz o que a versão 1.0 entrega de fato, conferido no
código. O que é demonstração aparece como demonstração; o que não existe está
em "O que a 1.0 não entrega". Histórico de versões em [`CHANGELOG.md`](CHANGELOG.md).

## Estrutura

Monorepo **npm workspaces**: um `package-lock.json` só, na raiz, e um `npm ci`
que instala todos os projetos de uma vez.

```
comenta/
├─ saas/api/           # API (Fastify 5 + Postgres/Drizzle + Redis/BullMQ + Socket.IO)
├─ saas/web/           # Painel do atendente (React 19 + Vite, PWA instalável)
├─ site/               # Landing do Comenta + página IntSoft + chat do site (Next.js 16)
├─ packages/shared/    # Tipos e enums de domínio (hoje só o painel os importa)
├─ apps/editor/        # Editor de vídeo/música no navegador (FFmpeg.wasm), sem deploy
├─ apps/ios/           # App iOS em SwiftUI — protótipo, nunca rodou em aparelho
├─ deploy/             # Compose + Nginx + bootstrap.sh + azure/
├─ projects/comenta/   # Análise, tarefas e instalador herdado (fora dos workspaces)
└─ content/            # Robô de conteúdo do HOJE MT — outro projeto, não faz parte do Comenta
```

## Onde cada parte fica no ar

O domínio padrão em `deploy/docker-compose.yml`, `deploy/bootstrap.sh` e
`deploy/deploy_site.sh` é **`intsoft.com.br`**. `comenta.com.br` é só uma
possibilidade (basta passar `DOMAIN=comenta.com.br` ao bootstrap); hoje ele não
resolve (ver [`deploy/GITHUB-DEPLOY.md`](deploy/GITHUB-DEPLOY.md)).

| Parte          | Pasta          | Endereço padrão       | Situação na 1.0                                                                                                                                                                                                                        |
| -------------- | -------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site + chat    | `site/`        | `intsoft.com.br`      | Na raiz de `intsoft.com.br` aparece a página da IntSoft (rewrite em `site/next.config.js`); a landing do Comenta só aparece na raiz de outro domínio. Também `/docs`, `/recursos`, `/contato` e o chat do site (ver limitações abaixo) |
| API            | `saas/api/`    | `api.intsoft.com.br`  | Backend multi-tenant, WhatsApp (Baileys), Instagram/Messenger, webhooks, IA opcional                                                                                                                                                   |
| Painel         | `saas/web/`    | `app.intsoft.com.br`  | Atendimento, Kanban, campanhas, filas, automações, avaliações ([docs](saas/web/README.md))                                                                                                                                             |
| Blog (Ghost)   | deploy         | `blog.intsoft.com.br` | Ghost 5 + MySQL, opcional (`--profile ghost`); o site não lê o Ghost                                                                                                                                                                   |
| Editor (vídeo) | `apps/editor/` | —                     | Roda localmente (`npm run dev:editor`); nenhum serviço do deploy o publica                                                                                                                                                             |
| App iOS        | `apps/ios/`    | —                     | Protótipo: login, lista e resposta de conversas; nunca testado em aparelho ([docs](apps/ios/README.md))                                                                                                                                |

## Desenvolvimento

Instale uma vez, na raiz — o npm resolve todos os workspaces juntos:

```bash
npm ci
npm run build -w @comenta/shared   # gera os .d.ts que o painel importa
```

Depois, cada projeto:

```bash
npm run dev:site      # http://localhost:3000
npm run dev:api       # http://localhost:4000  (precisa de Postgres + Redis: use o compose do deploy)
npm run dev:web       # http://localhost:5173
npm run dev:editor
```

Comandos em todos os workspaces de uma vez: `npm run build`, `npm run typecheck`,
`npm test`.

## Publicar

**O deploy é manual**, pelo `bootstrap.sh` rodado no servidor (Docker + Nginx +
certbot). Passo a passo em [`deploy/RUNBOOK.md`](deploy/RUNBOOK.md):

```bash
curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/<branch>/deploy/bootstrap.sh \
  | sudo DOMAIN=intsoft.com.br EMAIL=voce@seudominio.com.br bash
```

O bootstrap publica `DOMAIN` e `www` (site), `app.` (painel), `api.` (API, com
WebSocket) e `blog.` (Ghost). Só o site, sem Docker, pode ser publicado com
[`deploy/deploy_site.sh`](deploy/deploy_site.sh) (PM2 + Nginx).

O workflow [`deploy.yml`](.github/workflows/deploy.yml) e o guia
[`deploy/GITHUB-DEPLOY.md`](deploy/GITHUB-DEPLOY.md) descrevem um deploy por
push na `main`, mas **esse workflow não está na `main` e nunca rodou**. Push na
`main` não publica nada hoje.

## Qualidade e segurança

- **CI** (`.github/workflows/ci.yml`), em todo push e PR: `npm ci`, build do
  `@comenta/shared`, lint (`eslint .`), formatação (`prettier --check .`),
  typecheck, testes (com Postgres 16 e Redis 7 de serviço), checagem de que os
  testes de integração não foram pulados e build de todos os workspaces.
  **Hoje o CI está vermelho**: o lint falha com erros que estão todos em
  `content/` (o robô do HOJE MT, que o eslint da raiz também cobre), e os passos
  seguintes nem chegam a rodar.
- **Testes**: API com 9 arquivos e 71 testes (22 precisam de um Postgres de
  teste em `TEST_DATABASE_URL`); painel com 3 arquivos e 14 testes. Site,
  editor e `packages/shared` não têm testes.
- **Segredos** só via `.env` (nunca versionados); o bootstrap gera senhas de
  banco/Redis e segredos JWT aleatórios. O workflow `segredos.yml` confere o
  diff de cada push.
- **Cabeçalhos de segurança** no site (CSP, HSTS, X-Frame-Options etc. em
  `site/next.config.js`) e **health check** em `/health` (site) e
  `/health` + `/ready` (API).
- **IA opcional**: com `ANTHROPIC_API_KEY` usa Claude; sem ela, usa Gemini se
  houver `GEMINI_API_KEY` ou `GOOGLE_AI_API_KEY`. Sem nenhuma chave válida, as
  rotas de IA respondem **503**.
- Falhas de segurança conhecidas na API estão listadas em
  [`saas/api/README.md`](saas/api/README.md#segurança-conhecida).

## O que a 1.0 não entrega

- Tempo real no painel: a API emite eventos por Socket.IO, mas o painel não
  tem cliente de socket; conversas e Kanban atualizam ao voltar o foco à janela.
- Chat do site funcionando em produção: o chat e o formulário de contato chamam
  a API em outra origem, e a CSP do próprio site (`connect-src 'self'`)
  bloqueia essas chamadas no navegador.
- Carrossel de notícias: o componente existe, mas nenhuma página o renderiza
  (`NEXT_PUBLIC_NEWS_SOURCE` não tem efeito visível).
- Botão "Continuar no WhatsApp": `NEXT_PUBLIC_WHATSAPP` é passado ao build, mas
  nenhum arquivo do site o lê.
- Links do site para o painel: `/entrar`, `/login`, `/painel`, `/cursos` e a
  página 404 apontam para `http://localhost:8080` (e o 404 também para
  `http://localhost:2368`), fixos no código, não para o painel publicado.
- Telegram, e-mail, YouTube e X como canais; cobrança dos planos; login Google
  verificado; permissões customizadas aplicadas; deploy do editor; app iOS
  publicado.

Lista completa, por área, no [`CHANGELOG.md`](CHANGELOG.md).

## Configuração (variáveis principais)

| Variável                                        | Onde   | Para quê                                                                                                                       |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `DOMAIN`                                        | deploy | domínio raiz; o compose monta `app.` e `api.` a partir dele (o blog usa `GHOST_URL`, que o bootstrap grava como `blog.DOMAIN`) |
| `DB_PASSWORD` / `REDIS_PASSWORD` / `JWT_SECRET` | deploy | infra e autenticação (`JWT_REFRESH_SECRET` é exigido pelo compose, mas não é usado)                                            |
| `ANTHROPIC_API_KEY`                             | API    | IA com Claude (classificar, resumir, sugerir, autoatendimento, chat do site)                                                   |
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY`          | API    | IA com Gemini, quando não há chave Anthropic (o compose de hoje não as repassa)                                                |
| `WHATSAPP_MODE`                                 | API    | `baileys` (conexão real por QR) ou `demo` (QR e conexão simulados)                                                             |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL`   | site   | endereços da API e do painel (o compose monta a partir de `DOMAIN`)                                                            |

Todas as variáveis do deploy em [`deploy/.env.example`](deploy/.env.example); as da
API em [`saas/api/.env.example`](saas/api/.env.example).
