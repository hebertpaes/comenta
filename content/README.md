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
  de IA passando por foto verdadeira de um fato. As ilustrações geradas
  (`ilustrar.mjs`) saem com o selo **CHARGE · HOJE MT** / **ILUSTRAÇÃO · HOJE MT**
  queimado na imagem e o prompt proíbe rosto de pessoa real.

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

| Var                   | Efeito                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `GHOST_ADMIN_URL`     | URL do Ghost (default `http://localhost:2368`; no compose usa `http://ghost:2368`)       |
| `GHOST_ADMIN_API_KEY` | Admin API Key do Ghost (`id:secret`) — obrigatória                                       |
| `ANTHROPIC_API_KEY`   | Liga o resumo por IA; sem ela, usa o trecho da fonte                                     |
| `BLOG_AUTOPUBLISH`    | `1` publica, `0` rascunho (padrão)                                                       |
| `BLOG_INTERVAL_MIN`   | `>0` roda em loop a cada N min                                                           |
| `BLOG_PER_FEED`       | itens por feed por rodada (default 3)                                                    |
| `GEMINI_API_KEY`      | Liga a ilustração realista (`ilustrar.mjs`); chave em https://aistudio.google.com/apikey |
| `BLOG_IMAGEM_MODELO`  | Modelo de imagem do Gemini (default `gemini-2.5-flash-image`)                            |
| `BLOG_TEXTO_MODELO`   | Modelo que descreve a cena e escreve a frase (default `gemini-2.5-flash`)                |

Idempotente: cada matéria vira um `slug` estável derivado da URL da fonte, então
rodar várias vezes não duplica posts.

## Ilustrações realistas (Curtas, charges e matérias sem foto)

As charges da seção **Curtas & Bastidores** eram desenhos vetoriais (bonecos
geométricos). `ilustrar.mjs` troca cada uma por uma cena realista:

1. `gemini-2.5-flash` lê a matéria e descreve **uma cena** (sem texto na
   imagem), escreve a frase curta da charge e lista os **personagens**: as
   figuras públicas citadas (prefeito, deputado, ministro…), no máximo 3;
2. para cada personagem, `lib/imagens.mjs` procura a **foto real com licença**
   (Wikimedia Commons: Câmara, Senado, TSE, Planalto, Agência Brasil) e a
   entrega ao modelo de imagem como referência;
3. `gemini-2.5-flash-image` desenha a cena em 16:9 no estilo de charge de
   jornal (caricatura reconhecível a partir da foto, traço de desenho, nunca
   aparência de foto) — ou, com `--tipo=ilustracao`, uma cena com aparência de
   foto **sem** nenhuma pessoa real reconhecível;
4. o `sharp` compõe por código a frase (faixa inferior) e o selo — texto em
   português com acento não passa pelo modelo de imagem, então sai certo;
5. com `--publicar`, envia o WebP 1600×900 ao Ghost e troca a `feature_image`
   do post (a antiga, a cena, os personagens e o crédito/licença de cada foto
   de referência ficam registrados em `saida/<slug>.json`).

Controle dos personagens: `--personagens="Abilio Brunini (prefeito de Cuiabá)"`
fixa a lista; `--referencias="Abilio Brunini=fotos/abilio.jpg"` usa fotos já
escolhidas (baixe com `imagens.mjs`); `--sem-personagens` desenha todo mundo
genérico. Regras fixas no prompt: só quem tem foto de referência pode ser
reconhecível; etnia, idade e gênero como na foto; nada de crime, violência,
humilhação ou nudez atribuídos ao personagem; sem texto, logos ou bandeiras
de partido; selo CHARGE sempre queimado na imagem.

```bash
cd content && npm install
export GHOST_ADMIN_URL=https://hojemt.com.br GHOST_ADMIN_API_KEY=id:secret GEMINI_API_KEY=...

node ilustrar.mjs --slug=rua-livre-amigo              # só gera: revise saida/rua-livre-amigo.webp
node ilustrar.mjs --slug=rua-livre-amigo --publicar   # gera e troca a imagem do post
node ilustrar.mjs --curtas                            # todas as Curtas que ainda usam charge-*.webp
node ilustrar.mjs --curtas --publicar --limite=5      # publica 5 por vez
node ilustrar.mjs --slug=x --imagem=arte.png --frase="Frase da charge."   # arte feita fora: só legenda + selo
```

Sem `--publicar` nada muda no site. Se o Gemini recusar a cena (bloqueio de
segurança), o post é pulado com o motivo no log; rode de novo ou use `--imagem`.

## Charges no Canva (padrão atual: foto real do personagem sobre cena ilustrada)

A charge é montada **inteira no Canva**, pelo conector, em 1600×900:

1. **Cena sem pessoas** — `generate-image` com a descrição do lugar e dos
   objetos que contam a história (estilo aquarela/nanquim de charge), 16:9,
   pedindo espaço livre onde o personagem vai entrar.
2. **Foto real com licença** — `node imagens.mjs "Nome" --bancos=wikimedia
   --baixar=N` (Câmara, Senado, TSE, Planalto, Agência Brasil), enviada ao
   Canva (`create-upload-url`) e recortada com `remove-background`.
3. **Adereços** — o que der graça (chapéu de cozinheiro, capacete, guarda-chuva…)
   gerado como "sticker em fundo branco" e recortado com `remove-background`.
4. **Montagem** — copiar o modelo `DAHWD5FB_nw` ("Charge HOJE MT", 1600×900),
   abrir transação e trocar: cena (`update_fill`), recorte do personagem
   (`update_fill` + `position_element`/`resize_element`), adereço, texto do
   balão (fala REAL do personagem, citada na matéria, entre aspas), legenda da
   faixa inferior e, se mudar, o selo. Commit e `export-design` PNG 1600×900.
5. **Arquivo** — `content/pautas/charges/<data>-<slug>.webp` + `.json` com os
   ids do Canva, o crédito/licença da foto e a fala usada no balão.

Regras: só foto com licença explícita; o balão só traz frase que a pessoa
disse de fato (com fonte na pauta); selo CHARGE sempre visível; nada de crime,
violência ou humilhação atribuídos ao personagem; sem logos nem bandeiras de
partido. O gerador por Gemini (`ilustrar.mjs`, abaixo) fica como alternativa
para quando não houver Canva.

## Kit da redação (pauta → foto → card → Instagram → backup)

Ferramentas de linha de comando, todas em `content/`, para operar a redação sem
depender de Canva ou de edição manual:

| Comando                                                        | O que faz                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node imagens.mjs "termo" [--bancos=…] [--baixar=I --circulo]` | Procura **fotos reais com licença** (Openverse, Wikimedia Commons; Pexels, Pixabay e Unsplash com chave grátis). Só devolve CC BY / BY-SA / CC0 / domínio público / licenças dos bancos, já com a linha de crédito. `--baixar` grava a foto, o `.json` com licença e página de origem, e `--circulo` recorta o retrato redondo (220 px, anel verde). |
| `node card.mjs pauta.json`                                     | Gera o card 1080×1350 no padrão HOJE MT (chapéu, manchete em Anton, sublinha, fontes, crédito) com 0, 1 ou 2 retratos em círculo no canto superior direito. `--exemplo` imprime o JSON modelo.                                                                                                                                                       |
| `node instagram.mjs --imagem=card.jpg --legenda=legenda.txt`   | Sobe a imagem no Ghost (URL pública) e publica no @hoje.mt pela Graph API; `--dry-run` só mostra; `--permalink=<id>` dá o link de um post.                                                                                                                                                                                                           |
| `node ilustrar.mjs --slug=… [--publicar]`                      | Ilustração realista (Gemini + sharp) para Curtas/charges sem foto.                                                                                                                                                                                                                                                                                   |
| `node video.mjs <url\|arquivo.mp4> [--saida=…]`                | Baixa um vídeo (reel, tweet, YouTube; via yt-dlp) e aplica a **marca d'água** do HOJE MT com ffmpeg (`assets/marca-dagua.png`, gerada da logo do tema, sem o slogan). Opções: `--opacidade=0.55`, `--largura=0.32` (fração da largura do vídeo), `--posicao=inferior-direita`, `--margem=34`, `--so-baixar`. Saída H.264/AAC pronta para o Instagram. |
| `deploy/backup-redacao.sh`                                     | `tar.gz` da redação + `git bundle` do repositório em `backups/`, push para o GitHub e, com `RCLONE_REMOTE`, cópia para o Google Drive.                                                                                                                                                                                                               |

Fluxo de uma matéria:

```bash
cd content && npm install
# 1. apure e escreva a pauta em content/pautas/AAAA-MM-DD-assunto.md (regras no README de lá)
# 2. foto real licenciada da pessoa/lugar central
node imagens.mjs "Santiago Peña" --bancos=wikimedia --baixar=1 --nome=pena --saida=fotos --circulo
# 3. card (o JSON leva chapéu, manchete, sublinha, fontes, crédito e as fotos)
node card.mjs --exemplo > pautas/2026-09-23-assunto.json   # edite
node card.mjs pautas/2026-09-23-assunto.json --saida=saida/assunto.jpg
# 4. legenda (≤ 2.200 caracteres, fontes no fim) e publicação
node instagram.mjs --imagem=saida/assunto.jpg --legenda=pautas/2026-09-23-assunto.legenda.txt --dry-run
node instagram.mjs --imagem=saida/assunto.jpg --legenda=pautas/2026-09-23-assunto.legenda.txt
# 5. registre o permalink na pauta e faça o backup
../deploy/backup-redacao.sh
```

Vídeo: `pip install yt-dlp imageio-ffmpeg` (ou ffmpeg no PATH / `FFMPEG_BIN`). O
Instagram limita downloads anônimos (HTTP 429): espere alguns minutos e repita.
Vídeo de terceiros só com crédito visível ao autor e, quando não for material
oficial ou de agência, com autorização.

Variáveis extras: `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY`
(bancos opcionais), `IG_USER_ID` e `IG_ACCESS_TOKEN` (Graph API do Instagram),
`RCLONE_REMOTE` (Drive). As fontes Anton e Roboto Condensed (licença OFL) estão
em `content/assets/fonts`.

Regra das imagens: foto de banco **ilustra** e leva crédito e licença no
rodapé do card; retrato de pessoa real só de fonte oficial ou banco com
licença; nunca imagem gerada por IA se passando por foto.
