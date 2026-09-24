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

## Artes dos artigos no Canva (capas genéricas → ilustração editorial)

Orientação do editor (24/09/2026): **"Crie artes dos artigos com Canva."** Os
artigos de Opinião (e algumas notícias) saem do publicador com uma capa
genérica (quadro verde com ícone: arquivos `opiniao-*.webp` e `capa-*.webp`).
Toda capa genérica deve ser trocada por uma **ilustração editorial feita no
Canva**, marcada como ilustração (nunca uma imagem de IA passando por foto).

Receita (a mesma do artigo "IA sai do PowerPoint…"):

1. Ler o artigo (Admin API, `formats: plaintext`) e descrever **uma cena**
   simbólica que conte a tese do texto, ligando Brasília/mundo ao cotidiano
   de Mato Grosso quando couber (soja, silos, caminhão, cidade do interior).
2. `generate-image` em `LANDSCAPE_16_9` com o prompt-base (orientação do
   editor, 24/09/2026: **"deixa mais realistas; insira os personagens reais,
   como ficção, sem mostrar os rostos"**): *"Ilustração realista em pintura
   digital cinematográfica (não é foto): luz natural dramática, texturas de
   tecido, pele e materiais, profundidade de campo, cores naturais com
   predominância de verdes. Cena de ficção inspirada na notícia: [cena com os
   personagens reais descritos por traços, ex.: 'homem idoso de cabelo e
   barba brancos, terno escuro', 'ministro careca de toga']. Os personagens
   aparecem SEMPRE de costas, de perfil em silhueta ou com o rosto fora de
   quadro — nenhum rosto visível. Sem letras legíveis, sem números, sem logos,
   sem bandeiras identificáveis. Composição horizontal 16:9."*
   Regras: nenhum rosto de pessoa real (nem por foto de referência); a cena é
   ficção e a legenda diz isso; tragédias com vítimas: cena sóbria, sem
   acidente e sem representar as vítimas. O estilo flat/vetorial anterior
   (v1) fica como alternativa para temas abstratos.
3. `copy-design` do modelo `DAHWDzwR5c0`; `read-design open_transaction`;
   `update_fill` no retângulo `LBkRvGTgDLdqhT2c` (+ `crop_media` 0/0/1600/900);
   apagar faixa, balão, legenda, assinatura e rodapé (`LBTbHX2cc1t8MXwC`,
   `LBWHl9zsPzJVjjKc`, `LBr3TrrQqfFvwklc`, `LB9dKGN7nn5gsKLK`,
   `LB8PDqL12zfvm60b`, `LBnGqkBwd82SzW7P`); manter o selo e trocar o texto
   para **ILUSTRAÇÃO · HOJE MT** (shape `LBpQx8DX7cyRdZDh` e texto
   `LBlVKyTHh3yfBnjq` com largura 330 e left 1230); commit; `export-design` jpg.
4. Salvar em `pautas/ilustracoes/<data>-<slug-curto>.jpg`; publicar com
   `imagem-post.mjs --legenda="Ilustração: HOJE MT (gerada com IA; cena de ficção)"` e
   `og-whatsapp.mjs --slug=<slug> --da-destaque`; registrar em
   `pautas/ilustracoes/registro.json` (design, arte, alt, arquivo, URL).

Feitas em 24/09/2026: as 10 de Opinião com `opiniao-*.webp` (CNPJ, Lula e a
ONU ×3, Voo de teste, Brasil Soberano 3, STF ×2, Senado, Limite das
relações). A rotina horária das charges também procura capas `opiniao-*` e
`capa-*` e faz até 2 ilustrações por disparo. Restam ~28 notícias com
`capa-*.webp` (Alta Floresta, Primavera do Leste etc.): nelas, preferir a
**foto real da fonte** quando existir; ilustração só na falta de foto.

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

### Regra: toda charge sai do Canva

Orientação do editor (24/09/2026): **sempre crie as charges no Canva**. A charge
"de bonecos" que o publicador automático das Curtas gera (arquivo
`charge-<timestamp>.webp`) é provisória e deve ser substituída por uma charge
deste fluxo. Uma Routine da sessão do Claude roda de hora em hora, no minuto 25 (o publicador solta as curtas com charge por volta de :10 e :21, então a troca sai em até ~20 min): acha os posts das últimas 3 h com `feature_image` contendo
`/charge-`, faz a charge no Canva (16:9 + 4:5), troca a imagem de destaque e a
og:image, hospeda o 4:5 e o coloca na agenda do Instagram; quando não há post
novo, refaz até 2 antigos às 11h e às 17h (Cuiabá). Foto de referência: só foto
real com licença; `imagens.mjs` descarta imagens de autor "Gemini", "DALL·E",
"Midjourney" etc. (geradas por IA), como a que existe no Commons para Rafaell
Milas. Backlog em 24/09: cerca de 30 curtas com charge
automática.

### Referências de imagem por personagem (usar sempre a mais recente)

Orientação do editor (24/09/2026): **"Deixa o Abílio mais atual com referências
de imagens atuais"** e **"Sempre busque imagens recentes para fazer a montagem da arte"**:
antes de cada charge, procurar a foto oficial mais recente do personagem (galeria da
prefeitura/governo/órgão do mês corrente, foto do TSE 2026) e só então gerar a arte. A caricatura tem de parecer com a pessoa **hoje**, não com
a foto de posse. Antes de gerar a arte, conferir a referência mais recente
abaixo (e atualizar esta tabela quando trocar). As fotos de referência não vão
para o repositório nem para o site: ficam só no Canva, e o `.json` da charge
registra origem, data e crédito.

| Personagem | Visual atual | Referência no Canva | Origem / crédito |
|---|---|---|---|
| Abilio Brunini (prefeito de Cuiabá) | cabeça raspada, sem barba, magro/atlético, **camiseta cinza-escura lisa** (nunca terno e gravata) | `MAHWHiDa8C0` (frontal, 21/09/2026), `MAHWHhg33Yw` (sorrindo, 21/09/2026), `MAHWHkYuCOg` (três quartos, 03/09/2026) | Galeria oficial do prefeito, Prefeitura de Cuiabá (`cuiaba.mt.gov.br/galeria-de-fotos/prefeito-abilio-brunini-fotos`), Foto: Rennan Oliveira/Secom. Divulgação para imprensa, sem licença CC declarada: só como referência de desenho. A antiga (`MAHWDtzNHSM`, Câmara 2023, CC BY) está desatualizada. |
| Flávia Moretti (prefeita de Várzea Grande) | cabelos lisos castanho-claros aloirados na altura do peito, pele clara, sorriso largo | `MAHWIE_abVw` (rosto, 19/09/2026), `MAHWIMIJ4SM` (com microfone, 19/09/2026) | Galeria oficial da Prefeitura de Várzea Grande (Festival Paralímpico, 19/09/2026), Foto: Andre Luis/Secom-VG. Só referência de desenho. A antiga (`MAHWEXj-FW4`, TSE 2024) está desatualizada. |
| Otaviano Pivetta (governador) | careca, óculos redondos de armação escura grossa, sorriso largo, camisa polo azul-marinho | `MAHWH0J-3js` (foto oficial do registro de candidatura, TSE, ago/2026) | TSE/Divulgação. A antiga (`MAHWEbbOGVM`) fica como segunda opção. |
| Candidatos de MT 2026 (governo e Senado) | ver foto oficial | ids em `pautas/eleicoes/2026-mt-candidatos.json` | TSE/Divulgação (registro 2026) |
| Ludio Cabral / Carlos Fávaro / demais | conferir foto do ano corrente antes de gerar | ver `.json` da última charge de cada um | Commons/Agência Brasil/Câmara/Senado (CC BY) ou galeria oficial do órgão |

No prompt da arte, descrever o visual atual em palavras além de passar as fotos
(`imageReferences` com 2 fotos: frontal + três quartos): "cabeça raspada,
careca, sem barba, rosto anguloso e magro, camiseta cinza-escura lisa de gola
redonda, sem terno e sem gravata". Em 24/09/2026 as 8 charges do Abilio
(creche, filtro, onda, rua-livre, luz-que-nao-brilha, luz-no-quintal-alheio,
poste-nao-e-presente, iluminacao-a-conta-dos-muros) foram refeitas com essas
referências (v2), trocadas no site e na agenda do Instagram.

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
| `node video.mjs <url\|arquivo.mp4> [--saida=…]`                | Baixa um vídeo (reel, tweet, YouTube; via yt-dlp) e aplica a **marca d'água** do HOJE MT com ffmpeg (`assets/hojemt-logo-site-branca.png`: a logo oficial do site em branco, fundo transparente; `--marca=` troca). Opções: `--opacidade=0.55`, `--largura=0.32` (fração da largura do vídeo), `--posicao=inferior-direita`, `--margem=34`, `--so-baixar`. Saída H.264/AAC pronta para o Instagram. |
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

## Instagram: crescimento com perfil zero

Plano completo em `pautas/instagram-crescimento.md`: diagnóstico da conta,
as 6 respostas da Regra Zero (nicho "Mato Grosso explicado"), regras de
produção e a sequência de 10 posts (alcance → retenção → prova → CTA leve).
Em resumo:

- Reels de 15 a 35 s e carrosséis de 6 a 8 slides, sempre no Canva, com
  gancho no 1º quadro (número, horário ou pergunta sobre MT), uma ideia por
  quadro e último quadro pedindo para salvar e compartilhar.
- Legenda de até 600 caracteres; o texto longo vai para a matéria.
- Posts da sequência ficam no horário das 19:30; os itens da agenda levam
  `"sequencia": "perfil-zero #N (fase)"`.
- Medição toda segunda: a Routine lê seguidores, curtidas e comentários pela
  API e grava em `pautas/instagram-metricas.json`; alcance, salvamentos e
  retenção só existem no app (Insights) e entram à mão.

## Notícias duplicadas (mesma matéria publicada duas vezes)

O publicador automático, que roda fora deste repositório, às vezes processa a
mesma matéria da fonte duas vezes e publica com títulos e slugs diferentes
(ex.: "Ancelotti conduz 1º treino completo da Seleção em Brisbane" e
"Ancelotti lidera primeiro treino com todos os 26 convocados", com a mesma
foto). Em 24/09/2026 foram despublicadas 31 cópias de 30 notícias
(`pautas/duplicadas/registro.json`).

- `node duplicadas.mjs --dias=3` lista pares candidatos pelo conteúdo: texto
  (sobreposição de palavras), foto de destaque (dHash, ignorando as imagens
  genéricas do publicador) e link da fonte na legenda. **Não despublica
  sozinho**: agenda diária, sorteios diferentes da Mega-Sena, parcelas do
  Bolsa Família em dias diferentes, estados diferentes e matérias de
  continuação parecem duplicata e não são.
- `node duplicadas.mjs --despublicar=copia:mantido` volta a cópia para
  rascunho (nada é apagado) e registra. Mantém a versão mais antiga, salvo se
  ela estiver sem foto ou com erro; em cobertura ao vivo, a atualização.
- Redirecionamentos: a chave da integração não tem permissão para
  `redirects`. As linhas 301 ficam em `pautas/duplicadas/redirects-pendentes.yaml`;
  o editor sobe no Ghost Admin → Settings → Labs → Redirects (o upload
  substitui o arquivo atual: baixe o atual e junte antes).
- Uma Routine roda a cada 3 horas, lê os candidatos e despublica só as
  cópias confirmadas.

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

## Monitor de Tecnologia (IA na prática)

Routine em dias úteis às 06:00 de Cuiabá: procura novidade com fonte primária
sobre IA na indústria, no agro de Mato Grosso e em medição de resultados, e
quando encontra escreve a matéria (rascunho no Ghost, tag Tecnologia), gera a
ilustração no Canva, o card e a entrada na agenda do Instagram. Palavras-chave,
fontes e registro em `pautas/monitor-tecnologia.md`.

## Backup do sistema (GitHub + Google Drive)

Pedido do editor (24/09/2026): **"Salve todas as imagens, baixe no Drive e faça
o backup do sistema no GitHub."**

- **Conteúdo do site** — `node backup-ghost.mjs` exporta posts, páginas, tags,
  autores (sem e-mail), configurações (sem chaves/segredos), newsletters e
  dados do site para `backup/ghost/latest/` (JSON), mais `imagens.txt` com
  todas as mídias referenciadas. Com `--baixar=<pasta>` baixa também todas as
  mídias. O histórico é a sequência de commits no branch (o proxy do GitHub
  desta sessão não aceita push de tags). A chave
  de integração não acessa `db/` (export completo do Ghost) nem `themes/`; o
  tema está versionado em `ghost/content/themes/hojemt`.
- **Automações** — `backup/rotinas.json` guarda id, horário e resumo das
  Routines do Claude (Instagram, charges/artes, monitor de tecnologia, backup)
  para recriação em caso de perda da sessão.
- **Imagens e vídeos produzidos** — versionados neste repositório
  (`pautas/charges`, `pautas/ilustracoes`, `pautas/cards`, `assets`; vídeos
  grandes ficam fora do git e hospedados no Ghost em `content/media`).
- **Google Drive** — pasta "HOJE MT — Backup de imagens e conteúdo" com
  subpastas `artes-hojemt`, `site-imagens` e `conteudo`. Os pacotes .zip
  (artes, vídeos e todas as mídias do site em partes de até 44 MB) são
  hospedados no Ghost em `content/files/` e puxados para o Drive pela ação
  "Google Drive: Upload File" do Zapier a partir dessas URLs (o conector
  Google Drive do Claude só aceita conteúdo em texto/base64, inviável para
  centenas de MB). A lista de URLs de cada rodada fica em
  `backup/pacotes-drive.json`.
- **Rotina diária** — 03:00 (Cuiabá): backup do conteúdo + commit + push.
  Nada de segredos no repositório.

## Candidatos com foto oficial do TSE (matérias de eleições)

Regra do editor (24/09/2026): matérias de eleições podem ilustrar os candidatos, com **foco em Mato Grosso** — e só com **foto real e oficial**. Em notícia, nunca rosto gerado por IA; a charge fica nas Curtas.

- **Fonte das fotos:** foto oficial do registro de candidatura no TSE (arquivo `FMT<SQ_CANDIDATO>_div.jpg` do pacote de dados abertos, 161×225 px). O `cdn.tse.jus.br` e o DivulgaCand bloqueiam acesso de fora do Brasil; use o espelho público do ND Mais (`https://static.ndmais.com.br/eleicoes/2026/mt/FMT<SQ>_div.jpg`, lista em `https://ndmais.com.br/eleicoes/2026/candidatos/mt/governador/` e `/senador/`) ou a página do Senado Notícias (`https://www12.senado.leg.br/noticias/candidatos-2026/mato-grosso`, crédito "Foto: TSE"). Importe no Canva com `upload-asset-from-url`.
- **Dados e ids:** `pautas/eleicoes/2026-mt-candidatos.json` (nome de urna, número, partido, vice, situação, SQ do TSE, `canva_media`). Cópias das fotos em `pautas/eleicoes/fotos-tse/`. Artes e posts trocados em `pautas/eleicoes/registro.json`.
- **Crédito público:** `Fotos: TSE/Divulgação · Arte: HOJE MT` (legenda) e alt com nomes e partidos.
- **Tratamento igual:** nas montagens, todos os candidatos registrados, em ordem alfabética pelo nome de urna, mesmo tamanho; nada de destacar número ou partido de um só.

### Artes prontas (Canva)

| Arte | Design | Arquivo | Uso |
|---|---|---|---|
| Governo de MT, 6 candidatos (16:9) | `DAHWHzo4H18` | `pautas/eleicoes/2026-09-24-candidatos-governo-mt.jpg` | capa de matérias sobre a disputa em geral (balanço, prioridades, pesquisas com todos) |
| Governo de MT, Instagram 4:5 | `DAHWH4_Mmww` | `…-instagram-retrato.jpg` | post "Governo de Mato Grosso: os seis candidatos" (agenda 23) |
| Senado por MT, 10 candidatos (16:9) | `DAHWH1j1gbI` | `pautas/eleicoes/2026-09-24-candidatos-senado-mt.jpg` | matérias sobre a disputa ao Senado |
| Capa de um candidato | `DAHWH3jRQss` (Pivetta promete…) | `…-capa-pivetta-promete-devolver.jpg` | modelo para matéria sobre um candidato (proposta, agenda, entrevista) |
| Capa de dois candidatos | `DAHWH_wMHgw` (debate) | `…-capa-pivetta-wellington-debate.jpg` | modelo para debate/embate entre dois |

### Receita das capas (Canva MCP)

1. `copy-design` do modelo 16:9 `DAHWDzwR5c0`; `read-design open_transaction`; apague todos os elementos do modelo de charge (faixa, balão, legenda, selo, assinatura, rodapé).
2. `insert_shape` retângulo 1600×900 `#0B3B2C` (fundo) e painel `#0F4A37` (600×900 para um candidato; 900×900 para dois; montagem: bloco 800×450 em 400/450).
3. `insert_fill` com o `canva_media` do candidato: um → 440×615 em left 80 / top 90; dois → 380×531 em left 60 e 460 / top 110; montagem 6 → grade 4×2 de 400×450 com tiras pretas (opacidade 0,62) de 56 px e nome · partido em 26 px bold branco centralizado; Senado → cabeçalho 100 px + grade 5×2 de 320×400. Retratos 4:5 (Instagram): cabeçalho 150 px + grade 2×3 de 540×400 com `crop_media` top −30.
4. Textos com `add_text` (nasce 16 px preto) e depois `format_text`: kicker `ELEIÇÕES 2026 · GOVERNO DE MT` 26 px bold `#2EDC8A`; título exato da matéria 60 px bold branco (48 px com duas fotos); linha `Primeiro turno em 4 de outubro` 26 px; rodapé `Foto: TSE/Divulgação · Arte: HOJE MT · hojemt.com.br` 18 px `#CFE9DC` em top 842. Barra `#00A859` de 8 px sob a foto.
5. `edit-design finalize: commit` → `export-design {type: jpg, quality: 92}` → salvar em `pautas/eleicoes/<data>-capa-<slug-curto>.jpg` → `imagem-post.mjs --legenda="Foto: TSE/Divulgação · Arte: HOJE MT" --alt="<nomes e partidos>"` → `og-whatsapp.mjs --slug --da-destaque` → registrar em `pautas/eleicoes/registro.json`.

### Quando NÃO usar a foto oficial

Matéria de acusação, denúncia, áudio não confirmado ou investigação envolvendo o candidato: manter a arte atual ou fazer ilustração sem rosto (seção "Artes dos artigos no Canva"). Separar fato documentado de acusação (regra de `pautas/README.md`).

### Presidenciáveis (próxima etapa, se o editor pedir)

As fotos oficiais do TSE dos candidatos a presidente estão no Wikimedia Commons (`File:2026 <NOME> CANDIDATO PRESIDENTE TSE (<id>).jpg`, CC BY 4.0); os 23 posts de "Agenda dos presidenciáveis" usam duas artes genéricas da Agência Brasil e podem receber montagem no mesmo padrão.
