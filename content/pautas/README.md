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
