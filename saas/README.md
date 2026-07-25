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
- **Deploy** (`saas/deploy`): `docker-compose.yml` (Postgres + Redis + API com
  migração automática) e `nginx.comenta.conf` para `app.comenta.com.br` +
  `api.comenta.com.br` com SSL via Certbot.

## Arquitetura

| Domínio             | Subdomínio           | Serviço               |
| ------------------- | -------------------- | --------------------- |
| Painel do atendente | `app.comenta.com.br` | React/Vite (estático) |
| API + tempo real    | `api.comenta.com.br` | Fastify + Socket.IO   |
| Banco               | interno              | PostgreSQL 16         |
| Filas / cache       | interno              | Redis 7 + BullMQ      |

## Publicando em comenta.com.br

1. Aponte no DNS `app.comenta.com.br` e `api.comenta.com.br` para o IP do servidor.
2. No servidor, em `saas/deploy`, crie um `.env` com `DB_PASSWORD`,
   `REDIS_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` e `ANTHROPIC_API_KEY`.
3. `docker compose up -d --build` (sobe banco, Redis e API; migra e faz seed).
4. Instale o Nginx com `nginx.comenta.conf` e rode
   `sudo certbot --nginx -d app.comenta.com.br -d api.comenta.com.br`.
5. Faça o build do painel (`saas/web`) e sirva o `dist/` em `/var/www/comenta-app`.

## Próximos passos

- Concluir o painel React (`saas/web`).
- Adaptador WhatsApp real (Baileys) plugado no registro de canais.
- Cobrança/assinatura dos planos (Stripe/Gerencianet).
