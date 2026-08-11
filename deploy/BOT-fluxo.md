# Bot de fluxo / Respostas automáticas — Comenta

Regras que respondem ou roteiam a conversa **sozinhas** quando o cliente escreve.
Rodam nas mensagens recebidas (chat do site e WhatsApp). A resposta do bot
aparece no painel, no chat do site e vai ao WhatsApp do cliente (se conectado).

## Pelo painel (recomendado)

No admin há a aba **🤖 Automações**: escolha o tipo, preencha e clique em
**Criar regra**. Dá para **pausar/ativar** e **remover** cada regra na lista, sem
tocar em curl. É a forma mais simples de gerenciar o bot de fluxo.

## Pela API (opcional / integrações)

Se preferir automatizar a criação das regras, use a API (admin). Pegue o token
do painel (Bearer) fazendo login, ou use uma API Key:

```bash
# token de admin (troque a senha se você mudou)
curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@comenta.com.br","password":"comenta123"}'
# copie o valor de "token" e use no lugar de SEU_TOKEN abaixo
```

## Tipos de regra

### 1. Boas-vindas (`welcome`) — responde na 1ª mensagem

```bash
curl -X POST http://localhost:4000/automations \
  -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Boas-vindas","type":"welcome",
       "config":{"message":"Olá! 👋 Recebemos sua mensagem e já vamos te atender."}}'
```

### 2. Fora do horário (`business_hours`) — responde só fora do expediente

```bash
curl -X POST http://localhost:4000/automations \
  -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Fora do horário","type":"business_hours",
       "config":{"days":[1,2,3,4,5],"start":"09:00","end":"18:00",
       "message":"Estamos fora do horário de atendimento (seg–sex, 9h–18h). Retornamos em breve!"}}'
```

`days`: 1=segunda … 7=domingo. Horário do servidor.

### 3. Palavra-chave (`keyword`) — responde quando a mensagem contém termos

```bash
curl -X POST http://localhost:4000/automations \
  -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Preços","type":"keyword",
       "config":{"keywords":["preço","valor","planos","quanto custa"],
       "reply":"Nossos planos: Free (R$0), Pro (R$99/mês) e Business (R$299/mês). Quer que eu te passe para Vendas?"}}'
```

## Gerenciar

- Listar: `GET /automations`
- Ligar/desligar ou editar: `PATCH /automations/{id}` `{"isActive":false}`
- Remover: `DELETE /automations/{id}`

> Observação: `welcome` e `business_hours` disparam na primeira mensagem da
> conversa; `keyword` dispara sempre que a mensagem do cliente casar. As regras
> são independentes — pode ter várias ativas ao mesmo tempo.
