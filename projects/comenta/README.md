# Comenta 1.0

**Comenta** é uma plataforma de atendimento multicanal: uma equipe de atendentes
responde, num painel web, as conversas que chegam pelo WhatsApp, pelo Instagram
Direct, pelo Facebook Messenger e pelo chat do site, com filas, etiquetas,
respostas rápidas, automações, campanhas e IA de apoio (Claude ou Gemini).

Esta é a **versão 1.0 (1.0.0)**. Este documento diz só o que o código entrega
hoje. O que é demonstração está marcado como demonstração, e o que não existe
está em "Não entrega na 1.0". O levantamento foi feito lendo o código de
`saas/api`, `saas/web`, `site`, `packages/shared`, `apps/` e `deploy/`.

> **Antes de abrir para clientes:** a 1.0 tem falhas de segurança conhecidas
> (login "Google" sem verificação, rotas sem autenticação, webhook sem
> assinatura, entre outras). A lista completa e o que fazer estão em
> [`codex/CODEX_TASK.md`](codex/CODEX_TASK.md), seção "Segurança — corrigir
> antes de abrir para clientes". Use a 1.0 com uma empresa só, em ambiente
> controlado, até corrigir esses pontos.

## Conteúdo desta pasta

| Arquivo                 | O que é                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `README.md`             | Este arquivo: o que a 1.0 entrega, arquitetura e instalação.                                 |
| `BRIEF_DEMANDA.md`      | Objetivo do produto, estado da 1.0, o que ficou de fora e próximos passos.                   |
| `codex/CODEX_TASK.md`   | Tarefa do pós-1.0: lacunas reais e correções de segurança.                                   |
| `ANALISE_INSTALADOR.md` | Análise do instalador herdado do Atendechat e por que ele não instala a 1.0.                 |
| `instalador/`           | **Legado.** Instalador Bash do Atendechat/Whaticket. **Não instala o Comenta 1.0** (abaixo). |

## O que a 1.0 entrega

Legenda: **funciona** = faz o que promete, com dados reais; **parcial** =
funciona com limitações importantes; **demonstração** = a tela ou a rota existe,
mas responde com dados fixos ou simulados; **protótipo** = código inicial que
nunca foi testado em uso real; **inseguro** = não usar até a correção; **não
existe** = não há código que faça isso.

### Atendimento (API `saas/api` + painel `saas/web`)

| Área                                       | Situação     | O que acontece de verdade                                                                                                                                                                                                 | Código                                                                                             |
| ------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Cadastro de empresa, login e sessão        | funciona     | Signup cria empresa e admin; login por e-mail e senha; JWT de 15 min e refresh de 30 dias com rotação; troca de senha.                                                                                                    | `saas/api/src/modules/auth.ts`, `saas/api/src/lib/auth.ts`, `saas/web/src/auth/`                   |
| Login "Google" (`POST /auth/google`)       | **inseguro** | Não verifica token do Google: entrega a sessão de qualquer e-mail informado. O painel não usa essa rota. Não usar.                                                                                                        | `saas/api/src/modules/auth.ts`                                                                     |
| Usuários e papéis                          | funciona     | CRUD de usuários; papéis admin e atendente. Chave de API vale como admin.                                                                                                                                                 | `saas/api/src/modules/users.ts`, `saas/api/src/lib/http.ts`                                        |
| Permissões customizáveis (RBAC)            | demonstração | A tela não chama a API: os cargos ficam só na memória da página e somem ao recarregar. A API grava cargos em `companies.settings`, mas nenhuma rota consulta essas permissões.                                            | `saas/web/src/features/permissions/`, `saas/api/src/modules/permissions.ts`                        |
| Conversas e mensagens                      | parcial      | Lista, abre, responde (só texto), transfere de fila, muda status, etiqueta. O painel **não recebe em tempo real**: a lista só atualiza ao voltar o foco ou depois de uma ação. Mostra só as 20 primeiras.                 | `saas/api/src/modules/conversations.ts`, `saas/web/src/features/conversations/`                    |
| Kanban                                     | funciona     | Três colunas fixas (pendente, aberta, resolvida); arrastar muda o status da conversa. Sem etapas próprias.                                                                                                                | `saas/web/src/features/kanban/`                                                                    |
| Filas, etiquetas, respostas rápidas, notas | funciona     | CRUD de filas com horário e membros, etiquetas, respostas rápidas e notas internas.                                                                                                                                       | `saas/api/src/modules/queues.ts`, `saas/api/src/modules/toolkit.ts`                                |
| Contatos                                   | parcial      | CRUD, busca, importação CSV/VCF e exportação. "Sincronizar agenda do dispositivo", sem a Contact Picker API do navegador, grava contatos de exemplo no banco.                                                             | `saas/api/src/modules/contacts.ts`, `saas/web/src/features/contacts/`                              |
| Automações                                 | funciona     | Boas-vindas, fora do horário e palavra-chave respondem sozinhas. A resposta automática sai só pelo WhatsApp.                                                                                                              | `saas/api/src/modules/automations.ts`                                                              |
| Avaliação (NPS)                            | funciona     | Pede nota ao resolver, captura a resposta e mostra métricas.                                                                                                                                                              | `saas/api/src/modules/ratings.ts`, `saas/web/src/features/ratings/`                                |
| Campanhas (disparo em massa)               | parcial      | Público: todos, por etiqueta ou contatos escolhidos; texto com imagem ou documento opcional (por URL); agendamento, pausas anti-bloqueio, progresso. Envia só pelo WhatsApp e marca "enviado" mesmo sem sessão conectada. | `saas/api/src/modules/campaigns.ts`, `saas/web/src/features/campaigns/`                            |
| Chat interno da equipe                     | funciona     | Mensagens entre atendentes, com atualização a cada 3 s. Na abertura carrega as 100 mensagens mais antigas.                                                                                                                | `saas/api/src/modules/team.ts`, `saas/web/src/features/team/`                                      |
| Dashboard                                  | parcial      | Métricas reais de conversas, mensagens, contatos, 1ª resposta e nota (atualiza a cada 15 s). "Vendas Hotmart/ABACS" e "Atendimentos por IA" não têm fonte de dados e aparecem como "—"; o filtro de período não filtra.   | `saas/api/src/modules/conversations.ts`, `saas/web/src/features/dashboard/`                        |
| Webhooks de saída e chaves de API          | funciona     | Webhooks assinados com HMAC, fila BullMQ com 5 tentativas e histórico de entregas; chaves `cmta_…`.                                                                                                                       | `saas/api/src/queues.ts`, `saas/api/src/modules/webhooks.ts`, `saas/api/src/modules/apikeys.ts`    |
| Limites de plano                           | parcial      | Só usuários e contatos são limitados. Canais e mensagens por mês não são conferidos; a importação de contatos ignora o limite.                                                                                            | `saas/api/src/modules/users.ts`, `saas/api/src/modules/contacts.ts`                                |
| Configurações                              | parcial      | Só a "Base de conhecimento" do chat do site é salva. Campos de ABACS, Hotmart e pagamento na tela são de exemplo e não salvam.                                                                                            | `saas/api/src/modules/settings.ts`, `saas/web/src/features/settings/`                              |
| Academia (cursos e aulas)                  | parcial      | CRUD real de cursos e aulas; o progresso do aluno fica só no navegador. O "gerador de vídeo" e o "Course Studio" gravam aulas e cursos no banco com roteiro e vídeo de exemplo fixos.                                     | `saas/api/src/modules/courses.ts`, `saas/api/src/modules/video-generator.ts`                       |
| PWA do painel                              | funciona     | Instalável (manifest, service worker, botão "Instalar app" em navegadores Chromium). Sem notificações push e sem dados offline.                                                                                           | `saas/web/public/`, `saas/web/src/lib/pwa.ts`                                                      |
| Agentes IA & Mídia, ERP/CRM, FlowBuilder   | demonstração | Telas com dados locais e respostas simuladas; nada é salvo nem executado. As rotas `/flowbuilder` da API devolvem dados fixos.                                                                                            | `saas/web/src/features/agents/`, `…/erp/`, `…/flowbuilder/`, `saas/api/src/modules/flowbuilder.ts` |
| Ferramentas e Gumesmomo                    | demonstração | Links e iframe fixos para `localhost`; não funcionam fora da máquina de desenvolvimento.                                                                                                                                  | `saas/web/src/features/tools/`, `saas/web/src/features/gumesmomo/`                                 |

### Canais

| Canal                        | Situação     | O que acontece de verdade                                                                                                                                                                                                                                                        | Código                                                                     |
| ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| WhatsApp (Baileys)           | parcial      | Conexão **não oficial** (WhatsApp Web) por QR, várias conexões por empresa, restauração no boot. Recebe só texto e legenda; ignora áudio, documento, figurinha e grupos. Envia pela primeira sessão conectada da empresa, não pela que recebeu. Sem status de entrega e leitura. | `saas/api/src/channels/whatsapp.ts`                                        |
| WhatsApp modo `demo`         | demonstração | Com `WHATSAPP_MODE=demo` (ou sem a lib), gera QR falso e "conecta" em 12 s com número fictício. Nada é enviado.                                                                                                                                                                  | `saas/api/src/channels/whatsapp.ts`                                        |
| Instagram Direct e Messenger | parcial      | Graph API v21.0 e webhook com HMAC; só texto (anexos ignorados); resposta dentro da janela de 24 h. Na instalação padrão exige acrescentar `META_APP_SECRET`/`META_VERIFY_TOKEN` ao compose (o painel não tem campo para o app secret).                                          | `saas/api/src/channels/meta.ts`, `saas/api/src/modules/meta-webhooks.ts`   |
| Chat do site (widget)        | parcial      | As rotas da API funcionam (abrir conversa, mensagens por polling, IA). Atende uma empresa só. No site, a CSP (`connect-src 'self'`) bloqueia as chamadas quando a API está em outro domínio, como no deploy padrão.                                                              | `saas/api/src/modules/widget.ts`, `site/app/components/EngagementDock.tsx` |
| Telegram e E-mail            | não existe   | Aparecem no catálogo, mas "conectar" só grava o status `configured`. Não há integração.                                                                                                                                                                                          | `saas/api/src/modules/channels.ts`                                         |
| YouTube e X                  | não existe   | Há adaptadores escritos, mas não estão ligados: a coleta nunca é iniciada e os tipos não podem ser criados.                                                                                                                                                                      | `saas/api/src/channels/social.ts`, `youtube.ts`, `x.ts`                    |

### IA

| Recurso                                | Situação     | O que acontece de verdade                                                                                                                                                                           | Código                                                   |
| -------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Classificar, resumir, sugerir resposta | parcial      | Usa Claude (chave `sk-ant-…`) ou, sem ela, Gemini. Sem chave, responde 503. Se o Gemini falhar por erro de rede, devolve uma resposta simulada fixa sem avisar.                                     | `saas/api/src/lib/ai.ts`, `saas/api/src/modules/ai.ts`   |
| Autoatendimento por IA com handoff     | parcial      | Responde o cliente até alguém assumir; passa para humano por palavra-chave ou decisão da IA. Com só a chave Claude, defina `AI_MODEL_AUTOREPLY`: o padrão no código é um modelo Gemini.             | `saas/api/src/modules/automations.ts`                    |
| Provedores, "treino diário", GitHub    | demonstração | `/ai/providers` marca tudo como ativo; `/ai/sync-training` acrescenta 3 frases fictícias fixas à base de conhecimento real do chat do site (não usar); `/ai/github-train` devolve um job inventado. | `saas/api/src/modules/ai-providers.ts`, `ai-training.ts` |

### Integrações de terceiros

| Integração            | Situação     | O que acontece de verdade                                                                                                                            | Código                            |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Hotmart (webhook)     | parcial      | Valida o hottok e manda boas-vindas no WhatsApp. Grava sempre na primeira empresa do banco; o link do curso aponta para `localhost`.                 | `saas/api/src/modules/hotmart.ts` |
| Kiwify (webhook)      | parcial      | Cria contato com etiquetas. **Sem validação de assinatura**: aceita qualquer requisição.                                                             | `saas/api/src/modules/kiwify.ts`  |
| ABACS                 | parcial      | Webhook com token, mas a mensagem ao aluno contém o próprio token. `/abacs/config` age na primeira empresa; a sincronização responde sucesso sempre. | `saas/api/src/modules/abacs.ts`   |
| Ghost (`/ghost/*`)    | demonstração | Dois posts fixos no código e status "online" fixo. Não conecta a nenhum Ghost.                                                                       | `saas/api/src/modules/ghost.ts`   |
| Pagamentos e cobrança | não existe   | Não há PIX, Efí/Gerencianet, Stripe, Mercado Pago nem Asaas. Os planos têm preço, mas não há cobrança.                                               | —                                 |

### Site, editor e app

| Peça                                      | Situação     | O que acontece de verdade                                                                                                                                                                                                                                                                                              | Código                                                  |
| ----------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Landing, `/intsoft`, `/recursos`, `/docs` | funciona     | Páginas estáticas; `/health` para o monitoramento. A calculadora e a tabela comparativa usam limites de plano diferentes dos do sistema.                                                                                                                                                                               | `site/app/`                                             |
| Formulário de contato e chat do site      | parcial      | Abrem conversa pela API do widget; sofrem o bloqueio da CSP descrito em "Canais".                                                                                                                                                                                                                                      | `site/app/contato/`, `site/app/components/`             |
| `/loja`, `/agentes`, `/preview`, `/blog`  | demonstração | Pagamento simulado (nada é cobrado), agentes e portal com respostas fixas, blog com dois posts fixos.                                                                                                                                                                                                                  | `site/app/loja/`, `…/agentes/`, `…/preview/`, `…/blog/` |
| `/entrar`, `/login`, `/painel`, `/cursos` | parcial      | `/entrar`, `/login` e `/painel` redirecionam para `http://localhost:8080` (fixo no código); `/cursos`, a home (FeatureCards, StreamingSection), `/agentes` e a página 404 têm links fixos para `localhost:8080` (e `/blog` para `localhost:2368`). Em produção não funcionam; use o endereço do painel (`app.DOMAIN`). | `site/app/entrar/` e vizinhos                           |
| Editor de vídeo e música (`apps/editor`)  | parcial      | Corta vídeo, troca ou mistura áudio e exporta MP4 com FFmpeg no navegador. Vídeo sem trilha de áudio falha ao exportar sem música ou no modo "misturar" (só "substituir" funciona). Não tem deploy.                                                                                                                    | `apps/editor/`                                          |
| App iOS (`apps/ios`)                      | protótipo    | Login, lista de conversas, resposta e sugestão de IA. Sem registro de teste em aparelho; o token fica só em memória (volta ao login a cada abertura e expira em 15 min), sem tempo real, ATS liberado e IP padrão `192.168.1.126`.                                                                                     | `apps/ios/`                                             |

## Não entrega na 1.0

- Tempo real no painel (a API emite eventos Socket.IO, mas o painel não os escuta).
- Envio de mídia e áudio pelo atendente; recebimento de áudio, documento e anexos.
- Status de entrega e leitura das mensagens.
- Telegram, e-mail, YouTube e X.
- WhatsApp pela API oficial (Cloud API) ou pela Evolution API.
- Cobrança, assinatura e troca automática de plano.
- Limites de canais e de mensagens por mês.
- Permissões customizadas aplicadas de verdade.
- Recuperação de senha por e-mail.
- Migrações de banco versionadas (o schema é aplicado com `drizzle-kit push --force`).
- Mais de uma instância da API (sessões do WhatsApp, agendador e Socket.IO vivem no processo).
- Testes do site, do editor e de `packages/shared`.

## Arquitetura real

```
           visitante                  atendente                  cliente final
               │                          │                    (WhatsApp, Instagram,
               ▼                          ▼                        Messenger)
     site/  (Next 16)           saas/web (React 19 + Vite 8, PWA)        │
     DOMAIN :3000               app.DOMAIN :8080 (nginx estático)        │
               │                          │                              │
               └──────────── HTTPS ───────┴──────────────┐               │
                                                         ▼               ▼
                                    saas/api (Fastify 5, Node 22)  api.DOMAIN :4000
                                    ├─ Drizzle ORM ──────────▶ PostgreSQL 16
                                    ├─ ioredis / BullMQ ─────▶ Redis 7 (rate limit + fila de webhooks)
                                    ├─ Socket.IO (salas por empresa)
                                    ├─ Baileys (WhatsApp Web, não oficial)
                                    ├─ Meta Graph API v21.0 (Instagram / Messenger)
                                    └─ IA: Claude (@anthropic-ai/sdk) ou Gemini (REST)
```

| Pasta             | O que é                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `saas/api`        | API Fastify 5 em TypeScript (ESM), roda com `tsx` sem build. Drizzle + PostgreSQL, Redis + BullMQ, Socket.IO, Baileys, Meta Graph, Claude ou Gemini. Swagger em `/docs`. |
| `saas/web`        | Painel do atendente: React 19, Vite 8, react-router, TanStack Query. PWA com service worker escrito à mão.                                                               |
| `site`            | Site público em Next 16 (App Router, saída standalone): landing do Comenta, página da IntSoft e chat do site.                                                            |
| `packages/shared` | `@comenta/shared`: enums zod e tipos usados pelo painel. A API declara o pacote, mas não o importa.                                                                      |
| `apps/editor`     | Editor de vídeo e música no navegador (Vite + FFmpeg.wasm). Sem deploy.                                                                                                  |
| `apps/ios`        | Protótipo SwiftUI do app de atendimento.                                                                                                                                 |
| `deploy`          | Instalação real: `bootstrap.sh`, `docker-compose.yml`, vhosts Nginx e o `RUNBOOK.md`.                                                                                    |

## Como instalar a 1.0

O caminho real é **`deploy/bootstrap.sh` + `deploy/docker-compose.yml`**. O
passo a passo completo, com DNS, Ghost e solução de problemas, está em
[`deploy/RUNBOOK.md`](../../deploy/RUNBOOK.md).

1. **DNS:** registros A de `DOMAIN`, `www`, `app`, `api` e `blog` para o IP do
   servidor (Ubuntu). O domínio padrão é `intsoft.com.br`.
2. **Instalação**, como root:

   ```bash
   ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
   curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/bootstrap.sh" \
     | sudo BRANCH="$ramo" DOMAIN=intsoft.com.br EMAIL=voce@seudominio.com.br bash
   ```

   O script instala Docker, Nginx e Certbot; clona o repositório em
   `/srv/comenta/comenta` (para repositório privado, exporte `GITHUB_TOKEN`);
   gera o `.env` com segredos aleatórios; builda o painel; sobe `postgres`,
   `redis`, `api`, `site` e `panel` presos ao `127.0.0.1`; grava o vhost e
   emite um certificado por domínio. Variáveis úteis: `SKIP_SSL=1` (DNS ainda
   não propagou), `TAKE_OVER=1` (outro vhost já usa o domínio), `GHOST_MODE`
   e `MOVE_GHOST=1` (blog).

3. **Endereços** depois da instalação:

   | Endereço              | Serviço                            |
   | --------------------- | ---------------------------------- |
   | `https://DOMAIN`      | site (Next) — `:3000`              |
   | `https://app.DOMAIN`  | painel — `:8080`                   |
   | `https://api.DOMAIN`  | API — `:4000` (Swagger em `/docs`) |
   | `https://blog.DOMAIN` | Ghost — `:2368` (opcional)         |

4. **Primeiro acesso:** em produção o seed cria só os planos. Crie a empresa
   e o admin pelo botão "Criar empresa" na tela de login do painel. A empresa
   e o admin de demonstração só são criados com `SEED_DEMO=true` (no deploy padrão essa variável não é repassada à API; seria preciso incluí-la no bloco `environment` do serviço `api`).
5. **IA e integrações:** na 1.0 o compose repassa à API a chave da Anthropic,
   os modelos `AI_MODEL_CLASSIFY/SUMMARIZE/SUGGEST/CHAT` e o modo do WhatsApp.
   `GEMINI_API_KEY`, `AI_MODEL_AUTOREPLY`, `HOTMART_HOTTOK`, `ABACS_TOKEN`,
   `WIDGET_COMPANY_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN` e `SEED_DEMO`
   não são repassados: para usá-los, acrescente-os ao bloco `environment` do
   serviço `api` em `deploy/docker-compose.yml`. Sem `META_APP_SECRET` e
   `META_VERIFY_TOKEN`, Instagram e Messenger não conectam pelo painel, que não
   tem campo para o app secret. A alternativa é gravar `appSecret` e
   `verifyToken` no `config` da conexão via `PATCH /channels/:id` (API);
   conectar de novo pelo painel apaga esse config.
6. **Atualizar:** rode o `bootstrap.sh` de novo no servidor; ele atualiza o
   repositório, rebuilda o painel e sobe os containers.

Para desenvolvimento local: `npm ci` na raiz (Node 22 ou mais novo), `npm run
build -w @comenta/shared`, Postgres e Redis no ar, e então `npm run dev:api`,
`npm run dev:web` e `npm run dev:site`. No Mac há `deploy/local-mac.sh`.

> O deploy automático por GitHub Actions (`.github/workflows/deploy.yml`) não
> está na `main` e nunca rodou. Na 1.0 o deploy é manual, pelo `bootstrap.sh`.

## O instalador desta pasta é legado

`projects/comenta/instalador/` é o instalador Bash do **Atendechat/Whaticket**
com a marca trocada para Comenta. **Ele não instala o Comenta 1.0.** Foi feito
para um repositório com outra estrutura e outras ferramentas:

| O instalador espera                                          | O Comenta 1.0 tem                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Pastas `backend/` e `frontend/`                              | `saas/api`, `saas/web` e `site` num monorepo npm                                                     |
| `npx sequelize db:migrate` e `db:seed:all`                   | Drizzle: `drizzle-kit push` e `npm run db:seed`                                                      |
| `pm2 start dist/server.js`                                   | `tsx src/index.ts` (o build gera `dist/index.js`)                                                    |
| `.env` com `DB_*`, `REDIS_URI`, `BACKEND_URL`                | Variáveis de ambiente `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `API_URL`; a API não lê arquivo `.env` |
| Painel CRA com `REACT_APP_BACKEND_URL` e `server.js` Express | Painel Vite (ESM) com `VITE_API_URL`, saída em `dist/`                                               |
| Node 20                                                      | Node 22 ou mais novo                                                                                 |
| Dependências do Puppeteer/Chromium para o WhatsApp           | Baileys, sem navegador                                                                               |
| —                                                            | Site Next, que o instalador não builda nem publica                                                   |

Na 1.0 o instalador só recebeu correções de segurança e de rótulo: o menu e o
banner avisam que ele é legado, a opção "desbloquear" passou a usar o nome
certo, as ações de deletar, bloquear, desbloquear e alterar domínio recusam
nome de instância vazio ou com `/`, `..`, espaços e curingas, e os scripts
ganharam permissão de execução. As incompatibilidades acima continuam.
Detalhes em [`ANALISE_INSTALADOR.md`](ANALISE_INSTALADOR.md). O instalador fica
no repositório só como referência histórica.

## Testes e CI na 1.0

- `saas/api`: 9 arquivos, 71 testes (Vitest). 22 deles precisam de Postgres de
  teste (`TEST_DATABASE_URL`) e são pulados sem ele.
- `saas/web`: 3 arquivos, 14 testes (Vitest + Testing Library).
- `site`, `apps/editor` e `packages/shared`: sem testes.
- O CI (`.github/workflows/ci.yml`) está vermelho no lint por erros na pasta
  `content/`, que é de outro projeto; formatação, typecheck, testes e build nem
  chegam a rodar.
