# Comenta SaaS — API

API de atendimento multicanal, multi-tenant, do **Comenta** (comenta.com.br).
Node.js 22 + TypeScript + Fastify 5 + PostgreSQL (Drizzle ORM) + Redis/BullMQ +
Socket.IO. Documentação OpenAPI em `/docs`.

## Recursos

- **Multi-tenant** por empresa, com **planos** e limites (usuários, contatos,
  canais, mensagens/mês) aplicados nas rotas.
- **Autenticação** JWT (access + refresh com rotação) para o painel e
  **API keys** (`X-API-Key`) para integrações.
- **RBAC**: papéis `admin` e `agent`.
- **Conversas e mensagens** com atribuição, status, tempo de primeira resposta
  e métricas de dashboard.
- **Canais plugáveis** (`simulator` para dev, `whatsapp` via adaptador).
- **Webhooks** assinados com **HMAC-SHA256** e entrega com retry (BullMQ).
- **Tempo real** via Socket.IO (eventos por empresa).
- **IA (Claude/Anthropic)**: classificação, resumo e sugestão de resposta.
- **Auditoria**, rate limiting, health/readiness checks.

## Rodando localmente

```bash
cp .env.example .env      # ajuste DATABASE_URL, REDIS_URL, segredos e ANTHROPIC_API_KEY
npm install
npm run db:push           # cria as tabelas
npm run db:seed           # planos + admin de demonstração
npm run dev               # sobe em http://localhost:4000  (docs em /docs)
```

Login de demonstração criado pelo seed: `admin@comenta.com.br` / `comenta123`.

Teste de fumaça de ponta a ponta (com a API rodando):

```bash
npm run smoke
```

## Integração com a IA (Claude)

Os endpoints de IA usam a API da Anthropic. Requerem `ANTHROPIC_API_KEY` no
ambiente — sem ela respondem **503**. Requisições únicas (sem streaming).

| Endpoint | Descrição | Modelo padrão |
|---|---|---|
| `POST /conversations/:id/ai/classify` | Categoria, intenção, sentimento, urgência (JSON) | `claude-haiku-4-5` |
| `POST /conversations/:id/ai/summary` | Resumo para handoff entre atendentes | `claude-haiku-4-5` |
| `POST /conversations/:id/ai/suggest` | Sugestão de resposta pronta (corpo aceita `{"tone"}`) | `claude-sonnet-5` |

Os modelos são configuráveis por `AI_MODEL_CLASSIFY`, `AI_MODEL_SUMMARIZE` e
`AI_MODEL_SUGGEST`. Escolha de padrões: **Haiku 4.5** para classificação/resumo
(alto volume, custo baixo) e **Sonnet 5** para sugestão de resposta (voltada ao
cliente). Suba qualquer um para `claude-opus-4-8` se quiser máxima qualidade.

A classificação usa **structured outputs** (`output_config.format`) para garantir
JSON válido, com fallback de parsing tolerante a versões do SDK.

## Principais rotas

- `POST /auth/signup` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me`
- `GET/POST/PATCH /users` (admin)
- `GET/POST/PATCH/DELETE /contacts`
- `GET /conversations` · `GET /conversations/:id` · `POST /conversations/:id/messages` · `PATCH /conversations/:id`
- `GET /dashboard/metrics`
- `GET/POST/DELETE /api-keys` (admin — a chave é exibida só na criação)
- `GET/POST/DELETE /webhooks` · `GET /webhooks/:id/deliveries` (admin)
- `POST /conversations/:id/ai/{classify,summary,suggest}`
- `GET /health` · `GET /ready` · `GET /docs`

## Webhooks

Cada webhook recebe `POST` com corpo `{"event","data","sentAt"}` e cabeçalhos
`X-Comenta-Event` e `X-Comenta-Signature: sha256=<hmac>`. Valide a assinatura
com o `secret` (exibido só na criação) sobre o corpo bruto.
