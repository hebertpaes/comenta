# Comenta — SaaS de Atendimento Multicanal

Sistema **Comenta** criado do zero: plataforma SaaS, multi-tenant, de atendimento
via WhatsApp e outros canais, com **IA (Claude)** integrada. Para publicação em
**comenta.com.br**.

```
saas/
├── api/      # Backend — Node 22 + TypeScript + Fastify + PostgreSQL + Redis + Socket.IO
├── web/      # Painel — React + Vite (em construção)
└── deploy/   # docker-compose de produção + Nginx/SSL para comenta.com.br
```

## O que já está pronto e testado

- **API completa** (`saas/api`) com auth JWT + API keys, multi-tenant com planos
  e limites, contatos, conversas/mensagens em tempo real, métricas de dashboard,
  webhooks assinados (HMAC) com retry, auditoria, rate limiting, OpenAPI em
  `/docs`. **13/13 testes de fumaça passando.**
- **Integração Claude** (`saas/api/src/lib/ai.ts`): classificação, resumo e
  sugestão de resposta de conversas — modelos configuráveis, custo baixo por
  padrão (Haiku 4.5 / Sonnet 5). Ver `saas/api/README.md`.
- **Deploy** (`deploy/`, na raiz): um único `docker-compose.yml` com todos os
  serviços do produto, `nginx/` e o `bootstrap.sh` de instalação. O
  `saas/deploy/` foi removido — era um subconjunto deste.

## Arquitetura

| Domínio             | Subdomínio           | Serviço               |
| ------------------- | -------------------- | --------------------- |
| Painel do atendente | `app.comenta.com.br` | React/Vite (estático) |
| API + tempo real    | `api.comenta.com.br` | Fastify + Socket.IO   |
| Banco               | interno              | PostgreSQL 16         |
| Filas / cache       | interno              | Redis 7 + BullMQ      |

## Publicando em comenta.com.br

O passo a passo completo mora em [`deploy/RUNBOOK.md`](../deploy/RUNBOOK.md) —
inclusive o `bootstrap.sh`, que instala tudo com um comando. Para publicar na
Azure em vez de num VPS, veja [`deploy/azure/`](../deploy/azure/README.md).

## Próximos passos

- Concluir o painel React (`saas/web`).
- Adaptador WhatsApp real (Baileys) plugado no registro de canais.
- Cobrança/assinatura dos planos (Stripe/Gerencianet).
