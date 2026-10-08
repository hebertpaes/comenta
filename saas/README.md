# Comenta 1.0 — SaaS de atendimento multicanal

API e painel do **Comenta 1.0** (versão 1.0.0): plataforma multi-tenant de
atendimento por WhatsApp, Instagram Direct, Facebook Messenger e chat do site,
com IA opcional (Claude ou Gemini). O domínio padrão do deploy é
`intsoft.com.br` (`app.` para o painel, `api.` para a API); `comenta.com.br`
pode ser usado passando outro `DOMAIN` ao bootstrap.

```
saas/
├── api/      # Backend — Node 22 + TypeScript + Fastify 5 + PostgreSQL + Redis/BullMQ + Socket.IO
└── web/      # Painel do atendente — React 19 + Vite, PWA instalável
```

O deploy fica em [`deploy/`](../deploy/), na raiz do monorepo (a antiga pasta
`saas/deploy/` foi removida).

## O que a 1.0 entrega

- **API** (`saas/api`): login JWT com refresh rotativo, API keys, papéis
  `admin`/`agent`/`api`, empresas isoladas por `companyId`, limites de plano
  para usuários e contatos, contatos (com importação), conversas e mensagens,
  filas com horário, tags, notas internas, respostas rápidas, automações
  (boas-vindas, fora do horário, palavra-chave, IA, avaliação/NPS), campanhas
  com agendamento e proteção anti-bloqueio, chat interno da equipe, cursos,
  webhooks de saída assinados (HMAC) com retry em BullMQ, Socket.IO, rate limit
  e OpenAPI em `/docs` (só os caminhos, sem schemas). Detalhes e lista de rotas
  em [`api/README.md`](api/README.md).
- **Canais**: WhatsApp por **Baileys** (WhatsApp Web, não oficial, pareado por
  QR, várias conexões por empresa, já implementado em
  `api/src/channels/whatsapp.ts`); Instagram Direct e Messenger pela Graph API
  da Meta (só texto); chat do site (widget público).
- **IA** (`api/src/lib/ai.ts`): classificar, resumir e sugerir resposta,
  autoatendimento com passagem para humano e assistente do chat do site. Usa
  Claude se houver `ANTHROPIC_API_KEY` válida, senão Gemini
  (`GEMINI_API_KEY`/`GOOGLE_AI_API_KEY`). Sem chave, as rotas de IA respondem 503. Os modelos padrão **no código** são `gemini-2.0-flash` (e
  `gemini-1.5-flash` no chat do site); os `.env.example` e o compose definem
  modelos Claude (`claude-haiku-4-5`, `claude-sonnet-5`) para quem usa a
  Anthropic.
- **Painel** (`saas/web`): conversas estilo WhatsApp, Kanban por status,
  contatos, campanhas, filas e membros, tags, respostas rápidas, automações,
  avaliações, chat da equipe, conexões (QR do WhatsApp), chaves de API,
  webhooks, cursos e base de conhecimento do chat do site.

## O que é demonstração na 1.0

Telas e rotas que respondem com dados fixos ou simulados, sem efeito real:
Agentes IA & Mídia, CRM & ERP, FlowBuilder, Permissões, parte do Dashboard
(dois indicadores sem fonte de dados e o filtro de período), parte das Configurações (só a
base de conhecimento salva), gerador de vídeo e de curso, "treino" de IA, rotas
`/ghost/*` e `/flowbuilder`, e o modo `WHATSAPP_MODE=demo` (QR e conexão
simulados). Lista completa no [`CHANGELOG.md`](../CHANGELOG.md).

## Testes

- **API**: 9 arquivos e 71 testes Vitest em `api/test` (`cd saas/api && npx vitest run`).
  22 deles (auth, automations e multi-tenant) precisam de um Postgres de teste
  em `TEST_DATABASE_URL` (há um `api/test/docker-compose.test.yml`) e são
  pulados sem ele. Há também `api/test/smoke.sh` (`npm run smoke`), que faz
  chamadas `curl` contra uma API rodando.
- **Painel**: 3 arquivos e 14 testes Vitest (`cd saas/web && npx vitest run`).

## Arquitetura

| Parte               | Endereço padrão      | Serviço                        |
| ------------------- | -------------------- | ------------------------------ |
| Painel do atendente | `app.intsoft.com.br` | React/Vite (estático no nginx) |
| API + tempo real    | `api.intsoft.com.br` | Fastify + Socket.IO            |
| Banco               | interno              | PostgreSQL 16                  |
| Filas / cache       | interno              | Redis 7 + BullMQ               |

O painel ainda não consome o Socket.IO: as conversas atualizam ao voltar o foco
à janela, e algumas telas (equipe, conexões, campanhas, dashboard) fazem polling.

## Publicando

O deploy é manual, pelo `bootstrap.sh`. Passo a passo em
[`deploy/RUNBOOK.md`](../deploy/RUNBOOK.md). Para a Azure (só API e painel),
veja [`deploy/azure/`](../deploy/azure/README.md).

## Próximos passos

- Tempo real no painel (cliente Socket.IO) e paginação de conversas.
- Roteamento por fila nas mensagens de WhatsApp/Meta e atendente vendo só as
  suas filas.
- Respostas automáticas também no Instagram/Messenger; mídia recebida e envio
  de arquivo pelo atendente.
- Corrigir as falhas de segurança conhecidas (ver
  [`api/README.md`](api/README.md#segurança-conhecida)).
- Ligar as telas de demonstração à API ou retirá-las.
- Cobrança/assinatura dos planos (hoje não existe integração de pagamento).
