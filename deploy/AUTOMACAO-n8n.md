# Automação com n8n (e Zapier/Make) — Comenta

O Comenta conversa com o n8n nos **dois sentidos**, sem plugin: por **webhooks**
(Comenta → n8n) e pela **API com chave** (n8n → Comenta). Serve igual para
Zapier, Make (Integromat) ou qualquer serviço que faça HTTP.

```
        evento (nova conversa / mensagem)                    ação (responder / criar contato)
Comenta ─────────────── webhook ───────────────► n8n ─────────────── HTTP + X-API-Key ───────────────► Comenta
```

---

## 1) Comenta → n8n (gatilho por evento)

Quando algo acontece no Comenta, ele faz um `POST` assinado para a URL que você
cadastrar.

**Eventos disponíveis:** `conversation.created`, `message.created`, `conversation.updated`.

**Passo a passo**

1. No **n8n**: crie um workflow com um nó **Webhook** (método `POST`) e copie a
   _Production URL_ dele.
2. No **Comenta** (como admin), cadastre o webhook apontando para essa URL:
   ```bash
   curl -X POST https://SUA-API/webhooks \
     -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://SEU-N8N/webhook/comenta","events":["conversation.created","message.created"]}'
   ```
   A resposta traz um **`secret`** (aparece só uma vez) — guarde para validar a assinatura.

**Formato do corpo recebido**

```json
{ "event": "message.created", "data": { "conversationId": "…", "message": { … } }, "sentAt": "2026-07-22T12:00:00.000Z" }
```

Cabeçalhos: `X-Comenta-Event` e `X-Comenta-Signature: sha256=<hmac>`.

**Validar a assinatura (nó Function no n8n)** — garante que o evento é do Comenta:

```js
const crypto = require("crypto");
const raw = JSON.stringify($json.body ?? $json); // corpo exatamente como recebido
const sig = $headers["x-comenta-signature"]?.split("=")[1];
const expected = crypto.createHmac("sha256", "SEU_SECRET").update(raw).digest("hex");
if (sig !== expected) throw new Error("assinatura inválida");
return items;
```

---

## 2) n8n → Comenta (ação de volta)

O n8n age no Comenta usando uma **API Key** (a mesma API do painel).

**Passo a passo**

1. No **Comenta**, gere uma API Key (admin):
   ```bash
   curl -X POST https://SUA-API/api-keys \
     -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
     -H "Content-Type: application/json" -d '{"name":"n8n"}'
   ```
   Guarde a chave (aparece só uma vez).
2. No **n8n**, use um nó **HTTP Request** com o header `X-API-Key: SUA_CHAVE`.

**Ações úteis**

- Responder numa conversa (a resposta chega no chat do site **e** no WhatsApp do cliente):
  ```
  POST https://SUA-API/conversations/{conversationId}/messages
  X-API-Key: SUA_CHAVE   Content-Type: application/json
  { "body": "Olá! Recebemos seu pedido e já estamos verificando." }
  ```
- Criar/atualizar contato: `POST /contacts`
- Listar conversas: `GET /conversations?status=pending`

---

## Receitas prontas

- **Resposta automática fora do horário:** trigger `conversation.created` → nó IF
  (checa hora) → HTTP `POST /conversations/{id}/messages` com o aviso de horário.
- **Notificar equipe no Slack/Telegram:** trigger `message.created` → nó Slack/Telegram.
- **Registrar lead no CRM/Planilha:** trigger `conversation.created` → nó Google
  Sheets/HubSpot com nome + telefone do contato.
- **Triagem por IA:** trigger `message.created` → nó de IA (classifica) → roteia
  para o time certo ou responde sozinho.

> Dica: rode o próprio n8n em Docker ao lado do Comenta. É open-source (licença
> Sustainable Use) e entra no catálogo de ferramentas do Comenta (fase seguinte).
