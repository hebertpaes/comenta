---
name: hojemt-camara-vg
description: Monitor da Câmara Municipal de Várzea Grande com rascunhos no Ghost. Use ao rodar a rotina da Câmara de VG.
---

# hojemt-camara-vg

Rotina original: `trig_01959tQrEnSf2MmrXz2N8gB4` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — confira uma vez; depois, **em cada chamada de Bash** que rode Node, Python de rede ou Ghost, comece com `source "$(git rev-parse --show-toplevel)/content/tools/ambiente.sh" >/dev/null && ...`, porque as variáveis não passam de uma chamada para a outra. O script exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

ARTES PENDENTES: antes de tudo, leia o monitor.json desta rotina e retome as pautas com arte/capa marcada como pendente (fluxo de arte abaixo); se o Canva estiver em quota_cooldown, deixe para o próximo disparo.

Monitor da Câmara Municipal de Várzea Grande (disparo automático; pedido do editor em 01/10/2026: "Monitore também https://www.varzeagrande.mt.leg.br"). Regras: content/pautas/README.md (nada inventado, tudo com fonte e link, rascunho por padrão, separar fato de acusação, ouvir o outro lado, "checagem pendente"; presunção de inocência; tratamento igual). Credenciais do Ghost: variáveis de ambiente GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY, carregadas e conferidas por `source content/tools/ambiente.sh --checar` (ver Preparo); se faltarem, pare e avise em uma linha (nunca peça nem mostre a chave).

1) ATALHO: `cd "$(git rev-parse --show-toplevel)/content" && source tools/ambiente.sh >/dev/null && node camara-vg.mjs` lista as notícias novas do RSS da Câmara (desde pautas/camara-varzea-grande/monitor.json) com o texto; `--marcar` grava as vistas — rode-o logo depois de avaliar a listagem, antes do trabalho longo de matéria e arte; `--texto=<slug>` imprime uma notícia. Leia também content/pautas/camara-varzea-grande/monitor.json (pautas já feitas) para não repetir. Além do RSS, baixe com `curl -s --compressed` (o site é Plone/Interlegis e responde comprimido) a agenda de eventos/sessões https://www.varzeagrande.mt.leg.br/institucional/eventos/event_listing, o processo legislativo https://www.varzeagrande.mt.leg.br/processo-legislativo (ordem do dia, proposituras, comissões), os boletins https://www.varzeagrande.mt.leg.br/boletins e, quando útil, o portal de transparência https://scpi_cmvg.egpicloud.com.br/transparencia/. Complete com WebSearch das últimas 24 h ("Câmara de Várzea Grande", "vereadores de Várzea Grande", "Várzea Grande projeto aprovado", "Prefeitura de Várzea Grande") em Folhamax, VG Notícias (leia com curl -A "Mozilla/5.0", que o site atende normalmente; se responder 403 ou desafio anti-robô, pule — não contornar), Olhar Direto, RDNews, Gazeta Digital, HiperNotícias, MidiaNews, Diário de Cuiabá, e o site da Prefeitura (varzeagrande.mt.gov.br).

2) Escolha o que vira conteúdo (no máximo 2 por disparo): projetos aprovados, vetados ou em urgência, planos de cargos e salários (PCCS), orçamento/LOA e contas, sessões e embates, CPIs, pedidos de cassação, licitações e gastos da Câmara, folha de servidores, relação com a Prefeitura de Várzea Grande, e o que mexer com a eleição de 4/10. Nada novo e sólido: rode `node camara-vg.mjs --marcar`, atualize monitor.json e commite e envie o monitor.json (memória da rotina) e encerre sem responder.

3) Para cada pauta: escreva matéria (300–600 palavras) com os fatos da fonte oficial da Câmara (notícia, projeto, ata, votação, com link) e da imprensa e da Prefeitura com link; falas entre aspas só se estiverem literalmente na fonte (paráfrase da assessoria não vai entre aspas); sempre o outro lado (se as fontes não trazem a manifestação, diga isso e liste quem procurar em "checagem pendente"; nunca escreva que o HOJE MT procurou alguém sem ter procurado) (Prefeitura de Várzea Grande, vereadores citados, sindicato/servidores) e "checagem pendente". Modelo: content/pautas/camara-varzea-grande/2026-10-01-pccss-saude-garis-aprovados.md. Salve em content/pautas/camara-varzea-grande/<AAAA-MM-DD>-<slug>.md e crie como RASCUNHO no Ghost (content/lib/ghost.mjs posts.add, status draft, source html, tag Cidades & Mato Grosso — slug "cidades" —; custom_excerpt até 300 caracteres), nunca publique.

4) Arte SEMPRE no Canva, montagem ilustrativa própria (nunca imagem copiada do site da Câmara, de redes ou de outros veículos). Siga content/README.md, seção "Artes dos artigos no Canva": ilustração realista de ficção, personagens reais sem rosto (de costas/silhueta), cenário de plenário/sessão, servidores, ruas e prédios de Várzea Grande; copy-design DAHWDzwR5c0 para a capa 16:9 (selo "ILUSTRAÇÃO · HOJE MT") e, para o card do Instagram, content/card.mjs (JSON em content/pautas/cards) ou copy-design DAHWHxXxNqw 4:5 (kicker "CÂMARA DE VÁRZEA GRANDE"). Aplique a capa com content/imagem-post.mjs --legenda="Ilustração: HOJE MT (gerada com IA; cena de ficção)", rode content/og-whatsapp.mjs --slug --da-destaque, registre em content/pautas/ilustracoes/registro.json, hospede o card com content/upload-ghost.mjs e acrescente em content/pautas/agenda-instagram.json com status "aguardando_materia" (a rotina do Instagram só publica "agendado"). Se o Canva estiver em quota_cooldown, deixe a capa para o próximo disparo e registre "arte pendente" no monitor.json.

5) Atualize content/pautas/camara-varzea-grande/monitor.json (pautas criadas), rode `node camara-vg.mjs --marcar`, commit + git push -u origin claude/exciting-thompson-4rhut2 (sem segredos; se o push falhar, git pull --rebase e tente de novo) e responda em uma linha por pauta: título, link do rascunho e fonte principal.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- Arquivos de memória da rotina (content/pautas/radar/manchetes-vistas.json, monitor.json das Câmaras, registros) são commitados e enviados **sempre**, mesmo quando a rotina encerra sem responder — a próxima sessão não tem outra memória.
- Outras rotinas rodam em paralelo e fazem push no mesmo branch: em conflito de rebase num JSON de memória ou registro, junte as duas versões (união, sem perder itens; preserve a indentação do arquivo); em `content/paginas/radar-eleitoral.html`, nunca junte à mão: resolva o radar-dados.json, rode `python3 content/paginas/radar-build.py`, `git add` dos dois e `git rebase --continue`.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
