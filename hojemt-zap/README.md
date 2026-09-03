# hojemt-zap — Ghost → WhatsApp

Ponte que recebe o webhook **post.published** do Ghost (HojeMT) e envia a
chamada da matéria — título, resumo e link — para grupos e canais do
WhatsApp via **WAHA** (padrão) ou **Evolution API**.

```
Ghost (matéria publicada) ──webhook──▶ hojemt-zap (:3900) ──API──▶ WAHA (:8080) ──▶ WhatsApp
```

O repositório também carrega os **banners dos cursos ABACS** em `banners/`
(GIF animado, PNG e vinhetas MP4 de 5s) para uso no site e nos vídeos.

## Instalação no servidor (mesmo host do Ghost)

```bash
git clone https://github.com/hebertpaes/hojemt-zap.git
cd hojemt-zap

# 1. WhatsApp (WAHA) em produção
WA_API_KEY=$(openssl rand -hex 24) docker compose -f deploy/docker-compose.waha.yml up -d
# guarde a WA_API_KEY exibida/usada acima

# 2. Ponte como serviço
sudo bash deploy/install.sh
sudo nano /etc/hojemt-zap.env      # preencha WA_API_KEY, WA_CHAT_IDS, WEBHOOK_TOKEN
sudo systemctl restart hojemt-zap
```

### Parear o WhatsApp (uma vez)

Abra o dashboard do WAHA por túnel SSH — `ssh -L 8080:localhost:8080 usuario@servidor`
e acesse `http://localhost:8080/dashboard` (login `admin`, senha = WA_API_KEY) —
inicie a sessão `default` e escaneie o QR com o número que fará os envios.

> Use um número dedicado para o portal, não o pessoal: APIs não oficiais de
> WhatsApp (WAHA/Evolution usam o protocolo do WhatsApp Web) podem levar a
> bloqueio do número se houver abuso/spam. Envio moderado para grupos próprios
> e canal é o caso de uso tranquilo.

### Descobrir os IDs dos grupos/canal

```bash
curl -s -H "X-Api-Key: SUA_CHAVE" "http://localhost:8080/api/default/chats?limit=50" \
  | python3 -m json.tool | grep -B2 '@g.us\|@newsletter'
```

Formatos: grupo `120363...@g.us` · canal `...@newsletter` · contato `5565...@c.us`.
Coloque-os em `WA_CHAT_IDS` (separados por vírgula) no `/etc/hojemt-zap.env`.

### Webhook no Ghost

Admin do Ghost → **Settings → Advanced → Integrations → Add custom integration**
("WhatsApp") → **Add webhook**:

- Event: **Post published**
- Target URL: `http://localhost:3900/webhook/ghost?token=SEU_WEBHOOK_TOKEN`

## Teste manual

```bash
curl -s http://localhost:3900/health
curl -s -X POST "http://localhost:3900/send?token=SEU_WEBHOOK_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"text":"Teste da ponte HojeMT ✅"}'
```

## Evolution API em vez de WAHA

No `/etc/hojemt-zap.env`: `WA_PROVIDER=evolution`, `WA_URL` da Evolution,
`WA_SESSION` = nome da instância e `WA_API_KEY` = apikey. Os destinos aceitam
os mesmos formatos de ID.

## Variáveis (.env)

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta da ponte (padrão 3900) |
| `WA_PROVIDER` | `waha` ou `evolution` |
| `WA_URL` | Base da API do WhatsApp (ex.: `http://localhost:8080`) |
| `WA_API_KEY` | Chave da API (WAHA `X-Api-Key` / Evolution `apikey`) |
| `WA_SESSION` | Sessão (WAHA) ou instância (Evolution) |
| `WA_CHAT_IDS` | Destinos separados por vírgula |
| `WEBHOOK_TOKEN` | Token exigido em `?token=` no webhook |
