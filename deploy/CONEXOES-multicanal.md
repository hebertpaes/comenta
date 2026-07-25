# Conexões multicanal (Fase 7)

A aba **📲 Conexões** virou um catálogo estilo atendechat: a empresa tem
**várias conexões ao mesmo tempo**, de tipos diferentes.

## Canais

| Canal                 | Situação                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| 🟢 **WhatsApp**       | **Real** (Baileys, QR). Pode ter **vários números** conectados juntos. |
| 🌐 **Widget do site** | **Ativo** por padrão (o chat do site).                                 |
| 📸 Instagram Direct   | Encaixe pronto — requer token da Meta.                                 |
| 💬 Facebook Messenger | Encaixe pronto — requer token da página.                               |
| ✈️ Telegram           | Encaixe pronto — requer token do @BotFather.                           |
| ✉️ E-mail             | Encaixe pronto — requer IMAP/SMTP.                                     |

"Encaixe pronto" = a conexão existe (linha, status, tela de configuração e
endpoints); a integração real com o provedor entra por cima quando você informa
as credenciais. Nada é marcado como "conectado" sem estar de fato.

## Como usar (admin)

- **Adicionar conexão**: aba Conexões → clique no canal desejado (chip).
- **WhatsApp**: no card, **Conectar** → leia o QR no celular. Pode repetir para
  **vários números** — cada card é um número independente.
- **Outros canais**: **Configurar** → cole as credenciais (JSON) → **Salvar e
  conectar**.
- **Remover** encerra a sessão (no WhatsApp faz logout) e apaga a conexão.

Atendentes veem os canais e o status, mas só admins criam/conectam/removem.

## Por baixo

- Cada conexão é uma linha em `channels` (type, name, status, config).
- As sessões de WhatsApp agora são indexadas por **id da conexão** (não mais por
  empresa), o que permite múltiplos números. As credenciais de cada número ficam
  em `WHATSAPP_DATA_DIR/<channelId>`. A pasta legada (por empresa) é migrada
  automaticamente na primeira conexão, preservando o número já pareado.
- O envio outbound (respostas/bot) usa qualquer sessão de WhatsApp conectada da
  empresa.

### API

- `GET /channels` — lista + catálogo de tipos
- `POST /channels {type,name}` — cria conexão (admin)
- `PATCH /channels/:id {name?,config?}` — renomeia / salva config (admin)
- `DELETE /channels/:id` — remove (admin)
- `POST /channels/:id/connect` · `POST /channels/:id/disconnect` (admin)
- `GET /channels/:id/status` — status ao vivo (painel faz polling no WhatsApp)
