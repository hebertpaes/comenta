# Filas / Departamentos (Fase 8)

Setores de atendimento (Suporte, Vendas, Financeiro, Marketing…) para onde as
conversas são roteadas — como no atendechat. Cada fila tem cor e seus
atendentes; cada conversa pode ser transferida para uma fila.

## No painel

- **Aba 🗂️ Filas** (admin): criar filas, escolher a cor, definir os atendentes
  de cada fila (checkbox) e remover filas.
- **Aba 💬 Conversas**: filtro por fila no topo (chips coloridos "Todas / Suporte
  / Vendas…"), etiqueta da fila em cada conversa, e um seletor **"↪ fila"** no
  cabeçalho da conversa para **transferir** para outro setor.

No primeiro boot o seed cria 4 filas (Suporte, Vendas, Financeiro, Marketing) e
liga os atendentes de cada time à sua fila.

## API

- `GET /queues` — lista filas + `memberIds`
- `POST /queues {name,color}` · `PATCH /queues/:id` · `DELETE /queues/:id` (admin)
- `PUT /queues/:id/members {userIds:[...]}` — define os atendentes da fila (admin)
- Conversas: `GET /conversations?queueId=...` filtra por fila;
  `PATCH /conversations/:id {queueId}` transfere (queueId=null tira da fila).

As tabelas `queues` e `user_queues` e a coluna `conversations.queue_id` são
criadas automaticamente no boot da API (drizzle push).

> Próximo: distribuição automática (round-robin) das conversas novas entre os
> atendentes da fila, e o Kanban de conversas por etapa.
