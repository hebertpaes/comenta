# Ferramentas open-source — Comenta (Fase 5)

Ferramentas livres que ampliam o Comenta como **produto**, **serviço** e
**treinamento** para a equipe. São **opt-in**: não sobem com o stack normal;
você liga só as que quiser. No painel há a aba **🧩 Ferramentas** com a
descrição, o uso na empresa e um roteiro de treinamento de cada uma.

## Ligar / desligar

Na pasta `deploy`:

```bash
# ligar as três (ou escolha: n8n metabase nocodb)
docker compose --profile tools up -d n8n metabase nocodb

# desligar
docker compose --profile tools down
```

Os dados de cada ferramenta ficam em volumes próprios (`n8n_data`,
`metabase_data`, `nocodb_data`), então sobrevivem a reinícios.

## As ferramentas

### 🔗 n8n — automação (http://localhost:5678)
Orquestra fluxos por webhooks e conecta o Comenta a centenas de apps sem código.
Casa direto com os **webhooks do Comenta** (evento `conversation.created`,
`message.created`, `conversation.updated`).

Treinamento rápido:
1. Suba o n8n e crie a conta local (1º acesso).
2. Novo workflow → nó **Webhook** → copie a URL de teste/produção.
3. No painel do Comenta, cadastre essa URL em Webhooks.
4. Adicione nós (e-mail, Google Sheets, Slack…) e ative o workflow.

Veja também `AUTOMACAO-n8n.md` para exemplos dos payloads.

### 📊 Metabase — BI e relatórios (http://localhost:3001)
Dashboards sobre os dados de atendimento. (O site usa a 3000, então o Metabase
publica na 3001.)

Treinamento rápido:
1. Suba o Metabase e crie o admin (1º acesso).
2. Conecte no Postgres do Comenta — host `postgres`, banco `comenta_saas`,
   usuário `comenta` (mesma senha do `.env`, `DB_PASSWORD`). Como os containers
   estão na mesma rede Docker, o host é o nome do serviço `postgres`.
3. Monte perguntas (Questions) e agrupe em um Dashboard.
4. Agende o envio dos relatórios por e-mail.

> Somente leitura: crie um usuário de banco só-leitura se for dar acesso a mais
> pessoas. Não exponha a porta para fora do `127.0.0.1`.

### 🗂️ NocoDB — banco no-code (http://localhost:8090)
Planilhas inteligentes / mini-CRM que a equipe monta sozinha (tipo Airtable).

Treinamento rápido:
1. Suba o NocoDB e crie o admin (1º acesso).
2. Nova Base → importe uma planilha ou comece do zero.
3. Crie visões (grade, kanban, calendário).
4. Gere uma API/webhook para integrar com o n8n.

## Notas
- Tudo escuta só em `127.0.0.1` (localhost). Para produção, publique atrás do
  Nginx com TLS e autenticação, como os demais serviços.
- São imagens `:latest` para facilitar o teste local; em produção, fixe versões.
