# Codex Task — Comenta pós-1.0

## Objetivo

Levar o **Comenta 1.0** (o que está hoje em `saas/api`, `saas/web` e `site`) a
um produto que possa ser aberto para clientes: primeiro fechar as falhas de
segurança, depois completar as lacunas reais da 1.0. O estado de cada área está
no [`README.md`](../README.md); esta tarefa parte dele.

Regras para quem implementar:

- Não reescrever a base: a API é Fastify 5 + Drizzle + PostgreSQL + Redis/BullMQ
  - Socket.IO; o painel é React 19 + Vite 8; o site é Next 16. Não trazer
    Express, Sequelize nem o instalador legado de `projects/comenta/instalador/`.
- Instalação e deploy continuam em `deploy/` (`bootstrap.sh` +
  `docker-compose.yml`).
- Cada item entra com teste (Vitest) e com a documentação do `README.md`
  atualizada: o que passar a funcionar sai de "Não entrega".
- Nenhuma credencial no código; segredos só por variável de ambiente.

## Segurança — corrigir antes de abrir para clientes

Prioridade máxima. Cada item cita o arquivo onde o problema está.

| #   | Problema                                                                                                                                                                                                                                                                                                                                                                                                                                           | Onde                                                                                                                            | O que fazer                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `POST /auth/google` não verifica token do Google: entrega access e refresh token de qualquer e-mail informado, inclusive admin, e cria um admin na primeira empresa para e-mail novo.                                                                                                                                                                                                                                                              | `saas/api/src/modules/auth.ts` (rota `/auth/google`)                                                                            | Remover a rota ou validar o ID token do Google (assinatura, `aud`, `iss`, `email_verified`) e não criar admin.                                                                |
| 2   | `/flowbuilder` e `/ghost/*` não exigem autenticação.                                                                                                                                                                                                                                                                                                                                                                                               | `saas/api/src/modules/flowbuilder.ts`, `saas/api/src/modules/ghost.ts`                                                          | Exigir `authenticate` (e filtrar por empresa) ou remover as rotas, que hoje só devolvem dados fixos.                                                                          |
| 3   | Webhook Kiwify aceita qualquer requisição, de qualquer método, sem assinatura.                                                                                                                                                                                                                                                                                                                                                                     | `saas/api/src/modules/kiwify.ts` (`app.all("/webhooks/kiwify")`)                                                                | Só `POST`, com validação da assinatura/token da Kiwify por variável de ambiente; 401 sem ela.                                                                                 |
| 4   | O webhook ABACS manda ao aluno, pelo WhatsApp, o próprio token secreto da integração.                                                                                                                                                                                                                                                                                                                                                              | `saas/api/src/modules/abacs.ts` (mensagem de boas-vindas)                                                                       | Tirar o token da mensagem; trocar o token em uso.                                                                                                                             |
| 5   | SSRF: `POST /ai/providers/test` aceita `baseUrl` arbitrário (Ollama) e o servidor faz `fetch` nele; qualquer usuário logado chama.                                                                                                                                                                                                                                                                                                                 | `saas/api/src/lib/ai-gateway.ts` (provedor `ollama`), `saas/api/src/modules/ai-providers.ts`                                    | Ignorar `baseUrl` do corpo (usar só `OLLAMA_BASE_URL`), exigir admin, ou remover a rota.                                                                                      |
| 6   | `GET /settings` devolve `companies.settings` inteiro a qualquer atendente, inclusive `abacsToken`, `paymentApiKey`, `accessTokenCard` e `publicKey`.                                                                                                                                                                                                                                                                                               | `saas/api/src/modules/settings.ts`, `saas/api/src/modules/abacs.ts`                                                             | Devolver só os campos públicos (ex.: `widgetKnowledge`); segredos fora do JSON de settings ou mascarados.                                                                     |
| 7   | Furos entre empresas (multi-tenant): `/abacs/config` lê e grava na primeira empresa do banco; Hotmart, Kiwify e ABACS gravam sempre na primeira empresa e procuram contato em todos os tenants; `POST /courses/generate-video` não filtra empresa; `POST /conversations/:id/notes` não confere a empresa; `PATCH /conversations/:id`, `PUT /queues/:id/members` e `PUT /conversations/:id/tags` aceitam usuário, fila e etiqueta de outra empresa. | `saas/api/src/modules/abacs.ts`, `hotmart.ts`, `kiwify.ts`, `video-generator.ts`, `toolkit.ts`, `conversations.ts`, `queues.ts` | Filtrar tudo por `req.principal.companyId`; webhooks de entrada identificam a empresa (token por empresa na URL ou no corpo). Testes em `saas/api/test/multi-tenant.test.ts`. |
| 8   | Senhas padrão no código: `comenta123` (seed e `reset-admin`) e `agente123` (atendentes); `reset-admin` imprime a senha; `DATABASE_URL` e `REDIS_URL` têm `comenta123` como padrão.                                                                                                                                                                                                                                                                 | `saas/api/src/db/seed.ts`, `saas/api/src/db/reset-admin.ts`, `saas/api/src/config.ts`                                           | Exigir senha por variável (sem padrão) fora de desenvolvimento; não imprimir senha.                                                                                           |
| 9   | `mustChangePassword` não é imposto no servidor: só o painel obriga a troca.                                                                                                                                                                                                                                                                                                                                                                        | `saas/api/src/modules/auth.ts`, `saas/api/src/lib/http.ts`                                                                      | Bloquear as rotas (menos `/auth/change-password`, `/auth/me`, `/auth/logout`) enquanto o flag estiver ligado.                                                                 |
| 10  | Refresh token sem detecção de reuso; `/auth/logout` sem autenticação; `JWT_REFRESH_SECRET` não é usado.                                                                                                                                                                                                                                                                                                                                            | `saas/api/src/lib/auth.ts`, `saas/api/src/config.ts`                                                                            | Detectar reuso (revogar a família de tokens); tirar `JWT_REFRESH_SECRET` da doc ou usá-lo.                                                                                    |
| 11  | Rate limit sem `trustProxy`: atrás do Nginx todos os clientes dividem o contador do IP do proxy.                                                                                                                                                                                                                                                                                                                                                   | `saas/api/src/index.ts`                                                                                                         | Configurar `trustProxy` para o proxy do deploy.                                                                                                                               |
| 12  | Tokens do painel no `localStorage`, expostos a qualquer XSS.                                                                                                                                                                                                                                                                                                                                                                                       | `saas/web/src/lib/tokens.ts`                                                                                                    | Avaliar refresh em cookie `HttpOnly`; no mínimo, CSP rígida no painel.                                                                                                        |
| 13  | "Sincronizar agenda" sem Contact Picker grava contatos fictícios no banco real.                                                                                                                                                                                                                                                                                                                                                                    | `saas/web/src/features/contacts/ContactsPage.tsx`                                                                               | Remover a simulação; mostrar que o navegador não suporta.                                                                                                                     |
| 14  | `/ai/sync-training` grava texto fictício em `widgetKnowledge` (a base que a IA do chat do site usa para responder visitantes); `/courses/generate-video` e `/courses/generate-full-course` gravam aulas e cursos de exemplo com vídeo fixo.                                                                                                                                                                                                        | `saas/api/src/modules/ai-training.ts`, `saas/api/src/modules/video-generator.ts`                                                | Remover ou exigir confirmação; nunca gravar texto fictício na base real.                                                                                                      |

Também: trocar o hottok da Hotmart e o token da ABACS que já estiveram expostos
no repositório, e conferir com `scripts/verificar-segredos.py` antes de cada push.

## Lacunas da 1.0 a completar

### 1. Tempo real no painel

- A API já emite `message.created`, `conversation.created`,
  `conversation.updated` e outros por sala de empresa
  (`saas/api/src/realtime.ts`), mas o painel não tem `socket.io-client`.
- Fazer: cliente Socket.IO em `saas/web` com o JWT no handshake, invalidando as
  queries do TanStack Query em Conversas, Kanban e Dashboard; reconexão ao
  renovar o token; paginação de conversas (hoje só as 20 primeiras).
- Para mais de uma réplica da API: adapter Redis no Socket.IO.

### 2. Mídia e áudio

- Hoje o atendente só envia texto (o "anexo" cola a URL no texto) e o inbound
  descarta áudio, documento, figurinha e anexos da Meta.
- O envio de imagem e documento por URL já existe no WhatsApp (usado só pelas
  campanhas, `sendToContact` com `media`).
- Fazer: upload de arquivo na API (com limite de tamanho e tipo), expor esse
  envio ao atendente, áudio, envio de mídia pela Meta, e gravar e exibir a
  mídia recebida (`messages.mediaUrl`).

### 3. Status de entrega e leitura

- `messages.status` nunca vira `delivered`, `read` ou `failed`; o erro de
  `sendToContact` é engolido; campanhas marcam "enviado" sem entrega.
- Fazer: tratar os recibos do Baileys e os eventos de entrega da Meta, gravar
  falhas, refletir no painel (tirar o "✓✓" fixo) e nas campanhas.
- Enviar pela conexão que recebeu a conversa, não pela primeira sessão
  conectada da empresa; não duplicar a resposta de Instagram/Messenger no
  WhatsApp; respostas automáticas também nos canais da Meta.

### 4. Telegram e e-mail

- Hoje só aparecem no catálogo e "conectar" grava `configured`.
- Fazer: adaptador Telegram (Bot API) e e-mail (IMAP/SMTP), registrados em
  `saas/api/src/channels/registry.ts`, ou tirá-los do catálogo e do site.

### 5. YouTube e X

- Os adaptadores existem (`saas/api/src/channels/youtube.ts`, `x.ts`), mas
  `startSocialPolling` nunca é chamado e os tipos não estão no catálogo da API.
- Fazer: ligar no boot, incluir no `CHANNEL_CATALOG` da API e registrar o driver
  de saída; alinhar com `packages/shared`, que hoje os marca como reais.

### 6. Limites de plano

- Aplicar `maxChannels` (criação de conexões) e `maxMonthlyMessages`; aplicar
  `maxContacts` também em `/contacts/import`.

### 7. Pagamentos

- Não há integração de pagamento nenhuma. Escolher o gateway (decisão do dono),
  implementar assinatura, webhook de pagamento validado e troca de plano.
- Na 1.0, `/loja` e os campos de pagamento das Configurações já avisam que são
  demonstração; manter o aviso até haver cobrança real.

### 8. Migrações versionadas

- Hoje o container roda `drizzle-kit push --force` a cada boot, o que pode
  apagar colunas renomeadas.
- Fazer: `drizzle-kit generate` com a pasta `saas/api/drizzle/` versionada,
  `drizzle-kit migrate` no deploy, e a primeira migração igual ao schema atual.

### 9. Testes do site e do editor

- `site`, `apps/editor` e `packages/shared` não têm testes.
- Fazer: Vitest para `site/app/lib/plans.ts` e os formulários, para
  `apps/editor/src/buildArgs.js` (inclusive vídeo sem áudio) e para os schemas
  de `packages/shared`; um E2E mínimo (login → conversa → resposta).

### 10. CI verde

- `.github/workflows/ci.yml` falha no lint por erros em `content/` (outro
  projeto, no mesmo workspace), e os passos seguintes nem rodam.
- Fazer: ignorar `content/` no eslint e no prettier da raiz (ou corrigir os
  erros), conferir que typecheck, testes (com Postgres e Redis) e build passam;
  levar `.github/workflows/deploy.yml` para a `main` só depois do CI verde.

### 11. Telas de demonstração

- ERP/CRM, FlowBuilder, Permissões, Agentes IA & Mídia, gerador de vídeo,
  `/ai/sync-training`, `/ai/github-train`, `/ghost`, `/loja`, `/agentes`,
  `/preview` respondem com dados fixos.
- Na 1.0 essas telas já trazem aviso de demonstração. Fazer, tela a tela:
  ligar à API que já existe (ERP, menu do WhatsApp, permissões) ou remover a
  tela.

## Critérios de aceite

- Todos os itens da seção de segurança fechados, com teste que falharia antes.
- `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` verdes no CI,
  com os testes de integração rodando contra Postgres.
- Instalação limpa numa VPS Ubuntu com `deploy/bootstrap.sh`, painel e API em
  HTTPS com certificado válido.
- Uma conexão WhatsApp real (QR → conectada → mensagem recebida aparece no
  painel sem recarregar → resposta entregue com status).
- `README.md` atualizado: nada descrito como "funciona" sem código que faça.

## Fora de escopo

- Instalador Bash legado (`projects/comenta/instalador/`).
- App iOS além do protótipo atual.
- Ferramentas opcionais do compose (n8n, Metabase, NocoDB).
