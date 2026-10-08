# Mapa de funcionalidades — Comenta 1.0

Checklist de produto do atendimento multicanal, com o **status conferido no
código da versão 1.0.0** (08/10/2026). O mapa foi derivado do comportamento
observável de sistemas do gênero (modelos de dados e endpoints) e serve só de
checklist: nenhum código de terceiros foi copiado.

Legenda: ✅ pronto · 🟡 parcial · 🧪 demonstração (tela ou rota com dados fixos, sem efeito real) · ⬜ não existe

---

## 1. Atendimento (núcleo)

| Função                             | O que faz                                                                                                             | Status no Comenta 1.0                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tickets/Conversas                  | Cada contato gera uma conversa com status (pendente/aberto/resolvido), atendente responsável e histórico de mensagens | ✅ `conversations` + `messages`                                                                                 |
| Mensagens em tempo real no painel  | Entrada/saída aparecem na hora no painel (WebSocket)                                                                  | ⬜ a API emite pelo Socket.IO, mas o painel não tem cliente de socket: atualiza ao voltar o foco à janela       |
| Distribuição por fila/departamento | Conversa entra numa fila (Suporte/Vendas/…); atendentes veem as suas                                                  | 🟡 `queues` + `userQueues` existem, mas o atendente vê todas as conversas (a lista não filtra pelas filas dele) |
| Atribuir/assumir conversa          | Atendente assume; primeira resposta marca tempo                                                                       | ✅ `assignedUserId` + `firstResponseAt`                                                                         |
| Notas internas do atendimento      | Anotações que o cliente não vê                                                                                        | ✅ `conversationNotes`                                                                                          |
| Tags na conversa                   | Etiquetas coloridas para organizar/kanban                                                                             | ✅ `tags` + `conversationTags`                                                                                  |
| Kanban                             | Quadro arrastar-e-soltar por status/etapa                                                                             | ✅ aba Kanban (três colunas fixas = status da conversa)                                                         |
| Marcar como lida / não lida        | Contador de não lidas por conversa                                                                                    | 🟡 a API conta e zera `unreadCount` ao abrir; o painel não mostra o contador nem tem "marcar como não lida"     |
| Rastreio de métricas (traking)     | Tempos de espera, atendimento e resolução por ticket                                                                  | 🟡 temos `firstResponseAt`; faltam tempos de fila/resolução detalhados                                          |
| Envio de mídia pelo atendente      | Anexar imagem, arquivo ou áudio na resposta                                                                           | ⬜ só texto; o "anexo" do painel cola a URL no texto                                                            |

## 2. Canais / Conexões

| Função                         | O que faz                               | Status                                                                                                                                |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp (QR)                  | Conecta número via QR e troca mensagens | ✅ Baileys (não oficial), multi-conexão; recebe só texto/legenda; `WHATSAPP_MODE=demo` é 🧪                                           |
| Instagram Direct / Messenger   | Recebe e responde DMs                   | ✅ Graph API da Meta, só texto                                                                                                        |
| Chat do site (widget)          | Visitante conversa pelo site            | 🟡 rotas prontas na API (uma empresa só), mas no site publicado a CSP (`connect-src 'self'`) bloqueia a chamada à API em outra origem |
| Telegram / E-mail              | Mais canais no mesmo painel             | ⬜ só no catálogo: o "conectar" grava `configured`, sem integração                                                                    |
| YouTube / X                    | Comentários e mensagens das redes       | ⬜ código de coleta existe, mas está desligado (polling não iniciado, tipos fora do catálogo)                                         |
| Sincronizar agenda do aparelho | Importa contatos do celular conectado   | ✅ botão "Sincronizar contatos" (agenda completa depende de `WHATSAPP_FULL_SYNC=1`)                                                   |
| Vínculo canal ↔ fila           | Cada conexão direciona para filas       | 🟡 só o chat do site e o handoff da IA definem fila; WhatsApp e Meta criam a conversa sem fila                                        |
| Sessão persistente             | Reconecta sozinho no boot               | ✅ `restoreSessions`                                                                                                                  |

## 3. Automação / Bot

| Função                                       | O que faz                                                    | Status                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Boas-vindas                                  | Responde na 1ª mensagem                                      | ✅ automação `welcome` (a resposta chega ao WhatsApp e ao chat do site; no Instagram/Messenger não é entregue) |
| Fora do horário                              | Responde fora do expediente                                  | ✅ automação `business_hours` (idem)                                                                           |
| Palavra-chave                                | Responde a termos específicos                                | ✅ automação `keyword` (idem)                                                                                  |
| **Autoatendimento por IA**                   | IA responde o cliente com base de conhecimento e faz handoff | ✅ automação `ai` (precisa de chave de IA; não é entregue no Instagram/Messenger)                              |
| Chatbot em árvore (opções)                   | Menu "digite 1 para Vendas…" com sub-opções por fila         | 🧪 o menu é salvo em `/whatsapp/interactive-menu`, mas nunca é enviado nem interpretado                        |
| Fluxo visual (flow builder)                  | Editor visual de fluxo com nós (texto/áudio/imagem/condição) | 🧪 tela "FlowBuilder IA" só em estado local; rota `/flowbuilder` devolve fluxos fixos e não executa            |
| Integrações de fila (n8n/typebot/dialogflow) | Encaminha a conversa para um motor externo                   | 🟡 webhooks de saída + n8n opcional no compose (`--profile tools`)                                             |

## 4. Contatos

| Função                   | O que faz                                  | Status                                       |
| ------------------------ | ------------------------------------------ | -------------------------------------------- |
| CRUD + busca             | Cadastro, edição, busca                    | ✅                                           |
| Importar/exportar CSV    | Planilha de contatos                       | ✅ importa CSV/VCF; exporta CSV no navegador |
| Campos personalizados    | Campos extras por contato (CPF, plano…)    | ⬜                                           |
| Listas de contatos       | Agrupar contatos em listas para campanha   | 🟡 usamos **tags** no lugar de listas        |
| Bloquear bot por contato | Desligar IA/bot para um contato específico | 🟡 temos `botActive` por conversa            |

## 5. Campanhas

| Função                              | O que faz                           | Status                                                                          |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Disparo para lista                  | Envia mensagem para vários contatos | ✅ todos, por tag ou lista de contatos (a lista só pela API)                    |
| Agendamento                         | Dispara em data/hora marcada        | ✅ agendador (verificação a cada 60 s)                                          |
| Status por destinatário + progresso | Enviado/falhou + barra              | 🟡 o destinatário fica "enviado" mesmo sem sessão de WhatsApp conectada         |
| Variáveis na mensagem               | Personaliza com `{nome}`            | ✅ `{nome}` e `{primeiro_nome}`                                                 |
| Mídia na campanha                   | Anexar imagem/arquivo               | ✅ imagem ou arquivo por URL                                                    |
| Várias mensagens (rodízio)          | message1..5 para variar o texto     | ⬜                                                                              |
| Intervalo anti-bloqueio             | Espaça os envios                    | ✅ pausa aleatória, lotes, limite diário, horário comercial e ordem embaralhada |

## 6. Produtividade da equipe

| Função                  | O que faz                                           | Status                                                            |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| Respostas rápidas       | Atalhos `/ola`, `/planos`…                          | ✅ `quickReplies`                                                 |
| Agendamento de mensagem | Programar 1 mensagem para 1 contato                 | ⬜                                                                |
| Chat interno da equipe  | Atendentes conversam no painel (não vai ao cliente) | ✅ `/team/messages` + tela Equipe (atualiza a cada 3 s)           |
| Mural de avisos         | Comunicados internos com prioridade                 | ⬜                                                                |
| Central de ajuda        | Tutoriais/vídeos dentro do app                      | 🟡 temos Academia (cursos)                                        |
| Academia/cursos         | Treinamentos com aulas                              | ✅ cursos e aulas; progresso só no navegador; gerador de vídeo 🧪 |

## 7. Qualidade / Métricas

| Função                        | O que faz                                                    | Status                                                                                                      |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Dashboard                     | Contadores + gráficos (7 dias, por fila, status)             | 🟡 métricas reais da API, mas dois indicadores não têm fonte de dados e o filtro de período não filtra nada |
| **Avaliação / NPS**           | Pesquisa de satisfação ao encerrar (nota 0–10 / 1–5) + média | ✅ automação `rating` + `ratings` + tela Avaliações                                                         |
| Relatórios por atendente/fila | Produtividade, tempo médio, volume                           | 🟡 dashboard tem contagem por fila; nada por atendente                                                      |

## 8. Administração / Conta

| Função                                   | O que faz                                                 | Status                                                                                   |
| ---------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Multiempresa (multi-tenant)              | Cada empresa isolada                                      | 🟡 isolamento por `companyId`, com furos conhecidos (ver `saas/api/README.md`)           |
| Usuários e papéis                        | Admin/atendente, vínculo com filas                        | ✅ papéis admin/atendente; vínculo fila-usuário no painel (Filas → membros)              |
| Permissões customizadas                  | Cargos com permissões finas                               | 🧪 tela e rota `/permissions` gravam cargos, mas nada os aplica                          |
| Configurações gerais                     | Saudações, comportamentos do bot, ligar/desligar recursos | 🟡 só a base de conhecimento do chat do site; o resto da tela Configurações é 🧪         |
| Horário de atendimento por fila          | Expediente e mensagem fora do horário por fila            | 🟡 existe por fila, mas só o chat do site o usa; WhatsApp e Meta usam a automação global |
| Webhooks / API keys                      | Integrações de saída e chaves de API                      | ✅                                                                                       |
| Faturamento (planos/assinaturas/faturas) | Cobrança, vencimento, gateway                             | ⬜ só planos com limites (usuários e contatos aplicados)                                 |
| Recuperação de senha                     | "Esqueci minha senha" por e-mail                          | ⬜                                                                                       |

---

## Ordem sugerida do que falta (por impacto)

1. **Tempo real no painel** (cliente Socket.IO) e paginação de conversas.
2. **Filas de verdade**: atendente vendo só as suas filas, fila definida pelo
   canal no WhatsApp/Meta e horário por fila também nesses canais.
3. **Respostas automáticas no Instagram/Messenger** e mídia no chat do
   atendente (enviar arquivo, receber áudio/documento).
4. **Configurações gerais** reais e status de entrega honesto nas campanhas.
5. **Agendamento de mensagem** (1 msg / 1 contato) e rodízio de mensagens.
6. **Chatbot em árvore** de verdade (enviar e interpretar o menu salvo).
7. **Faturamento** (assinaturas/faturas) — quando for cobrar de clientes.
8. **Flow builder visual** com motor de execução — o maior; deixar por último.

> O que está marcado como pronto ou parcial foi escrito com código **original**
> no Comenta (Fastify + Drizzle + Postgres + React). O mapa é só um checklist de
> produto.
