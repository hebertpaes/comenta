# Instagram @hoje.mt: alcance com perfil zero

Projeto para fazer os posts do @hoje.mt chegarem a quem **ainda não segue** a
conta (Reels, Explorar, compartilhamento) e transformar esse alcance em
seguidores e cliques no site. Base: o método "Modo engenharia: alcance massivo
com perfil zero" (Regra Zero, teste do algoritmo, sequência de 10 posts),
adaptado às regras editoriais do HOJE MT (`pautas/README.md`).

**Metas**

| Prazo | Meta |
|---|---|
| 2 semanas | 1 post com alcance ≥ 10× o número de seguidores (hoje: ≥ 530 contas) |
| 2 semanas | 150 seguidores (de 53) |
| 4 semanas | 300 seguidores; ≥ 70% do alcance dos posts de alcance vindo de não seguidores |
| Sempre | Salvamentos + compartilhamentos ≥ 20 por 1.000 contas alcançadas |

## Diagnóstico (24/09/2026)

Leitura da Graph API (Zapier) em `instagram-metricas.json`:

- 53 seguidores, 66 seguindo, 20 posts.
- Últimos 20 posts: 6 curtidas no total, 0 comentário. 15 imagens, 3 vídeos, 2 carrosséis.
- Legendas longas (várias com 1.500 a 2.000 caracteres), a informação está na
  legenda e não na imagem. Quem não segue não lê legenda: decide em 1 a 3
  segundos pelo que vê.
- Os 3 Reels antigos eram repost de vídeo de terceiros (0 a 1 curtida).
- Nenhum post pede salvar ou compartilhar; nenhum funciona como guia útil.
- A API liberada no Zapier **não** dá alcance, salvamentos, compartilhamentos
  nem retenção (erro "(#10) Application does not have permission"). Esses
  números só aparecem no app, em Insights, e entram à mão na medição semanal.

## Regra Zero: as 6 respostas

1. **Nicho**: Mato Grosso explicado. Eleição, dinheiro público, agro e cidade,
   com checagem e charge.
2. **Público que ainda não nos conhece**: eleitor de MT de 25 a 55 anos no
   celular; servidor público e quem depende de prefeitura; gente do agro;
   mato-grossense que mora fora.
3. **Formato**: Reels de 15 a 35 s (alcance) e carrossel de 6 a 8 slides
   (salvamento). Imagem única só para charge.
4. **Objetivo**: alcance em não seguidores, depois seguidores, depois clique no site.
5. **Transformação/curiosidade**: "MT em 1 minuto": o que muda na sua vida, com
   fonte. Gancho de curiosidade: "É verdade que…?", "Você sabia que em MT…?".
6. **Estilo**: informativo e prático, frase curta, humor da charge. Sem
   polêmica fabricada, sem título enganoso.

## Como o Instagram testa um post, e o que fazemos em cada etapa

| Etapa do teste | O que o algoritmo olha | Nossa resposta |
|---|---|---|
| Teste inicial (100 a 300 não seguidores) | Se a pessoa para no post | Gancho no 1º quadro: número, horário ou pergunta sobre MT, texto grande no terço de cima |
| Retenção (+70%) | Quanto do vídeo é assistido | Reel de 20 a 30 s, 4 a 6 quadros, uma ideia por quadro |
| Replays | Se a pessoa volta | Informação densa e útil que dá vontade de pausar; último quadro remete ao primeiro |
| Interações nos primeiros 30 min | Curtida, comentário, compartilhamento | Postar nos horários fixos e responder todo comentário na primeira meia hora (manual) |
| Amplificação | Salvamentos e envios por Direct | Último quadro: "Salve e mande para quem vota em MT" |

## Regras de produção (valem para toda a sequência)

- **Sempre no Canva.** Reel 9:16 (1080×1920), carrossel e card 4:5 (1080×1350).
- **Gancho** no primeiro quadro/slide, sem logotipo abrindo. Números e horários
  vendem mais que adjetivos.
- **Texto grande**: manchete ≥ 84 px em 1080 de largura, no terço de cima. No
  Reel, a interface do app cobre o rodapé e a lateral direita: nada importante
  abaixo de 1.500 px.
- **Uma ideia por slide/quadro.** Contagem ("1 · HORÁRIO", "2 · O QUE LEVAR")
  ajuda a reter.
- **Último quadro**: pedido de salvar/compartilhar + "Siga @hoje.mt: Mato
  Grosso explicado em 1 minuto".
- **Legenda ≤ 600 caracteres**: 1ª linha repete o gancho; lista curta; fontes;
  3 a 5 hashtags. Texto longo fica na matéria do site.
- **Imagens**: foto só oficial ou licenciada (candidato: foto do TSE, em ordem
  alfabética e com tratamento igual); ilustração de IA só como cena de ficção,
  com rosto oculto e crédito "Ilustração: HOJE MT (IA)". Nunca vídeo ou frame
  de terceiros.
- **Áudio**: a API não põe música. Os Reels saem sem som; se der tempo, o
  editor acrescenta um áudio em alta pelo app (opcional).
- Todas as regras de `pautas/README.md` continuam valendo: fonte e link,
  nada inventado, outro lado, "checagem pendente".

## Sequência de ataque: 10 posts

| # | Fase | Post | Formato | Situação |
|---|---|---|---|---|
| 1 | Alcance | "Em MT, a urna fecha às 16h" (horário, documento, celular, justificativa) | Reel 25 s | **Pronto**, agenda item 27, 24/09 19:30 |
| 2 | Alcance | "Quem são os 6 candidatos ao governo de MT?" (1 por slide, ordem alfabética, fotos do TSE) | Carrossel 8 slides | **Pronto**, agenda item 28, 25/09 19:30 (substitui o post único 23) |
| 3 | Alcance | Charge em movimento com a charge mais recente de política de MT | Reel | A fazer (a partir das charges 24/25 no Canva) |
| 4 | Retenção | "Como ver os bens e a ficha de qualquer candidato em 1 minuto" (DivulgaCand passo a passo) | Carrossel | A fazer; conferir cada tela no site do TSE antes |
| 5 | Retenção | "Votar conta como prova de vida do INSS?" | Reel | A fazer; confirmar a regra atual no site do INSS antes |
| 6 | Retenção | "Como conferir as contas da sua prefeitura no TCE-MT" | Carrossel | A fazer; conferir o caminho no portal do TCE-MT |
| 7 | Prova | "3 boatos da eleição em MT que checamos nesta semana" | Carrossel | A fazer, com as checagens da semana |
| 8 | Prova | Bastidor da charge: da foto oficial à caricatura | Reel | A fazer |
| 9 | Prova | Crise no TCE-MT em 4 datas | Card/carrossel | Pronto como card (item 26); só entra depois que a matéria for publicada |
| 10 | CTA leve | "O que você quer que a gente explique sobre MT?" | Reel + caixa de perguntas no Stories | A fazer |

Ordem na agenda: posts de alcance e retenção ficam no horário das **19:30**
(maior audiência); charges e cards seguem nos outros horários.

## Medição semanal (segunda, 09:00 Cuiabá)

1. Leitura automática (Routine): `followers_count`, `media_count` e, por post,
   `like_count` e `comments_count` pela Graph API; grava em
   `instagram-metricas.json`, ranqueia os posts da semana e marca na sequência
   o que funcionou.
2. Leitura manual (editor, 2 minutos no app): em Insights, para os posts da
   sequência, anotar contas alcançadas, % de não seguidores, salvamentos,
   compartilhamentos e, no Reel, tempo médio de reprodução. Pode mandar print
   na conversa que vira `insights_manual`.
3. Decisão: o formato que mais trouxe não seguidores ganha o próximo horário
   das 19:30; o que ficou abaixo da média muda de gancho, não de assunto.

## Modelos no Canva

| Peça | Design | Observação |
|---|---|---|
| Reel 9:16 | `DAHWIHvIE3U` | Exportar só as páginas 2 a 6 (a página 1 é resto do modelo 4:5); fundo `MAHWIOK3NXU` (seção eleitoral, ficção, rostos ocultos) |
| Carrossel 4:5 | `DAHWIEnYeBU` | 8 slides: capa com os 6, 1 slide por candidato, slide final com data e CTA |
| Card 4:5 | `DAHWHxXxNqw` | Card de notícia com ilustração |

Arquivos: Reel em `pautas/videos/2026-09-24-urna-fecha-16h-reel.mp4`; slides em
`pautas/instagram/2026-09-24-governo-mt-6-candidatos/`. Mídia hospedada no Ghost
(URLs na agenda).

## O que depende do editor

- Responder os comentários na primeira meia hora dos posts 27 (24/09 19:30) e 28 (25/09 19:30).
- Repostar cada post da sequência nos Stories com uma enquete ("Você já sabia?").
- Trocar a bio pelo app (a API não edita): "Mato Grosso explicado em 1 minuto ·
  checagem e charge · hojemt.com.br".
- Mandar print dos Insights uma vez por semana.
