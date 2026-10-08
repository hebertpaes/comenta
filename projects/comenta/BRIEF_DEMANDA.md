# Comenta 1.0 — Brief da demanda

## Objetivo

Ter uma plataforma própria de atendimento multicanal, o **Comenta**, em que uma
equipe responde num só painel as conversas do WhatsApp, do Instagram Direct, do
Facebook Messenger e do chat do site, com filas, automações, campanhas e IA de
apoio, publicada nos domínios da IntSoft (`intsoft.com.br`, `app.`, `api.`).

O código do produto está neste monorepo (`saas/api`, `saas/web`, `site`) e
**não** usa a base Atendechat/Whaticket (Express + Sequelize): a API é Fastify +
Drizzle e o painel é React + Vite. A ideia inicial de partir daquela base e do
instalador dela foi abandonada (ver
[`ANALISE_INSTALADOR.md`](ANALISE_INSTALADOR.md)).

## Estado da 1.0

A versão 1.0 (1.0.0) é a que está no código hoje. Resumo (tabela completa por
área, com as pastas, no [`README.md`](README.md)):

**Funciona**

- Cadastro de empresa, login com JWT e refresh, troca de senha, usuários com
  papéis admin e atendente, chaves de API.
- Kanban por status, filas com horário, etiquetas, respostas rápidas, notas
  internas, chat da equipe.
- Automações (boas-vindas, fora do horário, palavra-chave), avaliação NPS.
- Webhooks de saída assinados, com fila BullMQ e histórico de entregas.
- Painel instalável como PWA; site público com landing, recursos e docs.
- Instalação numa VPS Ubuntu com `deploy/bootstrap.sh` + Docker Compose + Nginx
  - Let's Encrypt.

**Parcial**

- Conversas: resposta só em texto, sem tempo real (a lista atualiza ao voltar
  o foco ou depois de uma ação), só as 20 primeiras.
- WhatsApp por Baileys (conexão não oficial por QR, várias conexões por
  empresa): só texto, sem status de entrega, envio pela primeira sessão
  conectada da empresa.
- Instagram Direct e Messenger pela Graph API, só texto: na instalação padrão
  exigem acrescentar `META_APP_SECRET` e `META_VERIFY_TOKEN` ao compose, porque
  o painel não tem campo para o app secret.
- IA (Claude ou Gemini) para classificar, resumir, sugerir e autoatender:
  precisa de chave e cai em resposta simulada se o Gemini falhar por rede.
- Campanhas em massa (texto com imagem ou documento opcional por URL): só
  WhatsApp, e o destinatário fica "enviado" mesmo sem sessão conectada.
- Chat do site: a API funciona, mas a CSP do site bloqueia as chamadas quando a
  API está em outro domínio, e atende uma empresa só.
- Dashboard com dois indicadores sem fonte de dados (mostram "—") e filtro de
  período que não filtra; limites de plano só para usuários e
  contatos; Hotmart, Kiwify e ABACS presos à primeira empresa do banco.

**Demonstração (sem efeito real)**

- Agentes IA & Mídia, ERP/CRM, FlowBuilder, Permissões, Ferramentas e
  Gumesmomo no painel; rotas `/ghost`, `/flowbuilder` e `/ai/github-train`
  na API. As telas do painel e a `/loja` já trazem aviso de demonstração.
- Com efeito real indevido: `/ai/sync-training` acrescenta frases fictícias à
  base de conhecimento do chat do site, e o gerador de vídeo e o Course Studio
  da Academia gravam aulas e cursos de exemplo no banco.
- `/loja` (pagamento simulado), `/agentes`, `/preview` e `/blog` no site.
- WhatsApp com `WHATSAPP_MODE=demo`.

**Segurança:** a 1.0 tem falhas que impedem abrir o sistema para clientes
(login "Google" sem verificação, rotas sem autenticação, webhook Kiwify sem
assinatura, token ABACS enviado ao aluno, SSRF, segredos expostos em
`/settings`, furos entre empresas, senhas padrão). Lista e prioridade em
[`codex/CODEX_TASK.md`](codex/CODEX_TASK.md).

## O que ficou fora da 1.0

- Tempo real no painel (Socket.IO existe na API, mas o painel não escuta).
- Mídia e áudio no envio do atendente; áudio, documentos e anexos recebidos.
- Status de entrega e leitura.
- Telegram e e-mail (só aparecem no catálogo); YouTube e X (código não ligado).
- WhatsApp pela API oficial da Meta.
- Cobrança e assinatura: não existe integração de pagamento nenhuma (nem PIX,
  nem Efí/Gerencianet, nem Stripe ou Mercado Pago).
- Limites de canais e de mensagens por mês.
- Permissões customizadas aplicadas nas rotas.
- Recuperação de senha por e-mail.
- Migrações de banco versionadas.
- Testes do site, do editor e de `packages/shared`; CI verde.
- Deploy automático (o workflow de deploy não está na `main` e nunca rodou).
- App iOS além de protótipo; deploy do editor de vídeo.

## Próximos passos reais

Em ordem de prioridade (detalhes em [`codex/CODEX_TASK.md`](codex/CODEX_TASK.md)):

1. **Fechar as falhas de segurança** antes de qualquer cliente externo.
2. **CI verde**: tirar `content/` (outro projeto) do lint e do prettier da raiz,
   ou corrigir os erros, para que typecheck, testes e build voltem a rodar.
3. **Tempo real no painel** com Socket.IO e paginação de conversas.
4. **Canais completos**: mídia e áudio, status de entrega, envio pela conexão
   certa do WhatsApp, respostas automáticas também no Instagram e Messenger.
5. **Migrações versionadas** com `drizzle-kit generate` no lugar do `push --force`.
6. **Planos e cobrança**: aplicar limites de canais e mensagens e escolher um
   gateway de pagamento (a decidir; não há nada implementado).
7. **Telegram, e-mail, YouTube e X**: ligar ou tirar do catálogo e do site.
8. **Telas de demonstração** (já sinalizadas na interface): ligar à API ou
   remover (ERP/CRM, FlowBuilder, Permissões, Agentes, `/loja`).
9. **Site**: corrigir a CSP para o chat e o contato, trocar os links
   `localhost`, unificar a tabela de planos e criar privacidade e termos.
10. **Deploy automático** e domínio definitivo do produto (hoje
    `intsoft.com.br`; segundo `deploy/GITHUB-DEPLOY.md`, `comenta.com.br` não
    resolve mais).
