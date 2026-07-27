# Conexões multicanal (Fase 7)

A aba **📲 Conexões** virou um catálogo estilo atendechat: a empresa tem
**várias conexões ao mesmo tempo**, de tipos diferentes.

## Canais

| Canal                 | Situação                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| 🟢 **WhatsApp**       | **Real** (Baileys, QR). Pode ter **vários números** conectados juntos. |
| 🌐 **Widget do site** | **Ativo** por padrão (o chat do site).                                 |
| 📸 **Instagram Direct**   | **Real** (Graph API). Requer conta profissional + página + token.  |
| 💬 **Facebook Messenger** | **Real** (Graph API). Requer página + token da página.             |
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

## Meta (Instagram Direct + Facebook Messenger)

Os dois canais compartilham a mesma Graph API, o mesmo formato de webhook e o
mesmo token de página — por isso um adaptador só (`src/channels/meta.ts`).

### O que você precisa

No protótipo existe **um app da Meta** para toda a instalação. Os segredos do
app ficam no ambiente da API; só o que é da página o admin cola no painel.

| Onde                  | Variável / campo     | O que é                                        |
| --------------------- | -------------------- | ---------------------------------------------- |
| `.env` da API         | `META_APP_SECRET`    | App Secret, usado para conferir a assinatura    |
| `.env` da API         | `META_VERIFY_TOKEN`  | Você inventa; repete no painel da Meta          |
| Painel → Configurar   | `pageId`             | ID da página do Facebook                        |
| Painel → Configurar   | `igAccountId`        | ID da conta do Instagram (só no canal IG)       |
| Painel → Configurar   | `pageAccessToken`    | Token **da página**, longa duração               |

Uma conexão pode sobrescrever `appSecret`/`verifyToken` no próprio config
quando a empresa trouxer o app dela.

### Webhook

Cadastre no painel da Meta: `https://api.SEU-DOMINIO/webhooks/meta`

- `GET` responde ao handshake devolvendo o `hub.challenge` como texto puro.
- `POST` recebe os eventos. A rota é pública (a Meta não manda JWT); o que prova
  a origem é o HMAC `X-Hub-Signature-256` sobre o **corpo cru**. Assinatura que
  não fecha → 403, e nada é gravado.

Mensagem que chega vira contato (identificado pelo PSID/IGSID em
`contacts.external_id`, porque a Meta não entrega telefone), conversa amarrada à
conexão e mensagem de entrada — mesmo caminho do WhatsApp, em
`src/channels/inbound.ts`. Ecos da própria resposta são descartados.

### Limite da plataforma (não é escolha nossa)

A Meta só permite responder **dentro de 24h** contadas da última mensagem do
usuário. Fora da janela a Graph API recusa o envio (erro 10). **Não existe
disparo em massa** por estes canais: a conversa é sempre iniciada por quem
escreve para a página.
