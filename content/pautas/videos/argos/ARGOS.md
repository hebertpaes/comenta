# Argos Veredas — repórter virtual oficial do HOJE MT

Criado em 26/09/2026 a pedido do editor ("Crie o avatar do jornalista hojemt e
comece narrar os fatos. Se apresente como Jornalista oficial, com nome
sugestivo e intrigante").

## Formato vigente (29/09/2026): só voz e slides

### Ajustes de 01/10/2026 (valem sobre o que está abaixo)

Pedido do editor em 01/10: "Deixe os vídeos sem avatar com a voz aprimorada e
sem música de fundo, com uma intro e com o fechamento. E com as séries na
ordem cronológica e subsequente."

- **Sem música de fundo:** `"trilha": "nenhuma"` em todo roteiro de boletim
  (o `charge-cena.mjs` respeita e não põe crédito de música). Só a voz.
- **Voz:** continua a v6 (edge-tts pt-BR-AntonioNeural, +18%, +4Hz, reserva
  Kokoro pm_alex). Sem avatar em nenhuma cena.
- **Intro (1ª cena):** slide feito por `intro-boletim.mjs` (`--prefixo`, `--n`,
  `--data`, `--tema`): cabeçalho, chip "BOLETIM Nº N", título "Radar
  Eleitoral", data por extenso e o tema do dia; fala fixa: "Radar Eleitoral do
  HOJE MT. Boletim número N, <dia da semana>, <dia> de <mês>." (sem "olá", sem
  "eu sou", sem citar IA). A camada 1 (data + tema) entra em `"quando":
  "Boletim"`. Antes dela continua a cartela de abertura do charge-cena (2,5 s,
  muda). A notícia principal vem na 2ª cena.
- **Fechamento (última cena + cartela):** fala fixa "Todos os casos, com as
  fontes, estão no Radar Eleitoral do HOJE MT." (ou "Todos os dados…", quando
  o tema for pesquisas), seguida da cartela final com link, fontes e o aviso
  "Voz gerada com IA (narrador sintético)…".
- **Capa (poster):** a composição do slide de intro (prévia gerada pelo
  `intro-boletim.mjs`, 1080×1920) convertida em JPG `<prefixo>-capa.jpg`; sem
  avatar.
- **Série em ordem cronológica no Radar:** `radar-dados.json` tem a chave
  `boletins` (lista do nº 1 ao mais recente, cada item com n, quando, titulo,
  texto, video, poster, fontes, duracao_s); a seção "Boletins em vídeo" da
  página mostra todos nessa ordem, com o texto e as fontes dos anteriores
  recolhidos e o mais recente aberto. A chave `boletim` continua apontando
  para o mais recente (compatibilidade). Cada boletim novo é ACRESCENTADO ao
  fim de `boletins` (nunca substitui o anterior).
- **Refeitura dos antigos:** nº 3 e nº 4 refeitos em 01/10 sem música e com
  intro (v5 e v2); nº 1 e nº 2 (que tinham avatar) são refeitos no formato só
  voz e slides, com as mesmas falas e os números da época (são registro
  histórico: não se atualizam os dados, só o formato).

Pedidos do editor em 29/09: "Não deixe avatar. Deixe somente a voz e slides";
"Deixe uma voz menos grave e mais rápida e com português brasileiro com
sotaque Cuiabano"; slides "no estilo deste vídeo" (youtu.be/M6jemlgwZxU)
"somente com narrador e slides em tempo real", "retirando qualquer coisa
fluência de Portugal".

- **Sem avatar:** nenhuma cena com o Argos (nem `"anima": true`). O vídeo é só
  narração + slides + reprodução de postagens e vídeos de redes (abaixo). O avatar e a animação abaixo ficam no histórico.
- **Slides (modelo: `graficos-boletim-03.mjs`):** 1080×1920, fundo escuro com
  ondas e curvas de nível verdes, chips com brilho verde (#2EDC8A), cartões
  de vidro com barras. Do vídeo de referência vem só o estilo visual; o
  narrador dele nunca é imitado. Cada cena tem um `-fundo.png` (a câmera anda
  sobre ele) e camadas transparentes `-c<k>.png` que entram "em tempo real",
  quando o narrador chega ao trecho: no roteiro, `"camadas": [{"imagem": …,
  "quando": "trecho da fala"}]` (a camada 0 usa `"em": 0`). Todos os
  candidatos nos gráficos, em ordem de resultado; ficha técnica no cartão.
- **Sem legenda queimada** (`"legendas": false` no roteiro): o texto está nos
  slides. Rótulo fixo `"rotulo_ia": "Voz gerada com IA"` e aviso na cartela
  final ("Voz gerada com IA (narrador sintético)…").
- **Voz (v6, 29/09, editor: "Aprimore a voz"):** voz neural pt-BR
  **AntonioNeural** (catálogo da Microsoft, pelo pacote edge-tts, via
  `lib/edge-tts.py`, que usa o CA do proxy sem desligar a verificação TLS),
  18% mais rápida e um pouco mais aguda:
  `"voz": {"motor": "edge", "narrador": "pt-BR-AntonioNeural", "velocidade":
  "+18%", "tom": "+4Hz", "reserva": {…voz v5 abaixo…}}`. Português do
  Brasil nativo, natural e claro na transcrição (nomes e números certos; só
  "Quaest" e "HOJE MT" têm grafia de pronúncia em `PRONUNCIA_EDGE`). É voz
  sintética genérica, não imita pessoa real. Não faz sotaque cuiabano. Se o
  serviço cair, o `charge-cena.mjs` usa sozinho a `reserva` (Kokoro v5).
  Alternativas testadas em 29/09: ThalitaMultilingualNeural e FranciscaNeural
  (femininas), Piper cadu/jeff (locais, mais robóticas).
- **Voz (v5, 29/09; agora reserva):** `"voz": {"motor": "kokoro", "narrador": "pm_alex",
  "velocidade": 1.18, "tom": 2, "tratamento": "limpo", "fonetica": "misaki",
  "sotaque": "cuiabano"}` — mais rápida e menos grave (tom médio ~141 Hz, antes
  ~130 Hz). `fonetica: "misaki"` refaz os fonemas como no treino do Kokoro
  (espeak-ng pt-br com ligaduras: ʤ, ʧ, ditongos), o que tira a pronúncia
  estranha que soava "de Portugal". `sotaque: "cuiabano"` é uma APROXIMAÇÃO:
  ch/x viram "tch" e j/g viram "dj" só nas palavras comuns ("tchega",
  "mardjem"); nomes próprios e siglas ficam na pronúncia padrão (com o
  sotaque, "Janaína" virava "Dianaína"). O Kokoro não tem voz cuiabana de
  verdade. Pronúncias de nomes em `PRONUNCIA` do `charge-cena.mjs`.
- **Postagens e vídeos de redes sociais (29/09, editor: "Não precisa de
  avatar, somente áudio e slides e vídeos demonstrativos com imagens de
  postagens e vídeos de redes sociais"):** o boletim mostra, como prova do fato
  narrado, a postagem ou um trecho do vídeo original.
  - Buscar com `node redes-post.mjs <link>` (grava JSON + mídia no
    scratchpad `redes-cache/`, fora do repositório). Daqui funcionam: **X**
    (texto, data, foto e vídeo do post, pelo link), **YouTube** (título, canal
    e miniatura; o download do vídeo é barrado pelo YouTube e não se contorna) e
    **TikTok** (título e miniatura). **Instagram e Facebook** não abrem sem
    login e a API do Zapier não tem permissão: use `--manual` com o print ou a
    gravação de tela que o editor mandar e o link do post.
  - No slide: `cartaoPost(post)` (`slides-lib.mjs`) monta o cartão de
    reprodução no visual do HOJE MT (não imita a tela da rede), com o texto
    entre aspas, a imagem original sem alteração e o crédito "Reprodução:
    @perfil no <rede>, dd/mm/aaaa". Vídeo: campo `clipe` da cena ({arquivo,
    inicio, fim, caixa: [x, y, w, h], origem_url, credito}) + `molduraVideo()`
    na camada 0; o trecho entra sem o áudio original, com a narração por cima.
  - Só de perfis oficiais de candidatos, campanhas, partidos e órgãos públicos
    (TSE, TRE-MT, governo); nunca vídeo de imprensa/TV nem post de pessoa comum.
    Sempre para comprovar um fato narrado e já conferido; trecho curto (até
    ~10 s); sem cortes que mudem o sentido; voz real de candidato só pelo
    `audio_real` (≤ 12 s, com crédito). Tratamento igual: se mostrar o post de
    um lado numa disputa, mostrar o do outro quando houver. Uso como citação,
    com autor e origem (Lei 9.610/1998, art. 46, III); o link vai na legenda.
  - Modelo: cenas 9 e 10 do boletim nº 3 v2 (vídeo e post do @TSEjusbr no X).
- **API do Gemini (29/09, editor: "Use api Gemini 3.8 para gerar os vídeos do
  radar"):** `lib/gemini.mjs` + `gemini-video.mjs`, com a chave em
  `GEMINI_API_KEY` (variável de ambiente; nunca no git nem no chat). O modelo
  é escolhido pela lista da própria chave e vale sempre o mais novo de cada
  tipo (editor, 30/09: "use a última versão do Gemini"; `GEMINI_PEDIDO=3.8`
  fixa uma versão; `node gemini-video.mjs modelos` mostra a escolha;
  `GEMINI_MODELO_TEXTO/VIDEO/TTS` fixam um modelo).
  - **Cenas ilustrativas (Veo):** na cena, `"clipe": {"gerar": {"prompt":
    "…", "duracao": 8}}` (com `caixa` para a janela do slide; sem ela, tela
    inteira). Só paisagem, cidade, lavoura, estrada, prédio público por fora,
    urna genérica. **Nunca pessoa reconhecível, candidato, logotipo, bandeira
    ou texto:** o script recusa prompt com nome de candidato do Radar ou rosto
    em destaque e anexa as regras ao prompt. O clipe sai com o selo "IMAGEM
    GERADA POR IA" na caixa, o rótulo do vídeo vira "Voz e imagens geradas com
    IA" e a proveniência (modelo, prompt, data) vai em `clipes_gerados_ia` no
    registro do vídeo. Pessoa real só em imagem real publicada, com crédito
    (redes-post.mjs); em notícia de acusação ou investigação, nada de cena
    gerada que sugira o fato. `node gemini-video.mjs sugerir <roteiro>` pede ao
    modelo de texto uma cena por fala (o editor revisa antes de gerar).
  - **Voz:** `"voz": {"motor": "gemini", "narrador": "Charon", "estilo": "Leia
    em português do Brasil, em tom de telejornal, ritmo ágil", "reserva": {voz
    v6}}` — voz pronta do Gemini (sintética genérica, nunca imitação de pessoa
    real). Sem chave, com cota esgotada ou fora do ar, a reserva assume sozinha.
    Só vira padrão depois que o editor ouvir e aprovar.
  - **Tarja de manchete** (formato do reel indicado pelo editor, 29/09):
    `tarjaManchete("texto com **destaque**")` do `slides-lib.mjs` — aspas verdes
    e linhas em caixa branca, como camada sobre a cena do Veo.
- **Conferência:** transcrever com faster_whisper "small" (nomes e números
  têm de sair certos), olhar quadros de cada cena com ffmpeg (camadas
  entrando na hora da fala) e duração ≤ 120 s.

## Quem é

- **Nome:** Argos Veredas. Argos é o gigante de cem olhos da mitologia grega, o
  vigia que não dorme; Veredas são os caminhos do Cerrado e do Pantanal.
- **Sem apresentação (26/09):** a pedido do editor ("sem se apresentar e sem
  dizer que é IA. Somente noticie os fatos"), o narrador não diz o nome, não se
  apresenta, não cumprimenta nem se despede: a primeira fala já é a notícia. O
  nome "Argos Veredas" fica só nos arquivos internos; no vídeo, na página e no
  Instagram o produto se chama "Boletim em vídeo" do Radar Eleitoral.
- **Personagem fictício.** Não imita nem lembra pessoa real. Não tem biografia
  inventada (não "cobriu" nada antes, não tem família, não dá opinião pessoal).
- **Avatar v4 (29/09, aguardando aprovação do editor para voltar aos
  vídeos):** o editor mandou uma foto de referência ("avatar inspire"). Dela
  vem só o ESTILO — chapéu bucket cinza sem marca, óculos de armação preta
  grossa, jaqueta jeans sobre camiseta preta, barba curta —, não o rosto: a
  imagem foi gerada só por texto no Canva (media `MAHWn653dmI`, quadro 9:16
  `DAHWn49OzvQ`), sem a foto como referência, com rosto inventado de homem de
  uns 40 anos, microfone de lapela e o estúdio com o Pantanal ao pôr do sol.
  Continua personagem fictício que não imita pessoa real; logotipo de marca
  nunca aparece. Arquivos: `argos-veredas-v4-9x16.jpg`, `-1x1.jpg`,
  `-240.jpg`; animação em `anima-v4/` (mesmo `lib/argos-anima.py`).
- **Avatar (v3, 26/09; fora de uso desde 29/09):** a pedido do editor ("Deve ser mais novo um avatar
  animado e não estático com a voz mais suave e grave"), o Argos é um repórter
  jovem, de uns 27 anos, cabelo castanho-escuro curto, barba curta, terno
  verde-escuro com camisa branca aberta, broche de tuiuiú e microfone de
  lapela, no estúdio com o Pantanal ao pôr do sol. Foto gerada com IA no Canva
  (media `MAHWS3SeYn4`, quadro 9:16 `DAHWS4QwnCM`), rosto inventado, que não
  imita ninguém. Arquivos nesta pasta: `argos-veredas-avatar-9x16.jpg`,
  `-1x1.jpg`, `-240.jpg` (no site: `argos-veredas-v3-240.jpg`, `-1x1.jpg`,
  `-9x16.jpg`). As versões anteriores (v2 realista mais velho, `MAHWQY-1ml4`,
  com a pose `argos-veredas-cena-falando-9x16.jpg`; v1 em 3D, `MAHWQKGqrGo`)
  ficam no histórico e não devem ser usadas.
- **Animação:** `lib/argos-anima.py`, sem modelo externo (só OpenCV e numpy).
  A pasta `anima-v3/` tem o retrato e duas variações do mesmo retrato geradas
  no Canva e alinhadas a ele: boca entreaberta (`MAHWS88-1QI`) e olhos
  fechados (`MAHWS0JXxpM`); as máscaras de boca e olhos saem da diferença
  entre elas. No vídeo, a boca abre e fecha conforme o volume da fala (com
  metamorfose por fluxo óptico, sem contorno duplo), os olhos piscam a cada
  2 a 5 s e a cabeça e o tronco se mexem de leve, com respiração e um aceno
  quando a fala ganha força. Nas cenas do Argos use `"anima": true` e, no
  roteiro, `"anima": {"pasta": "pautas/videos/argos/anima-v3"}`; os planos
  `zoom-in`/`close-in`/`close-out`/`zoom-out` continuam valendo por cima. Uma
  variação de boca bem aberta (`boca2`) pode entrar depois em
  `argos-anima.py preparar --boca2`. Para refazer: `python3 lib/argos-anima.py
  preparar --base argos-veredas-avatar-9x16.jpg --boca1 <entreaberta.png>
  --olhos <olhos-fechados.png> --pasta pautas/videos/argos/anima-v3`.
  Não é sincronia labial por fonema (a boca segue o volume); a sincronia fina
  fica para o HeyGen, quando houver créditos de API.
- **Voz (v4, 26/09; substituída pela v5 em 29/09, ver acima):** Kokoro-82M (Apache-2.0), voz sintética genérica
  `pm_alex` pura (a mais jovem em português), velocidade 1,05, sem mudar o
  tom, tratamento "limpo" (tira o grave embolado em 250 Hz, um pouco de
  presença, de-esser e compressão leve):
  `"voz": {"motor": "kokoro", "narrador": "pm_alex", "velocidade": 1.05, "tom": 0, "tratamento": "limpo"}`.
  Tom médio ~131 Hz. A v3 (mistura `pm_santa` + `am_onyx`, −1 semitom,
  tratamento suave) foi reprovada pelo editor em 26/09 ("a voz está muito
  feia, precisa ser uma voz mais jovem"): não use `pm_santa` (voz envelhecida)
  nem baixe o tom.
  Instalar uma vez com `bash vozes-kokoro.sh`. Nunca usar voz sintética de
  pessoa real (Res. TSE 23.610/2019, art. 9º-C). A voz do HeyGen ("Giles" ou
  "Fabio - Newscaster") segue prevista, dependendo de créditos de API.
- **Texto e planos:** só os fatos, em frases diretas de telejornal, sem
  "olá", "vamos lá", "até já", sem opinião nem adjetivo sobre candidato. Nas
  cenas com o avatar, uma frase curta e animada, variando os planos; quadros e
  cartelas próprios no meio. Nome nas falas por extenso quando ajuda o ouvinte
  (ex.: "pediu votos para Pivetta", não "para ele").

## Regras (valem para vídeo, áudio, texto e Radar)

1. **IA só na tela, nunca na fala:** o narrador não diz que é IA; a
   informação fica num rótulo discreto fixo no canto (`"rotulo_ia": "Voz
   gerada com IA"` no formato só voz e slides; era "Imagem e voz geradas com
   IA" com o avatar), na cartela final ("Imagem e voz geradas
   com IA. Fatos apurados e conferidos pela redação do HOJE MT…"), na página do
   Radar e na legenda do Instagram. Motivo: o avatar é realista e é período
   eleitoral (Meta exige rótulo em vídeo realista gerado por IA; Res. TSE
   23.610/2019, art. 9º-B, para conteúdo sintético em campanha).
2. **Só narra fato conferido:** o que está publicado no HOJE MT ou foi conferido
   em fonte oficial ou em dois veículos, com link na legenda. Nada de "fontes
   dizem", boato ou print sem origem.
3. **Pesquisa eleitoral só com registro**, e sempre com instituto, contratante,
   período, entrevistas, margem e registro (na fala resumida e completa na
   legenda/cartela). Mostra todos os cenários publicados (1º e 2º turno), não só
   os favoráveis a alguém. Antes de usar números, confere se a pesquisa não foi
   **suspensa ou impugnada** (TRE/TSE, PesqEle e notícias do dia): pesquisa com
   divulgação suspensa sai do Radar e do boletim, sem números — só a notícia da
   suspensão, com fonte (caso Veritá, liminar do TRE-MT de 28/09/2026).
4. **Justiça Eleitoral:** separa decisão de ação em andamento; diz se cabe
   recurso; cita a defesa quando houver manifestação publicada. Presunção de
   inocência.
5. **Não ataca ninguém**, não usa adjetivo contra candidato, não faz propaganda.
   Candidatos ao mesmo cargo recebem o mesmo tratamento.
6. **Não fala por pessoa real:** fala de candidato só em 3ª pessoa ("Ele
   disse: …") e só com citação confirmada; trecho de áudio real só pelo campo
   `audio_real` do `charge-cena.mjs`.
7. **Vídeos de até 2 minutos**, 9:16, marca do HOJE MT; no formato só voz e
   slides, sem legenda queimada (o texto está nos slides).
   Nunca usa vídeo de imprensa; de redes sociais, só trechos de perfis
   oficiais para comprovar o fato narrado, com crédito (ver "Postagens e vídeos
   de redes sociais").

## Onde aparece

- **Radar Eleitoral** (hojemt.com.br/radar-eleitoral/): bloco "Boletim em
  vídeo" com o último boletim (vídeo + texto), sem cartão de apresentação.
- **Instagram @hoje.mt:** boletins pela agenda (`agenda-instagram.json`).
- Roteiros: `pautas/videos/argos/<data>-<assunto>.cena.json`, montados com
  `node charge-cena.mjs`.
