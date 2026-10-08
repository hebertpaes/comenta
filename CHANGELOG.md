# Changelog — Comenta

## 1.0.0 — 2026-10-08

Primeira versão com nome e número únicos: **Comenta 1.0**. Esta entrada
descreve o que o código faz hoje, conferido arquivo por arquivo. "Demonstração"
quer dizer que a tela ou rota responde com dados fixos ou simulados, sem efeito
real.

### API (`saas/api`)

**Entrega**

- Cadastro de empresa, login, refresh token com rotação, logout, troca de
  senha e `/auth/me`; API keys (`X-API-Key`); papéis `admin`, `agent` e `api`.
- Empresas isoladas por `companyId`, com furos conhecidos (ver
  `saas/api/README.md`, seção Segurança conhecida); limites de plano para
  usuários e contatos.
- Contatos (CRUD, busca, importação em lote), conversas e mensagens (status,
  responsável, fila, primeira resposta), métricas de dashboard.
- Filas com horário e membros, tags, notas internas, respostas rápidas.
- Automações: boas-vindas, fora do horário, palavra-chave, autoatendimento por
  IA com passagem para humano e avaliação/NPS ao resolver a conversa.
- Campanhas por WhatsApp: público todos/tag/lista, `{nome}`, mídia por URL,
  agendamento, pausa aleatória, lotes, limite diário, horário comercial.
- Chat interno da equipe, cursos e aulas, base de conhecimento do chat do site.
- Webhooks de saída assinados (HMAC-SHA256) com 5 tentativas via BullMQ;
  Socket.IO por empresa; rate limit no Redis; `/health`, `/ready`, `/docs`.
- IA opcional: Claude (`ANTHROPIC_API_KEY`) ou Gemini (`GEMINI_API_KEY` /
  `GOOGLE_AI_API_KEY`) para classificar, resumir, sugerir resposta,
  autoatendimento e chat do site. Sem chave, as rotas `/ai` respondem 503, o
  chat do site cai em respostas prontas e o autoatendimento só passa para
  humano por palavra-chave.
- Webhook Hotmart validado por hottok (parcial: grava sempre na primeira
  empresa do banco e o link de curso enviado ao aluno aponta para
  `http://localhost:8080`).

**Demonstração**

- Rotas `/ai/sync-training`, `/ai/training-status`, `/ai/github-train`,
  `/ai/providers` (lista fixa), `/flowbuilder`, `/ghost/*`,
  `/courses/generate-video`, `/courses/generate-full-course`, `/erp/dashboard`
  (dados de exemplo enquanto vazio), `/whatsapp/interactive-menu` (salvo, nunca
  usado), `/permissions` (salvo, nunca aplicado), `/abacs/sync-hotmart`
  (responde sucesso sempre).
- Se o Gemini falha por erro de rede, a IA devolve uma resposta simulada fixa.

**Não entrega**

- Limites de canais e de mensagens por mês; cobrança e pagamentos.
- Login Google verificado (`/auth/google` não confere token — falha de
  segurança, ver `saas/api/README.md`).
- Migrações versionadas (o schema é aplicado com `drizzle-kit push`).
- Consulta da auditoria; status de entrega/leitura das mensagens.

### Canais

**Entrega**

- WhatsApp por Baileys (não oficial): QR, várias conexões por empresa, sessão
  restaurada no boot, importação da agenda. Recebe texto e legenda; envia texto,
  imagem e documento.
- Instagram Direct e Facebook Messenger pela Graph API da Meta (só texto).
- Chat do site (widget público) para uma empresa (`WIDGET_COMPANY_ID` ou a
  primeira cadastrada).

**Demonstração**

- `WHATSAPP_MODE=demo`: QR falso e "conectado" com número fictício.

**Não entrega**

- WhatsApp Cloud API oficial; áudio, documento e figurinha recebidos; grupos.
- Respostas automáticas no Instagram/Messenger (o bot responde só pelo
  WhatsApp e pelo chat do site).
- Telegram e e-mail (só no catálogo); YouTube e X (código não ligado).

### Painel (`saas/web`)

**Entrega**

- Login, cadastro de empresa e troca de senha obrigatória.
- Conversas estilo WhatsApp com envio de texto, transferência de fila, tags,
  respostas rápidas, notas e painel de IA.
- Kanban por status, contatos (CSV/VCF), campanhas com progresso, filas e
  membros, usuários, tags, automações, avaliações, chat da equipe, conexões com
  QR do WhatsApp, chaves de API, webhooks, cursos, base de conhecimento.
- PWA instalável (Chromium), tema claro/escuro, paleta de comandos.

**Demonstração**

- Agentes IA & Mídia, CRM & ERP, FlowBuilder e Permissões (estado local, nada
  é salvo); Ferramentas e Gumesmomo (links para `localhost`).
- Dashboard: "Vendas Hotmart/ABACS" e "Atendimentos por IA" não têm fonte de
  dados (aparecem como "—"); o filtro de período não muda os números; CSV e
  "compartilhar" exportam os valores da tela, não os da API.
- Configurações: só a base de conhecimento salva; pagamento e ABACS são fixos.
- Conversas: horário, "✓✓" e reações decorativos; "anexo" só cola a URL no texto.
- Contatos: sem a Contact Picker API do navegador, "Sincronizar agenda" grava
  contatos fictícios.

**Não entrega**

- Tempo real (não há cliente Socket.IO) e paginação de conversas.
- Envio de arquivo e áudio pelo atendente; notificações push; dados offline.

### Site (`site/`)

**Entrega**

- Landing do Comenta, página IntSoft (é ela que aparece na raiz de
  `intsoft.com.br`), `/recursos`, `/docs`, `/contato`, cabeçalhos de segurança
  e `/health`.

**Demonstração**

- `/loja` (pagamento simulado), `/agentes`, `/preview`, `/blog` (posts fixos),
  vitrine de cursos e depoimentos.

**Não entrega**

- Chat do site e formulário de contato em produção: a CSP do site
  (`connect-src 'self'`) bloqueia as chamadas à API em outra origem.
- Carrossel de notícias (não renderizado); `NEXT_PUBLIC_WHATSAPP` (não lido);
  sitemap; páginas de privacidade e termos.
- Links de entrada para o painel: `/entrar`, `/login`, `/painel`, `/cursos` e a
  página 404 apontam para `http://localhost:8080` (fixo no código), não para o
  painel publicado.

### Apps (`apps/`)

- **Editor** (`apps/editor`): corta vídeo, troca ou mistura música e exporta
  MP4 no navegador. Vídeo sem trilha de áudio falha. **Sem deploy.**
- **iOS** (`apps/ios`): **protótipo** — login, lista de conversas, resposta e
  sugestão de IA. Nunca rodou em aparelho; não guarda a sessão.

### Deploy e qualidade

**Entrega**

- `deploy/bootstrap.sh` (manual, no servidor): Docker Compose com Postgres,
  Redis, API, site e painel, Nginx e certificados; domínio padrão
  `intsoft.com.br`. `deploy_site.sh` publica só o site com PM2.
- CI com lint, formatação, typecheck, testes e build; verificação de segredos
  no diff.
- Testes: API 9 arquivos/71 testes (22 precisam de Postgres de teste); painel 3
  arquivos/14 testes.

**Não entrega**

- Deploy automático: `deploy.yml` não está na `main` e nunca rodou.
- CI verde: o lint falha em `content/` (projeto HOJE MT, fora do Comenta).
- Testes do site, do editor e de `packages/shared`; testes E2E.
- O instalador em `projects/comenta/instalador/` não instala este monorepo.
