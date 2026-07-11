# Comenta — monorepo

Plataforma **Comenta**: atendimento multicanal com **IA (Claude)**, mais o site
institucional e ferramentas auxiliares — tudo em um repositório só.

## Estrutura

```
comenta/
├─ site/               # Landing do Comenta (Next.js) + chat de atendimento
├─ saas/api/           # API (Fastify + Postgres/Drizzle + Redis/BullMQ + Socket.IO)
├─ saas/web/           # Painel (React + Vite)
├─ deploy/             # Deploy unificado (Docker Compose + Nginx + bootstrap)
├─ projects/comenta/   # Análise + instalador white-label
├─ docs/editor.md      # Editor de vídeo/música (FFmpeg.wasm) — na raiz
└─ (raiz)              # Editor de vídeo (React + Vite)
```

| Produto | Pasta | Domínio | Descrição |
|---|---|---|---|
| Site + chat | `site/` | `comenta.com.br` | Landing e assistente de atendimento (IA + humano, filas, WhatsApp) |
| API | `saas/api/` | `api.comenta.com.br` | Backend multi-tenant com IA Claude, tempo real e webhooks |
| Painel | `saas/web/` | `app.comenta.com.br` | Interface de atendimento estilo WhatsApp |
| Blog / CMS | Ghost (deploy) | `blog.comenta.com.br` | Blog/novidades/newsletter (Ghost 5 + MySQL) |
| Editor de vídeo | raiz | — | Edição no navegador com FFmpeg.wasm ([docs](docs/editor.md)) |

## Desenvolvimento

```bash
# Site
cd site && npm ci && npm run dev            # http://localhost:3000

# API (precisa de Postgres + Redis; use o compose do deploy)
cd saas/api && npm ci && npm run dev         # http://localhost:4000

# Painel
cd saas/web && npm ci && npm run dev         # http://localhost:5173

# Editor de vídeo (raiz)
npm ci && npm run dev
```

## Publicar em produção (VPS)

Tudo sob `comenta.com.br` com um comando (Docker + Nginx + SSL). Veja
[`deploy/RUNBOOK.md`](deploy/RUNBOOK.md):

```bash
curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/<branch>/deploy/bootstrap.sh \
  | sudo DOMAIN=comenta.com.br [email protected] bash
```

## Qualidade e segurança

- **CI** (`.github/workflows/ci.yml`): build do site, painel e editor + typecheck da API a cada push/PR.
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
