---
name: hojemt-tecnologia
description: Monitor de IA na indústria e no agro com matéria em rascunho. Use ao rodar a rotina de Tecnologia.
---

# hojemt-tecnologia

Rotina original: `trig_01UkLYDrfmgR5Y5VCXX9ydEW` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

Monitoramento de Tecnologia (disparo automático, pedido do editor: "monitore e crie o artigo sobre isso" — IA aplicada na prática na industrialização, no agro/agroindústria de Mato Grosso, no desenvolvimento e na ciência de resultados/medição). Regras: content/pautas/README.md (nada inventado, tudo com fonte e link, rascunho por padrão, separar fato de interpretação, "checagem pendente"). Pauta de referência: content/pautas/2026-09-24-ia-na-industria-pratica-resultados.md e content/pautas/monitor-tecnologia.md (palavras-chave e fontes preferidas).

1) Com WebSearch, procure novidades das últimas 24–48 h: IA na indústria brasileira (CNI, IBGE, Cetic.br, Deloitte, McKinsey, empresas como WEG, Embraer, Gerdau, Petrobras, Tupy, Bosch, JBS, Suzano, Vale), IA no agro/agroindústria de Mato Grosso (Fiemt, Senai MT, Aprosoja, Imea, Embrapa Agrossilvipastoril, UFMT, Parque Tecnológico MT, Amaggi, Bom Futuro), ciência de dados/medição de resultados (pilotos que viraram escala, ROI, OEE, manutenção preditiva, visão computacional, agentes de IA). Verifique cada fato com WebFetch na fonte primária (release, pesquisa, relatório) — não use só agregadores.

2) Se houver UMA história nova e sólida (dado inédito, caso com resultado medido, evento em MT), escreva a matéria (500–800 palavras, título, sutiã, seções, fontes com link, "checagem pendente"), salve em content/pautas/<data>-<slug>.md, crie o rascunho no Ghost (content/lib/ghost.mjs posts.add, status draft, tag Tecnologia, source html; credenciais: `source content/tools/ambiente.sh --checar`), gere ilustração no Canva (generate-image, estilo vetorial editorial, sem texto; quadro 16:9 a partir do modelo DAHWDzwR5c0 apagando os elementos; exportar) e coloque como feature_image com legenda "Ilustração: HOJE MT (gerada com IA)" via content/imagem-post.mjs; rode content/og-whatsapp.mjs --slug=<slug> --da-destaque; faça o card com content/card.mjs (JSON em content/pautas/cards), hospede com upload-ghost.mjs e inclua na agenda do Instagram (content/pautas/agenda-instagram.json) no próximo horário livre de card, com obs "publicar só depois que a matéria for publicada". Se não houver nada novo e sólido, não crie nada e encerre sem responder.

3) Nunca publique a matéria (fica em rascunho para revisão do editor). Commit + git push -u origin claude/exciting-thompson-4rhut2 (sem segredos). Responda em uma linha: título, fonte principal e link do rascunho.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
