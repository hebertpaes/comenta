# Comenta — monorepo

Plataforma **Comenta**: atendimento multicanal com **IA (Claude)**, mais o site
institucional e ferramentas auxiliares — tudo em um repositório só.

## Estrutura

Monorepo **npm workspaces**: um `package-lock.json` só, na raiz, e um `npm ci`
que instala todos os projetos de uma vez.

```
comenta/
├─ site/               # Landing do Comenta (Next.js) + chat de atendimento
├─ saas/api/           # API (Fastify + Postgres/Drizzle + Redis/BullMQ + Socket.IO)
├─ saas/web/           # Painel (React + Vite)
├─ packages/shared/    # Contratos de domínio compartilhados entre a API e o painel
├─ apps/editor/        # Editor de vídeo/música (React + Vite + FFmpeg.wasm)
├─ content/            # Robô de conteúdo do blog (curadoria → Ghost)
├─ deploy/             # Deploy unificado (Docker Compose + Nginx + bootstrap)
└─ projects/comenta/   # Análise + instalador white-label (fora dos workspaces)
```

| Produto | Pasta | Domínio | Descrição |
|---|---|---|---|
| Site + chat | `site/` | `comenta.com.br` | Landing e assistente de atendimento (IA + humano, filas, WhatsApp) |
| API | `saas/api/` | `api.comenta.com.br` | Backend multi-tenant com IA Claude, tempo real e webhooks |
| Painel | `saas/web/` | `app.comenta.com.br` | Interface de atendimento estilo WhatsApp |
| Blog / CMS | Ghost (deploy) | `blog.comenta.com.br` | Blog/novidades/newsletter (Ghost 5 + MySQL) |
| Editor de vídeo | `apps/editor/` | — | Edição no navegador com FFmpeg.wasm ([docs](apps/editor/README.md)) |

## Desenvolvimento

Instale uma vez, na raiz — o npm resolve todos os workspaces juntos:

```bash
npm ci
npm run build -w @comenta/shared   # gera os .d.ts que a API e o painel importam
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

## Publicar em produção (VPS)

Tudo sob `comenta.com.br` com um comando (Docker + Nginx + SSL). Veja
[`deploy/RUNBOOK.md`](deploy/RUNBOOK.md):

```bash
curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/<branch>/deploy/bootstrap.sh \
  | sudo DOMAIN=comenta.com.br [email protected] bash
```

## Qualidade e segurança

- **CI** (`.github/workflows/ci.yml`): `npm ci` na raiz e build de todos os workspaces a cada push/PR.
- **Headers de segurança** no site (CSP, HSTS, X-Frame-Options, etc. em `site/next.config.js`).
- **Health check** do site em `/health`.
- **Segredos** só via `.env` (nunca versionados); JWT/DB/Redis com valores aleatórios no bootstrap.
- IA com **degradação graciosa** (503) quando `ANTHROPIC_API_KEY` não está configurada.

## Configuração (variáveis principais)

| Variável | Onde | Para quê |
|---|---|---|
| `ANTHROPIC_API_KEY` | API | habilita a IA Claude (classificar/resumir/sugerir) |
| `NEXT_PUBLIC_WHATSAPP` | site | número do "Continuar no WhatsApp" |
| `NEXT_PUBLIC_NEWS_SOURCE` | site | fonte do carrossel de notícias (opcional) |
| `DB_PASSWORD` / `REDIS_PASSWORD` / `JWT_SECRET` / `JWT_REFRESH_SECRET` | deploy | infra e autenticação |

Detalhes de deploy e todas as variáveis em [`deploy/.env.example`](deploy/.env.example).
