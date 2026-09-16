# Resultado dos testes — prontidão para produção

Testes executados numa stack real (PostgreSQL 16 + Redis 7 + API) subida no
ambiente, com WhatsApp em modo demonstração. Data: 2026-07-24.

## Resumo

- **Smoke test oficial:** 13 / 13 ✅
- **Funcionalidades novas:** todas passaram ✅
- **Isolamento multi-tenant:** verificado ✅
- **Segurança (auth + gating de admin):** verificado ✅
- **Builds:** API (`tsc`) e Painel (`vite`) verdes ✅

---

## 1. Smoke test (13/13)

signup empresa+admin · auth/me com plano · criar contato · conversa+mensagens ·
listar conversas · detalhe com mensagens · enviar mensagem do atendente ·
dashboard/metrics · criar API key · autenticar via X-API-Key · criar webhook ·
endpoint IA responde (503 sem chave) · OpenAPI /docs.

## 2. Funcionalidades novas

| Área                              | Teste                                                   | Resultado |
| --------------------------------- | ------------------------------------------------------- | --------- |
| Contatos                          | criar + import em massa (CSV)                           | ✅        |
| Filas / Respostas / Tags / Cursos | seed da empresa demo (4/4/4/4)                          | ✅        |
| Usuários                          | criar atendente (admin)                                 | ✅        |
| Automações                        | criar tipo `ai`, `rating`, `keyword`                    | ✅        |
| NPS                               | `GET /ratings` (métricas) + bloco `rating` no dashboard | ✅        |
| Chat da equipe                    | enviar + listar (polling incremental)                   | ✅        |
| Campanhas                         | criar (público "todos" e por "tag")                     | ✅        |
| Campanhas                         | disparar → `status=done`, `sent=5`                      | ✅        |
| Canais                            | criar WhatsApp + conectar (demo) + status               | ✅        |

## 3. Isolamento multi-tenant

- Empresa B **não vê** contatos da Empresa A ✅
- Empresa B recebe **404** ao tentar abrir campanha da A ✅
- Chat da equipe **isolado** por empresa ✅

## 4. Segurança

- Login com senha errada → **401** ✅
- Rota sem token → **401** ✅
- Atendente (agente) criando fila/usuário/campanha → **403** ✅
- Atendente acessando chat da equipe (permitido) → **200** ✅

---

## ⚠️ Pendências ANTES de abrir para produção

### CRÍTICO

1. **Credenciais padrão do seed.** No boot, o `seed.ts` cria
   `admin@comenta.com.br` / `comenta123` e 7 atendentes / `agente123`, **sem
   distinção de ambiente**. Em produção, qualquer um que conheça esses padrões
   entra. **Ação:** trocar a senha do admin imediatamente após o primeiro deploy
   **e/ou** limitar o seed de demonstração a ambientes não-produtivos
   (`NODE_ENV !== "production"`). _(Posso implementar esse gate se você quiser.)_
2. **Segredos de produção no `.env`.** Definir `JWT_SECRET` e
   `JWT_REFRESH_SECRET` reais (a API já **recusa subir** em produção com o
   segredo `dev-…`, o que é bom). Definir `DATABASE_URL`/`REDIS_URL` de produção.

### IMPORTANTE

3. **Chave do Ghost exposta** (colada no chat anteriormente) — **regenerar** em
   Ghost → Settings → Integrations e trocar no `.env`.
4. **`ANTHROPIC_API_KEY`** ainda é placeholder → a IA (autoatendimento, resumo,
   sugestão) fica **inativa** até colar a chave real.
5. **WhatsApp real não foi testado aqui** (só modo demo — QR não roda neste
   ambiente). Validar no Mac/servidor: gerar QR, parear, cair a internet e
   reconectar, enviar/receber texto e mídia, e a **sincronização de agenda**.

### OBSERVAÇÃO DE PRODUTO

6. **Empresas novas (signup) nascem vazias** — sem filas/respostas/tags padrão
   (só a empresa demo é populada pelo seed). Para um onboarding melhor, considerar
   semear alguns itens padrão por empresa no signup. _(Não é bug; é decisão de
   produto.)_

---

## Ainda não testável automaticamente (validar manualmente)

- Fluxo real de WhatsApp (Baileys/QR) — ver item 5.
- Envio de campanha **entregando no WhatsApp** de verdade (aqui só registrou a
  mensagem na conversa, pois não há número pareado).
- Captura de nota do NPS ponta-a-ponta pelo WhatsApp (testado o registro; a
  captura via inbound depende de número pareado).
- Interface do painel nos temas claro/escuro (renderização visual).
