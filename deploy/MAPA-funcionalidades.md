# Mapa de funcionalidades — atendimento multicanal

Este documento é uma **análise de funcionalidades** (o que cada recurso faz e
como se comporta) usada como referência para reimplementar tudo de forma
**nativa** no Comenta. Nenhum código de terceiros foi copiado — o mapa foi
derivado do comportamento observável (modelos de dados e endpoints) e serve
apenas de checklist de produto.

Legenda: ✅ pronto no Comenta · 🟡 parcial · ⬜ a fazer

---

## 1. Atendimento (núcleo)

| Função                             | O que faz                                                                                                             | Status no Comenta                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Tickets/Conversas                  | Cada contato gera uma conversa com status (pendente/aberto/resolvido), atendente responsável e histórico de mensagens | ✅ `conversations` + `messages`                                        |
| Mensagens em tempo real            | Entrada/saída aparecem na hora no painel (WebSocket)                                                                  | ✅ Socket.IO                                                           |
| Distribuição por fila/departamento | Conversa entra numa fila (Suporte/Vendas/…); atendentes veem as suas                                                  | ✅ `queues` + `userQueues`                                             |
| Atribuir/assumir conversa          | Atendente assume; primeira resposta marca tempo                                                                       | ✅ `assignedUserId` + `firstResponseAt`                                |
| Notas internas do atendimento      | Anotações que o cliente não vê                                                                                        | ✅ `conversationNotes`                                                 |
| Tags na conversa                   | Etiquetas coloridas para organizar/kanban                                                                             | ✅ `tags` + `conversationTags`                                         |
| Kanban                             | Quadro arrastar-e-soltar por status/etapa                                                                             | ✅ aba Kanban                                                          |
| Marcar como lida / não lida        | Contador de não lidas por conversa                                                                                    | 🟡 `unreadCount` existe; UI de "marcar lida" simples                   |
| Rastreio de métricas (traking)     | Tempos de espera, atendimento e resolução por ticket                                                                  | 🟡 temos `firstResponseAt`; faltam tempos de fila/resolução detalhados |

## 2. Canais / Conexões

| Função                         | O que faz                                                  | Status                                                   |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| WhatsApp (QR)                  | Conecta número via QR e troca mensagens                    | ✅ Baileys, multi-conexão                                |
| Multi-conexão / multicanal     | Vários números + Instagram/Facebook/Telegram/Widget/E-mail | ✅ catálogo; WhatsApp e Widget reais, demais com encaixe |
| Sincronizar agenda do aparelho | Importa contatos do celular conectado                      | ✅ botão "Sincronizar contatos"                          |
| Vínculo canal ↔ fila           | Cada conexão direciona para filas                          | 🟡 conversas já têm fila; falta amarrar por canal        |
| Sessão persistente             | Reconecta sozinho no boot                                  | ✅ `restoreSessions`                                     |

## 3. Automação / Bot

| Função                                       | O que faz                                                    | Status                             |
| -------------------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| Boas-vindas                                  | Responde na 1ª mensagem                                      | ✅ automação `welcome`             |
| Fora do horário                              | Responde fora do expediente                                  | ✅ automação `business_hours`      |
| Palavra-chave                                | Responde a termos específicos                                | ✅ automação `keyword`             |
| **Autoatendimento por IA**                   | IA responde o cliente com base de conhecimento e faz handoff | ✅ automação `ai`                  |
| Chatbot em árvore (opções)                   | Menu "digite 1 para Vendas…" com sub-opções por fila         | ⬜ (dá pra fazer como fila+opções) |
| Fluxo visual (flow builder)                  | Editor visual de fluxo com nós (texto/áudio/imagem/condição) | ⬜ (grande; opcional)              |
| Integrações de fila (n8n/typebot/dialogflow) | Encaminha a conversa para um motor externo                   | 🟡 temos n8n via docker + webhooks |

## 4. Contatos

| Função                   | O que faz                                  | Status                                |
| ------------------------ | ------------------------------------------ | ------------------------------------- |
| CRUD + busca             | Cadastro, edição, busca                    | ✅                                    |
| Importar/exportar CSV    | Planilha de contatos                       | ✅ import/export                      |
| Campos personalizados    | Campos extras por contato (CPF, plano…)    | ⬜ `contactCustomFields`              |
| Listas de contatos       | Agrupar contatos em listas para campanha   | 🟡 usamos **tags** no lugar de listas |
| Bloquear bot por contato | Desligar IA/bot para um contato específico | 🟡 temos `botActive` por conversa     |

## 5. Campanhas

| Função                              | O que faz                           | Status                    |
| ----------------------------------- | ----------------------------------- | ------------------------- |
| Disparo para lista                  | Envia mensagem para vários contatos | ✅ por tag ou todos       |
| Agendamento                         | Dispara em data/hora marcada        | ✅ agendador              |
| Status por destinatário + progresso | Enviado/falhou + barra              | ✅                        |
| Variáveis na mensagem               | Personaliza com `{nome}`            | ✅                        |
| Mídia na campanha                   | Anexar imagem/arquivo               | ⬜ (só texto hoje)        |
| Várias mensagens (rodízio)          | message1..5 para variar o texto     | ⬜                        |
| Intervalo anti-bloqueio             | Espaça os envios                    | ✅ `CAMPAIGN_SEND_GAP_MS` |

## 6. Produtividade da equipe

| Função                  | O que faz                                           | Status                     |
| ----------------------- | --------------------------------------------------- | -------------------------- |
| Respostas rápidas       | Atalhos `/ola`, `/planos`…                          | ✅ `quickReplies`          |
| Agendamento de mensagem | Programar 1 mensagem para 1 contato                 | ⬜ `schedules`             |
| Chat interno da equipe  | Atendentes conversam no painel (não vai ao cliente) | ⬜                         |
| Mural de avisos         | Comunicados internos com prioridade                 | ⬜ `announcements`         |
| Central de ajuda        | Tutoriais/vídeos dentro do app                      | 🟡 temos Academia (cursos) |
| Academia/cursos         | Treinamentos com aulas                              | ✅                         |

## 7. Qualidade / Métricas

| Função                        | O que faz                                                    | Status                 |
| ----------------------------- | ------------------------------------------------------------ | ---------------------- |
| Dashboard                     | Contadores + gráficos (7 dias, por fila, status)             | ✅                     |
| **Avaliação / NPS**           | Pesquisa de satisfação ao encerrar (nota 0–10 / 1–5) + média | ⬜ `userRating`        |
| Relatórios por atendente/fila | Produtividade, tempo médio, volume                           | 🟡 dashboard tem parte |

## 8. Administração / Conta

| Função                                   | O que faz                                                 | Status                                              |
| ---------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Multiempresa (multi-tenant)              | Cada empresa isolada                                      | ✅                                                  |
| Usuários e papéis                        | Admin/atendente, vínculo com filas                        | ✅ (papéis) 🟡 (vínculo fila-usuário só no backend) |
| Configurações gerais                     | Saudações, comportamentos do bot, ligar/desligar recursos | ⬜ aba `settings`                                   |
| Horário de atendimento por fila          | Expediente e mensagem fora do horário por fila            | 🟡 automação global; falta por fila                 |
| Webhooks / API keys                      | Integrações de saída e chaves de API                      | ✅                                                  |
| Faturamento (planos/assinaturas/faturas) | Cobrança, vencimento, gateway                             | ⬜ `invoices`/`subscriptions` (só planos hoje)      |
| Recuperação de senha                     | "Esqueci minha senha" por e-mail                          | ⬜                                                  |

---

## Ordem sugerida do que falta (por impacto)

1. **Avaliação / NPS** — fecha o ciclo do atendimento e alimenta o dashboard.
2. **Chat interno da equipe** — colaboração entre atendentes.
3. **Configurações gerais** (aba settings) + **horário por fila**.
4. **Agendamento de mensagem** (1 msg / 1 contato) e **mídia em campanhas**.
5. **Chatbot em árvore** (menu de opções por fila).
6. **Faturamento** (assinaturas/faturas) — quando for cobrar de clientes.
7. **Flow builder visual** — o maior; deixar por último.

> Tudo acima é reimplementado com código **original** no Comenta (Fastify +
> Drizzle + Postgres + React). O mapa é só um checklist de produto.
