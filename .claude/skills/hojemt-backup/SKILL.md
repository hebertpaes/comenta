---
name: hojemt-backup
description: Backup do conteúdo do Ghost e do trabalho pendente no GitHub, a cada 6 h. Use ao rodar a rotina de backup.
---

# hojemt-backup

Rotina original: `trig_017Hsqviu4hME7Kd93eucPWL` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

Backup do HOJE MT no GitHub, a cada 6 h (disparo automático; pedidos do editor: "faça o backup do sistema no GitHub" e, em 25/09, "faça o backup e mantenha enviando para GitHub"). Credenciais do Ghost: variáveis de ambiente GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY, carregadas e conferidas por `source content/tools/ambiente.sh --checar` (ver Preparo); se faltarem, pare e avise em uma linha (nunca peça nem mostre a chave).

1) cd /home/user/comenta/content && set -a && . $HOJEMT_TMP/.env.ghost && set +a && node backup-ghost.mjs (grava backup/ghost/latest: posts, páginas, tags, autores sem e-mail, configurações sem segredos, newsletters, site, imagens.txt, resumo.json). Confira o resumo.json: o número de posts deve ser >= o da rodada anterior; se cair mais de 5%, avise em vez de commitar.
2) Atualize backup/rotinas.json se alguma Routine mudou (list_triggers): só nome, cron e resumo, nunca chaves.
3) Trabalho pendente: rode git status. Arquivos novos ou alterados em content/ e backup/ que ficaram sem commit (artes, registros, agenda, pautas) entram neste commit. Nunca inclua .env*, chaves, tokens, node_modules nem arquivos de $HOJEMT_TMP; se aparecer algo suspeito de segredo, deixe de fora e avise.
4) git add backup content; git commit -m "Backup do conteúdo do Ghost (<AAAA-MM-DD HH:MM UTC>): <N> posts, <M> mídias"; git push -u origin claude/exciting-thompson-4rhut2 (se o push falhar, git pull --rebase e tente de novo até 4 vezes com espera de 2, 4, 8 e 16 s). O histórico é a sequência de commits no branch: NÃO tente push de tags (o proxy não aceita refs/tags). Nunca faça merge na main.
5) Pacotes de imagens no Google Drive: só no primeiro disparo de segunda-feira (antes das 12 UTC) e só se o Google Drive estiver conectado no Zapier (inspect_zapier_actions mostra GoogleDriveCLIAPI com connections): node backup-ghost.mjs --baixar=$HOJEMT_TMP/site-imagens, zips de até 44 MB (artes: pautas/charges, ilustracoes, cards, assets; site-imagens em partes), suba-os ao Ghost com adminUpload("files/upload/") de content/lib/ghost-admin.mjs e envie cada URL para a pasta correspondente do Drive (raiz "HOJE MT — Backup de imagens e conteúdo": artes-hojemt 16D3k6Ph5GLPbh-dd2ySh52GksT59C9ay, site-imagens 1b8Rmu8VzdajxzotfdgCd56cO13nSz_c7, conteudo 1e4NndnIrpHY-DCpkkkyINLeJR4hF5lpm) com a ação "Upload File" (action "file") do Google Drive no Zapier; registre as URLs em backup/pacotes-drive.json. Se o Drive não estiver conectado, pule este passo em silêncio.
6) Só responda no disparo das 06 UTC (resumo diário em uma linha: data, posts/mídias no backup e hash do commit) ou se houver problema (queda no número de posts, push recusado, credencial ausente). Nos outros disparos, faça o commit e encerre sem responder. Se nada mudou (git diff vazio), encerre sem responder.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
