# Robô de conteúdo do blog (Ghost)

Curadoria automática: puxa de **fontes de notícias reais** (RSS), a IA (Claude)
escreve um resumo **original em PT-BR com crédito e link para a fonte**, e
publica no **Ghost**. Cada matéria traz uma foto real da própria fonte (quando
disponível) e um selo de curadoria.

## Princípio de responsabilidade

- **Nunca inventa fatos.** O resumo é feito apenas a partir do que a fonte
  publicou, sempre com atribuição e link.
- **Rascunho por padrão** (`BLOG_AUTOPUBLISH=0`): a matéria entra no Ghost como
  _draft_ para revisão humana antes de publicar. Só publica sozinho se você
  ligar `BLOG_AUTOPUBLISH=1` (aí sai como curadoria com fonte).
- Imagens são a **foto real da fonte** ou ilustração marcada — nunca uma imagem
  de IA passando por foto verdadeira de um fato.

## Configurar (1 vez)

1. No Ghost: **Settings → Integrations → Add custom integration** → copie a
   **Admin API Key** (formato `id:secret`).
2. Coloque no `deploy/.env`:
   ```
   GHOST_ADMIN_API_KEY=xxxxxxxx:yyyyyyyy
   ANTHROPIC_API_KEY=sk-ant-...   # opcional (liga o resumo por IA)
   BLOG_AUTOPUBLISH=0             # 0 = rascunho (recomendado)
   ```
3. Edite `content/feeds.json` com as fontes que você confia.

## Rodar

**Via Docker (recomendado), a partir de `deploy/`:**

```bash
# uma rodada agora
docker compose --profile bot run --rm blog-bot

# em loop (defina BLOG_INTERVAL_MIN=60 no .env antes)
docker compose --profile bot up -d blog-bot
```

**Direto com Node (a partir de `content/`):**

```bash
npm install
GHOST_ADMIN_URL=http://localhost:2368 GHOST_ADMIN_API_KEY=... node publish.mjs --once
```

## Variáveis

| Var                   | Efeito                                                                             |
| --------------------- | ---------------------------------------------------------------------------------- |
| `GHOST_ADMIN_URL`     | URL do Ghost (default `http://localhost:2368`; no compose usa `http://ghost:2368`) |
| `GHOST_ADMIN_API_KEY` | Admin API Key do Ghost (`id:secret`) — obrigatória                                 |
| `ANTHROPIC_API_KEY`   | Liga o resumo por IA; sem ela, usa o trecho da fonte                               |
| `BLOG_AUTOPUBLISH`    | `1` publica, `0` rascunho (padrão)                                                 |
| `BLOG_INTERVAL_MIN`   | `>0` roda em loop a cada N min                                                     |
| `BLOG_PER_FEED`       | itens por feed por rodada (default 3)                                              |

Idempotente: cada matéria vira um `slug` estável derivado da URL da fonte, então
rodar várias vezes não duplica posts.
