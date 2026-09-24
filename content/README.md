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

## Charges no Canva (padrão atual: caricatura a partir da foto real, montada no Canva)

A charge é feita **inteira no Canva**, pelo conector, em 1600×900, como um
chargista de jornal: o personagem é desenhado a partir da foto real e
licenciada, a cena conta a história, e balão, legenda, selo e assinatura são
elementos do design (fontes Anton e Roboto Condensed do modelo).

1. **Foto real com licença** — `node imagens.mjs "Nome" --bancos=wikimedia
   --baixar=N` (Câmara, Senado, TSE, Planalto, Agência Brasil); enviar ao
   Canva com `create-upload-url`.
2. **Arte** — `generate-image` com a foto como `imageReferences` e um prompt de
   charge de jornal (nanquim + aquarela, caricatura fiel mas exagerada, cena
   com os objetos e figurantes que contam a história, área de céu livre para
   o balão, sem texto). Gerar 2 variações e escolher.
3. **Montagem** — copiar o modelo `DAHWDzwR5c0` ("Charge HOJE MT v2"), abrir
   transação e trocar: a arte (`update_fill` no retângulo de fundo), o texto
   do balão (fala REAL da pessoa, citada na matéria) e a legenda (Anton, faixa
   inferior). A linha de rodapé é fixa: "Charge: HOJE MT · hojemt.com.br".
   Commit e `export-design` JPG/PNG 1600×900.
4. **Instagram em retrato** — post de feed sai em **4:5 (1080×1350)**, nunca
   em 16:9: gerar a arte de novo com `aspectRatio: PORTRAIT_4_5` (mesmo
   prompt e mesma foto de referência, pedindo céu livre no topo para o balão
   e a ação no meio/baixo) e montar no modelo retrato `DAHWEJf2P1U`
   ("Charge HOJE MT · Instagram retrato"). O 16:9 é só para o site.
5. **Arquivo** — `content/pautas/charges/<data>-<slug>.webp` (site, 16:9),
   `…-instagram-retrato.jpg` (4:5) + `.json` com os ids do Canva, o
   crédito/licença da foto de referência, a fala do balão e o permalink do
   Instagram.

Regras: só foto com licença explícita como referência; o balão só traz frase
que a pessoa disse de fato (com fonte na pauta); selo CHARGE sempre visível;
**a única referência pública é "Charge: HOJE MT"** — na imagem, na legenda do
Instagram e na legenda do site não entra crédito de foto nem de banco de
imagens (a origem e a licença da foto de referência ficam só no `.json` da
pauta, para consulta interna); nada de crime, violência ou humilhação
atribuídos ao personagem; sem logos nem bandeiras de partido; a arte tem de
parecer desenho, nunca foto.
Fotomontagem (foto recortada sobre cena) fica só como recurso eventual. O
gerador por Gemini (`ilustrar.mjs`, abaixo) é alternativa sem Canva.

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
| `node reel.mjs <imagem> [--duracao=12] [--zoom=1.12]` | Transforma uma charge ou card (4:5 ou 16:9) num **Reel 9:16** (1080×1920): movimento lento de câmera, fundo desfocado, marca-d'água e faixa de áudio silenciosa (o Instagram exige áudio). Saída em `pautas/videos/<nome>-reel.mp4`; hospede com `upload-ghost.mjs` e publique com `publish_video`. |
| `node reel-arquivo.mjs <spec.json> [--so=corte\|completo]` | Formato **Arquivo HOJE MT**: vídeo antigo (TV, redes) vira Reel 9:16 com etiqueta, gancho, legendas queimadas (transcrição do faster-whisper + correções), crédito da origem, moldura e cartela final "E depois?" com fatos datados; gera versão completa e corte por trechos. Spec em `pautas/videos/<nome>.arquivo.json`. |
| `node upload-ghost.mjs [--json] arquivo…` | Sobe imagem (`images.upload`) ou vídeo (`media.upload`) para o Ghost e imprime a URL pública estável — é o endereço usado nos posts do Instagram (as exportações do Canva expiram em horas). |
| `node imagem-post.mjs --slug=… --imagem=… [--legenda="Charge: HOJE MT"] [--alt=…]` | Troca a imagem de destaque de um post do Ghost pela charge/card local (registra a imagem antiga na saída). |
| `node ghost-settings.mjs [--get=chave] [--set chave=valor|@arquivo]` | Lê as configurações de marca do Ghost (título, logo, ícone, capa, cores…). O `--set` sobe o arquivo e tenta gravar, mas a Admin API Key **não tem permissão** para `settings`: capa, logo e ícone se trocam no painel (Settings → Design & branding). |
| `node instagram-dm.mjs --responder-comentarios [--todos] --responder-directs [--janela=20] [--dry-run]` | Responde leitores pelo Direct: quem comenta pedindo a matéria recebe o link em mensagem privada; quem manda Direct recebe a matéria pedida ou as 3 últimas manchetes. Roda sozinho no GitHub Actions a cada 15 min (`.github/workflows/instagram-leitores.yml`). |
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

## Instagram: agenda intercalada e agendamento

Para engajar melhor, o feed do @hoje.mt **intercala formatos**: card de
notícia → charge → carrossel ou vídeo → charge, em quatro horários por dia
(07:30, 11:30, 15:30 e 19:30, hora de Cuiabá). A fila fica em
`pautas/agenda-instagram.json`: cada item tem `quando` (ISO com `-04:00`),
`formato` (`card`, `charge`, `carrossel`, `video`), `midia` (URLs estáveis
no Ghost), `legenda` (≤ 2.200 caracteres), `status`, `permalink` e
`publicado_em`.

- **Agendamento** — a API do Instagram não agenda nem edita posts. Uma
  Routine da sessão do Claude (cron `30 11,15,19,23 * * *`, UTC) publica o
  item mais antigo com `status: "agendado"` cujo horário já passou, busca o
  permalink na Graph API, grava `publicado`/`permalink`/`publicado_em`,
  atualiza `instagram-links.json` (para o Direct) e faz commit. Para
  reprogramar um item, mude `quando`; para tirar da fila, `status:
  "cancelado"`; para acrescentar, copie um item e hospede a mídia com
  `upload-ghost.mjs`.
- **Como publica** — imagem e carrossel: Zapier → Instagram for Business →
  `publish_media_v2` (`media` com 2–10 URLs vira carrossel); vídeo (Reel
  9:16): `publish_video` com a URL do `.mp4` em `/content/media/`.
- **Materiais** — card: `card.mjs` (JSON em `pautas/cards/`); carrossel:
  vários cards 1080×1350 (capa + 1 slide por notícia, chapéu numerado);
  vídeo: `reel.mjs` a partir da charge em retrato; charge: seção "Charges no
  Canva" acima (sempre 4:5 no Instagram).

## Direct do Instagram: compartilhar e responder leitores

**Compartilhar uma matéria no Direct (manual)** — no app, abra o post do
@hoje.mt → toque no **avião de papel** (Compartilhar) → escolha as pessoas
ou grupos → **Enviar**; ou toque em **⋯ → Copiar link** e cole na conversa.
Para uma matéria do site sem post, mande a URL `hojemt.com.br/<slug>` na
conversa (o Instagram gera a prévia). Nos Stories: **Adicionar post ao seu
story** + figurinha de **link** apontando para a matéria. No desktop
(instagram.com): ícone de avião embaixo do post → Send.

**Automação (`instagram-dm.mjs` + `.github/workflows/instagram-leitores.yml`)**
— a cada 15 min o GitHub Actions responde, dentro do que a Meta permite:

- comentário novo pedindo a matéria ("link", "manda", "quero", "fonte",
  "onde leio"…) → o leitor recebe **no Direct** o link da matéria (private
  reply) e um "te enviamos no Direct 📩" no post; com `todos = true`, todo
  comentário novo recebe o link;
- Direct em que a **última mensagem é do leitor** (janela de 24 h) → recebe
  a matéria pedida (procura o tema nas manchetes do RSS) ou as 3 últimas
  manchetes com link.

Segredos em Settings → Secrets and variables → Actions: `IG_USER_ID`
(17841460614185827) e `IG_ACCESS_TOKEN` (token de longa duração com
`instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`;
gerado no app do Meta for Developers com a conta @hoje.mt conectada; no
app do Instagram, ative em Configurações → Mensagens → **Permitir acesso a
mensagens** para ferramentas conectadas). Teste sem enviar: Actions →
"Instagram — responder leitores" → Run workflow com `dry_run = true`. O mapa
`pautas/instagram-links.json` (permalink → matéria) garante o link certo; sem
entrada, o script procura a URL na legenda e depois manchete parecida.

**O que a automação não faz (e por quê)** — não manda mensagem a quem nunca
falou com a conta, não envia em massa e não usa lista de seguidores de
outras contas: a API do Instagram só permite responder a quem escreveu
primeiro (comentário ou Direct, janela de 24 h) e não expõe seguidores de
terceiros; raspar essa lista viola os Termos da Meta e derruba a conta.
Para alcançar o público das concorrentes, os caminhos legítimos são: anúncios
no Meta Ads com público por interesse (notícias de MT, política, agro) e
público semelhante ao dos seguidores do @hoje.mt; posts em **Collab** com
perfis parceiros; chamada nos posts ("comente LINK que mandamos no Direct" —
o bot responde); Stories com figurinha de link; e Reels, que o algoritmo
distribui para quem não segue.

## Capa da publicação (Ghost → Design → Publication cover)

Design no Canva `DAHWEeS_MbI` (2400×1200): panorama de Mato Grosso
(Pantanal, Chapada, lavoura, horizonte de Cuiabá) com a **logo oficial do
site** (`assets/hojemt-logo-site.svg`, a mesma do cabeçalho) num painel
branco e o slogan "O jornal de Mato Grosso e do Brasil". Arquivo:
`assets/capa-publicacao.jpg`. A Admin API Key não grava `settings`, então a
capa entra pelo painel: Settings → Design & branding → **Publication cover →
Upload cover** → Save.

## Prévia no WhatsApp (título sem imagem)

**Causa encontrada (24/09):** o tema em produção tem o modal de vídeo
(`<div id="hmt-vm">` + `<script>`) dentro do `<head>`, antes de
`{{ghost_head}}`. Pelo padrão HTML, um `<div>` no `<head>` fecha o head; os
parsers estritos (o do WhatsApp) passam a ler as tags `og:*` como corpo e
montam a prévia só com o `<title>`: sem descrição e sem imagem. O Facebook
tolera, o WhatsApp não. A chave da Admin API não tem permissão para temas, então
a correção vai pelo servidor: `deploy/corrigir-head-tema.sh` (move o bloco para
o fim do `<body>` e reinicia o Ghost). No tema do repositório o modal já está
no lugar certo (`partials/video-modal.hbs`, incluído antes de `{{ghost_foot}}`).

**Segunda causa:** imagens de compartilhamento em WebP e em retrato
(1080×1350). O WhatsApp não renderiza WebP e mostra retrato só como miniatura.
`og-whatsapp.mjs` gera um JPEG 1200×630 (< 300 KB) a partir da `og_image` (ou
da `feature_image`, com `--da-destaque`) e grava em `og_image`/`twitter_image`.
Já rodou para todos os posts que apontavam para WebP e para as 12 charges.

Para testar depois da correção: o WhatsApp guarda a prévia por URL durante
dias; mande o link com um sufixo novo (`?v=2`) ou use o depurador do Facebook
(developers.facebook.com/tools/debug → "Buscar novamente").

## Arquivo HOJE MT (vídeos antigos que voltam a viralizar)

Formato fixo para resgatar vídeos antigos (entrevistas, discursos, TV) que estão
circulando de novo: Reel 9:16 em fundo verde HOJE MT com etiqueta
"ARQUIVO HOJE MT · <mês/ano>", gancho em 3 linhas (factual, sem adjetivo),
o vídeo original recortado e emoldurado, **legendas queimadas** (o áudio antigo
costuma ser ruim), crédito da origem na tela e uma cartela final "E depois?"
com o que aconteceu com cada personagem, sempre com data e fonte na pauta.

Passo a passo: 1) baixar o vídeo (`yt-dlp`; para TikTok, o script lê a
página e baixa o `playAddr`, ver pauta de 24/09); 2) transcrever com
faster-whisper (`pip install faster-whisper`, modelo `small`, pt) e salvar
o JSON em `pautas/videos/`; 3) medir a região do vídeo dentro do quadro
(`recorte`); 4) escrever o `<nome>.arquivo.json` (gancho, correções de
nomes na transcrição, trechos do corte, itens do "E depois?" com fonte na pauta
.md); 5) `node reel-arquivo.mjs spec.json`; 6) `upload-ghost.mjs` e entrada na
agenda do Instagram (`formato: video`). Regras: nunca cortar a fala de forma
que mude o sentido; manter o outro lado quando ele aparece no vídeo; crédito da
emissora/autor sempre; nada de trilha sem licença (o áudio é o original).
