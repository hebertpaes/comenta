# Comenta 1.0 — API

API de atendimento multicanal e multi-tenant do **Comenta 1.0** (versão 1.0.0).
Node.js 22 + TypeScript + Fastify 5 + PostgreSQL (Drizzle ORM) + Redis/BullMQ +
Socket.IO. Swagger UI em `/docs` (lista os caminhos, mas nenhuma rota declara
schema: corpo, resposta e segurança não aparecem lá).

Este README descreve o que o código faz hoje. Partes que só simulam estão
marcadas como demonstração.

## Recursos

- **Multi-tenant** por empresa (`companyId` vem do JWT ou da API key) e
  **planos**. Os limites aplicados são só os de **usuários** (`POST /users`
  responde 402) e de **contatos** (`POST /contacts` responde 402; a importação
  em lote não confere). `maxChannels` e `maxMonthlyMessages` existem no schema,
  mas nada os confere.
- **Autenticação**: JWT de acesso (15 min) e refresh token opaco com rotação
  (30 dias) para o painel; **API keys** (`X-API-Key`, formato `cmta_…`) para
  integrações.
- **Papéis**: `admin`, `agent` e `api` (a API key, tratada como admin pelas
  rotas restritas). Não há outro controle de acesso: as permissões
  customizadas de `/permissions` são gravadas, mas não aplicadas.
- **Conversas e mensagens** com atribuição, status, fila, tempo de primeira
  resposta, notas, tags e métricas de dashboard.
- **Webhooks de saída** assinados com **HMAC-SHA256** e entregues com retry
  (BullMQ, 5 tentativas).
- **Tempo real** via Socket.IO (uma sala por empresa, autenticação por JWT). O
  painel ainda não consome esses eventos.
- **IA opcional** (Claude ou Gemini): ver abaixo.
- **Auditoria** (gravada em `audit_logs`, sem rota de consulta), rate limit
  (300/min no Redis; 10/min no signup e 20/min no login), `/health` e `/ready`.

## Rodando localmente

A API lê só as variáveis do ambiente do processo: ela **não carrega** um
arquivo `.env` sozinha. Exporte as variáveis antes de rodar:

```bash
cp .env.example .env              # ajuste DATABASE_URL, REDIS_URL, segredos e chaves de IA
set -a && . ./.env && set +a      # exporta o .env para este shell
npm run db:push                   # aplica o schema (drizzle-kit push; não há migrações versionadas)
npm run db:seed                   # planos + empresa e usuários de demonstração
npm run dev                       # http://localhost:4000  (Swagger em /docs)
```

O seed cria a empresa "Comenta Demo" com `admin@comenta.com.br`, senha
`SEED_ADMIN_PASSWORD` (padrão `comenta123`), e 7 atendentes de exemplo. Com
`NODE_ENV=production` ele cria só os planos, a não ser que `SEED_DEMO=true`. O
admin de demonstração nasce com troca de senha obrigatória: o painel força a
troca, mas o servidor não bloqueia quem não trocou.

Testes: `npx vitest run` (9 arquivos, 71 testes; 22 precisam de
`TEST_DATABASE_URL` apontando para um Postgres de teste — veja
`test/docker-compose.test.yml`). Teste de fumaça contra a API rodando:
`npm run smoke`.

## IA (Claude ou Gemini)

A escolha é feita a cada chamada, em `src/lib/ai.ts`:

1. **Claude**, se `ANTHROPIC_API_KEY` começa com `sk-ant-` e tem 40 caracteres
   ou mais. Usa o modelo da variável da tarefa (`AI_MODEL_*`).
2. **Gemini**, por REST, se houver `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY` ou
   `GOOGLE_API_KEY`. Usa só `GOOGLE_AI_MODEL` (padrão `gemini-2.0-flash`) e
   ignora as `AI_MODEL_*`.
3. Se o Gemini falha por erro de rede, a função devolve uma **resposta simulada
   fixa**, sem avisar.

Sem chave válida, `/health` mostra `ai: false` e as rotas de IA respondem
**503** (a mensagem pede `ANTHROPIC_API_KEY` (Claude) ou `GEMINI_API_KEY`
(Gemini)). Requisições
únicas, sem streaming.

| Uso                                           | Variável do modelo   | Padrão no código   |
| --------------------------------------------- | -------------------- | ------------------ |
| `POST /conversations/:id/ai/classify`         | `AI_MODEL_CLASSIFY`  | `gemini-2.0-flash` |
| `POST /conversations/:id/ai/summary`          | `AI_MODEL_SUMMARIZE` | `gemini-2.0-flash` |
| `POST /conversations/:id/ai/suggest` (`tone`) | `AI_MODEL_SUGGEST`   | `gemini-2.0-flash` |
| Autoatendimento (automação `ai`)              | `AI_MODEL_AUTOREPLY` | `gemini-2.0-flash` |
| Chat do site (`POST /widget/ai`)              | `AI_MODEL_CHAT`      | `gemini-1.5-flash` |

Os padrões são nomes de modelos Gemini, que só servem para a Anthropic se você
definir as variáveis. `.env.example` e o compose de produção definem
`claude-haiku-4-5` (classificar, resumir) e `claude-sonnet-5` (sugerir; no
compose, também o chat). **Com chave Anthropic, defina todas as `AI_MODEL_*`**:
sem `AI_MODEL_AUTOREPLY`, o autoatendimento manda `gemini-2.0-flash` à
Anthropic e falha.

A classificação **não** usa structured outputs: o JSON é extraído do texto da
resposta com parsing tolerante.

## Canais

| Canal                        | Situação na 1.0                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WhatsApp                     | Real, por **Baileys** (WhatsApp Web, não oficial): QR, várias conexões por empresa, sessão em `WHATSAPP_DATA_DIR`, restaurada no boot. Recebe só texto/legenda; envia texto, imagem e documento pela primeira sessão conectada da empresa. |
| WhatsApp (modo demo)         | Demonstração: `WHATSAPP_MODE=demo` (ou sem a lib) gera QR falso e marca "conectado" com número fictício. Nada é enviado.                                                                                                                   |
| Instagram Direct / Messenger | Real, pela Graph API v21.0: webhook `/webhooks/meta` com HMAC, só texto (anexos ignorados), resposta dentro da janela de 24 h. Respostas automáticas do bot não saem por aqui.                                                             |
| Chat do site (widget)        | Real: rotas públicas `/widget/*`, sempre para a empresa `WIDGET_COMPANY_ID` (ou a primeira cadastrada).                                                                                                                                    |
| Telegram, E-mail             | Só no catálogo: o "conectar" grava status `configured`, sem integração.                                                                                                                                                                    |
| YouTube, X                   | Código de coleta existe em `src/channels/`, mas não está ligado (o polling nunca é iniciado e os tipos não estão no catálogo).                                                                                                             |
| `simulator`                  | Driver de desenvolvimento que não envia nada.                                                                                                                                                                                              |

A resposta do atendente vai pelo driver do canal **e** também tenta o WhatsApp
quando o contato tem telefone e há sessão conectada.

## Módulos de rota (28)

Registrados em `src/index.ts`, mais `GET /health` e `GET /ready`.

**Núcleo de atendimento**

- `auth` — `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /auth/me`; `POST /auth/google` (ver Segurança)
- `users` — `GET/POST/PATCH/DELETE /users` (escrita só admin; limite de usuários do plano)
- `contacts` — `GET/POST/PATCH/DELETE /contacts`, `POST /contacts/import`
- `conversations` — `GET /conversations`, `GET/PATCH /conversations/:id`, `POST /conversations/:id/messages`, `GET /dashboard/metrics`
- `queues` — `GET/POST/PATCH/DELETE /queues`, `PUT /queues/:id/members` (com horário por fila)
- `toolkit` — `/quick-replies`, `/tags`, `PUT /conversations/:id/tags`, `GET/POST /conversations/:id/notes`, `DELETE /notes/:id`
- `automations` — `GET/POST/PATCH/DELETE /automations` (tipos `welcome`, `business_hours`, `keyword`, `ai`, `rating`)
- `ratings` — `GET /ratings` (avaliação/NPS pedida ao resolver a conversa)
- `campaigns` — `GET/POST/DELETE /campaigns`, `GET /campaigns/:id`, `POST /campaigns/:id/send`, `/cancel`
- `team` — `GET/POST /team/messages` (chat interno)
- `settings` — `GET /settings`, `PUT /settings` (só a base de conhecimento `widgetKnowledge`)
- `courses` — cursos e aulas (`/courses`, `/courses/:id/lessons`, `/lessons/:id`)
- `ai` — `POST /conversations/:id/ai/{classify,summary,suggest}`

**Integração e canais**

- `apikeys` — `GET/POST/DELETE /api-keys` (admin; a chave aparece só na criação)
- `webhooks` — `GET/POST/DELETE /webhooks`, `GET /webhooks/:id/deliveries` (admin)
- `channels` — `GET/POST/PATCH/DELETE /channels`, `POST /channels/:id/{connect,disconnect,sync-contacts}`, `GET /channels/:id/status`
- `meta-webhooks` — `GET/POST /webhooks/meta`
- `widget` — `POST /widget/start`, `/widget/message`, `/widget/ai`, `GET /widget/messages` (públicas)

**Integrações de cursos (parciais; sempre na primeira empresa do banco)**

- `hotmart` — `POST /webhooks/hotmart` (valida `HOTMART_HOTTOK`), `POST /webhooks/hotmart/test`
- `kiwify` — `/webhooks/kiwify` (qualquer método, sem validação)
- `abacs` — webhook ABACS, `GET/POST /abacs/config`, `POST /abacs/sync-hotmart` (responde sucesso sempre)

**Demonstração (dados fixos ou gravados sem efeito)**

- `ai-training` — `/ai/sync-training`, `/ai/training-status`: acrescenta três frases fixas; não há treino
- `ai-providers` — `/ai/providers`, `/ai/providers/test`, `/ai/github-train`: lista fixa; parte dos testes é simulada; o "treino" devolve um job falso
- `permissions` — `/permissions`, `/permissions/roles`: grava cargos que nenhuma rota aplica
- `erp-crm` — `/erp/dashboard`, `/erp/transactions`, `/crm/deals`, `/whatsapp/interactive-menu`: dados de exemplo; o menu nunca é enviado
- `flowbuilder` — `/flowbuilder`: dois fluxos fixos, nada é gravado nem executado
- `video-generator` — `/courses/generate-video`, `/courses/generate-full-course`, `/courses/video-generator/templates`: roteiro e vídeo fixos, sem IA
- `ghost` — `/ghost/posts`, `/ghost/status`: posts fixos no código, não conecta a nenhum Ghost

## Webhooks

Cada webhook recebe `POST` com corpo `{"event","data","sentAt"}` e cabeçalhos
`X-Comenta-Event` e `X-Comenta-Signature: sha256=<hmac>`. Valide a assinatura
com o `secret` (exibido só na criação) sobre o corpo bruto. Eventos:
`conversation.created`, `message.created` e `conversation.updated`.

## Segurança conhecida

Falhas abertas na 1.0 (detalhes e plano de correção em
[`projects/comenta/codex/CODEX_TASK.md`](../../projects/comenta/codex/CODEX_TASK.md)):

- `POST /auth/google` não verifica token do Google: emite sessão para qualquer
  e-mail informado e cria admin na primeira empresa para e-mail novo.
- `/flowbuilder` e `/ghost/*` não exigem login; `/webhooks/kiwify` aceita
  qualquer requisição sem assinatura.
- `GET /settings` devolve todas as configurações da empresa (inclusive tokens
  gravados por `/abacs/config`) a qualquer usuário logado; o webhook ABACS
  envia o token da integração ao comprador pelo WhatsApp.
- `POST /ai/providers/test` faz `fetch` para um `baseUrl` informado pelo
  usuário (SSRF).
- Furos de isolamento entre empresas: Hotmart, Kiwify e ABACS gravam na
  primeira empresa; notas, membros de fila, tags e atribuição aceitam IDs de
  outra empresa sem conferir.
- Troca obrigatória de senha não é imposta no servidor; refresh token sem
  detecção de reuso; rate limit sem `trustProxy` (atrás do nginx, todos
  dividem o mesmo contador).
