---
name: hojemt-duplicadas
description: Achar e despublicar posts duplicados e posts vazios no hojemt.com.br. Use ao rodar a rotina de duplicadas.
---

# hojemt-duplicadas

Rotina original: `trig_01QZF4hTmH3JH6MPVxLyjibY` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

Duplicadas e posts vazios no hojemt.com.br (pedido do editor: "Corrija todas duplicadas" e, em 01/10/2026, sobre https://hojemt.com.br/untitled-4/: "Corrija isso"; o publicador automático das Curtas, fora deste repositório, às vezes publica a mesma notícia duas vezes com títulos diferentes e, às 08:10/18:10 UTC, às vezes solta um post "(Untitled)" sem texto com capa charge-dia-*.webp). Credenciais do Ghost: variáveis de ambiente GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY, carregadas e conferidas por `source content/tools/ambiente.sh --checar` (ver Preparo); se faltarem, pare e avise em uma linha (nunca peça nem mostre a chave).

0) POSTS VAZIOS: cd /home/user/comenta/content && node sem-titulo.mjs --despublicar — tira do ar (status draft) qualquer post publicado SEM TÍTULO E SEM TEXTO e registra em content/pautas/sem-titulo/registro.json. Se ele listar post com texto mas sem título (ou com título mas sem texto), não mexa e cite em uma linha na resposta (o editor decide). Nunca apague post.
1) cd /home/user/comenta/content && node duplicadas.mjs --dias=2
2) Para cada par candidato, leia o começo dos dois textos e decida: é duplicata só se for o MESMO fato, do mesmo dia/evento (a mesma matéria da fonte reescrita). NÃO são duplicatas: agenda diária de candidatos, sorteios diferentes da Mega-Sena, parcelas do Bolsa Família em dias diferentes, estados/cidades diferentes, matérias de continuação com fato novo (ex.: "anuncia" e depois "inaugura"). Na dúvida, não mexa e cite o par na resposta.
3) Duplicata confirmada: mantenha a versão mais antiga (URL que pode ter circulado), a não ser que ela esteja sem foto ou com erro factual evidente; numa cobertura ao vivo, mantenha a atualização. Despublique a cópia com node duplicadas.mjs --despublicar=<slug-copia>:<slug-mantido> (vira rascunho; nunca apague post; não edite texto nem título de post publicado). O script registra em content/pautas/duplicadas/registro.json.
4) Acrescente as linhas de redirecionamento em content/pautas/duplicadas/redirects-pendentes.yaml (formato "  /copia/: /mantido/" sob "301:"; a API não tem permissão para redirects, o editor sobe no Ghost Admin → Settings → Labs → Redirects).
5) Se despublicou algo (duplicata ou post vazio): commit + git push -u origin claude/exciting-thompson-4rhut2 (sem segredos) e responda em uma linha por item: cópia → mantido, ou "post vazio <slug> fora do ar". Se não havia nada, encerre sem responder.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
