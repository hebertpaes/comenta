---
name: hojemt-redes-api
description: Coleta das redes dos candidatos pelas APIs oficiais para o Radar Eleitoral. Use ao rodar essa coleta.
---

# hojemt-redes-api

Rotina original: `trig_019HLBXgy3Pv3YR8vqU5z47P` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

Coleta das redes dos candidatos pelas APIs oficiais para o Radar Eleitoral do HOJE MT (repositório hebertpaes/comenta). Pedido do editor: "Implemente api meta para mostrar as condições dos candidatos e mesmo para outras api como x e Google".

Se já passou de 2026-10-05T00:00Z, desative esta rotina (list_triggers → a chamada "Radar — redes pelas APIs oficiais" → update_trigger enabled=false) e encerre.

1) Se o repositório hebertpaes/comenta não estiver clonado nesta sessão, anexe-o com add_repo (owner hebertpaes, repo comenta, access push) e clone como a ferramenta indicar. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2`.
2) `cd content && node redes-api.mjs --seco`. Se os quatro provedores derem "sem_chave", encerre sem commitar e sem responder (as chaves META_ACCESS_TOKEN, META_IG_USER_ID, META_ADLIB_TOKEN, YOUTUBE_API_KEY e X_BEARER_TOKEN ficam nas variáveis de ambiente; nunca peça nem mostre chaves).
3) `node redes-api.mjs` (se o arquivo /root/.ccr/ca-bundle.crt não existir, rode sem as duas variáveis). Não altere o script nem os números; não imprima variáveis de ambiente.
4) Confira o JSON gerado (content/paginas/radar-redes-api.json): nenhum campo pode conter token ou chave; seguidores e interações precisam ser números plausíveis (se um candidato tiver 0 seguidores ou valores absurdos, deixe como veio e cite na resposta).
5) `git add content/paginas/radar-redes-api.json && git commit -m "Radar: medição das redes pelas APIs oficiais"` com as linhas finais do commit exigidas pelo ambiente, e `git push -u origin claude/exciting-thompson-4rhut2` (em rejeição: `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo, até 4 vezes). A rotina de hora em hora do Radar puxa o arquivo, embute e publica a página; não publique nada no Ghost daqui.
6) Responda em até 3 linhas: status de cada provedor (ok / sem_chave / erro com a mensagem curta) e os 2 maiores números de cada provedor com o nome do candidato. Não abra pull request.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
