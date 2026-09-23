# Pautas escritas à mão

O robô em `content/` faz curadoria de RSS: resume o que a fonte publicou, credita
e linka. Esta pasta é para o outro caso — a pauta que nasce de um vídeo, de uma
conversa, de uma denúncia — em que alguém precisa apurar antes de escrever.

Regras iguais às do robô, e uma a mais:

- **Nada de fato inventado.** Tudo com fonte e link.
- **Rascunho por padrão.** Nenhum arquivo daqui vai direto para o ar: entra no
  Ghost como _draft_, para revisão humana.
- **Separe documento de acusação.** Em matéria sobre investigação, o que está em
  relatório, o que é alegação de uma das partes e o que já foi julgado são coisas
  diferentes — e o texto precisa deixar isso explícito.
- **Ouça o outro lado**, ou registre que a manifestação foi procurada e não veio.

Cada arquivo traz, no fim, uma lista de **checagem pendente**: o que quem revisar
precisa confirmar antes de publicar. A lista só existe enquanto o texto é
rascunho — some quando a matéria for publicada.

Para publicar: copie o corpo para um post novo no Ghost (`/ghost/#/editor/post`),
aplique as tags do cabeçalho e revise a checagem. O `publish.mjs` não lê esta
pasta: ele é só do fluxo de RSS.

## Imagens e cards

- Toda foto vem de fonte oficial (Agência Brasil/PR, Senado, Câmara, Casa
  Branca, Departamento de Estado) ou de banco com licença explícita (Wikimedia
  Commons, Openverse, Pexels, Pixabay, Unsplash). `node ../imagens.mjs "termo"`
  já filtra o que pode ser usado e escreve a linha de crédito.
- O crédito e a licença vão no rodapé do card e na pauta (autor, fonte, página).
- Card no padrão HOJE MT: `node ../card.mjs pauta.json`. Quando houver foto da
  pessoa ou do lugar central, entra o retrato em círculo no canto superior
  direito; sem foto licenciada, o card sai só tipográfico.
- Os cards publicados ficam em `content/pautas/cards/`, com o mesmo nome da
  pauta, para backup.
- Charges e ilustrações (`node ../ilustrar.mjs`): os personagens públicos da
  matéria são **desenhados** (caricatura) a partir da foto real com licença,
  que o script busca no Commons — nunca com aparência de foto, sempre com o
  selo CHARGE e sem cena de crime, violência ou humilhação. Em peça com
  aparência de foto (`--tipo=ilustracao`) não entra pessoa real reconhecível.
  O crédito da foto de referência fica no `saida/<slug>.json`.
