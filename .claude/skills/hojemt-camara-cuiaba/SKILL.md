---
name: hojemt-camara-cuiaba
description: Monitor da Câmara Municipal de Cuiabá (sessões, Mesa Diretora, projetos) com rascunhos no Ghost. Use ao rodar a rotina da Câmara de Cuiabá.
---

# hojemt-camara-cuiaba

Rotina original: `trig_018KJzjSVN1WZJuWURAtTRTD` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — confira uma vez; depois, **em cada chamada de Bash** que rode Node, Python de rede ou Ghost, comece com `source "$(git rev-parse --show-toplevel)/content/tools/ambiente.sh" >/dev/null && ...`, porque as variáveis não passam de uma chamada para a outra. O script exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

ARTES PENDENTES: antes de tudo, leia o monitor.json desta rotina e retome as pautas com arte/capa marcada como pendente (fluxo de arte abaixo); se o Canva estiver em quota_cooldown, deixe para o próximo disparo.

Monitor da Câmara Municipal de Cuiabá (disparo automático; pedido do editor em 01/10/2026: "Monitore também https://www.camaracuiaba.mt.gov.br"). Regras: content/pautas/README.md (nada inventado, tudo com fonte e link, rascunho por padrão, separar fato de acusação, ouvir o outro lado, "checagem pendente"; presunção de inocência; tratamento igual; linha editorial a favor de Pivetta sem distorcer dado, quando o assunto for eleitoral estadual). Credenciais do Ghost: variáveis de ambiente GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY, carregadas e conferidas por `source content/tools/ambiente.sh --checar` (ver Preparo); se faltarem, pare e avise em uma linha (nunca peça nem mostre a chave).

IMPORTANTE: o site oficial camaracuiaba.mt.gov.br responde "Request Rejected" (WAF) a este ambiente, tanto para curl quanto para WebFetch. NÃO tente contornar (nada de trocar IP, falsificar cabeçalhos ou insistir). Use as fontes abertas abaixo e, se um dia o site abrir, aproveite (o script avisa).

1) ATALHO: `cd "$(git rev-parse --show-toplevel)/content" && source tools/ambiente.sh >/dev/null && node camara-cuiaba.mjs` lista o que é novo desde pautas/camara-cuiaba/monitor.json: vídeos do canal oficial da Câmara no YouTube (RSS do canal UCNCoIaMma_H-aFP6rRNb56w: sessões ordinárias às terças e quartas, sessões extraordinárias, comissões, solenes) e manchetes do Google Notícias sobre a Câmara (últimas 48 h); `--marcar` grava como vistos — rode-o logo depois de avaliar a listagem, antes do trabalho longo de matéria e arte (ele baixa as fontes de novo e marca tudo o que vier). Para cada item relevante, abra a matéria na fonte (WebSearch pelo título; WebFetch ou `curl -s --compressed -A "Mozilla/5.0"`), confirme data e fatos. Complete com WebSearch das últimas 24 h ("Câmara Municipal de Cuiabá", "vereadores de Cuiabá", "Mesa Diretora Câmara de Cuiabá", "Abilio Brunini Câmara") em Olhar Direto, MidiaNews, MidiaJur, Folhamax, RDNews, Gazeta Digital, HiperNotícias, Diário de Cuiabá, O Documento, VGN, 24 Horas MT, Mato Grosso Mais, e as redes oficiais (@camaracba no Instagram e @CamaraCba no X; X abre por content/redes-post.mjs; Instagram só com print/gravação enviados pelo editor).

2) PAUTA ABERTA: eleição da Mesa Diretora da Câmara de Cuiabá, marcada para 06/10/2026 (dossiê: content/pautas/2026-09-30-camara-cuiaba-eleicao-da-mesa.md e content/pautas/2026-09-30-camara-cuiaba-paula-recua-dilemario.md) — o estado atual (chapas, apoios, nomes e partidos) está no dossiê; leia-o antes e não copie fatos desta skill sem conferir. Depois da eleição de 06/10, registre o resultado com fonte e encerre a pauta aberta no monitor.json. Atualize o dossiê com cada fato novo (placar de apoios, chapas, decisões judiciais, licenças, regimento) com fonte, sem tomar partido.

3) Antes de escolher, confira em monitor.json ("pautas_criadas") e nos .md de content/pautas/camara-cuiaba o que já virou rascunho, para não repetir assunto. Escolha o que vira conteúdo (no máximo 2 por disparo): votações e projetos relevantes (orçamento, tributos, saúde, transporte, plano diretor, concessões, relação com a Prefeitura de Cuiabá/Abilio Brunini), embates, CPIs, pedidos de cassação, licitações e gastos da Câmara, a eleição da Mesa e o que mexer com a eleição de 4/10. Nada novo e sólido: rode `node camara-cuiaba.mjs --marcar`, atualize monitor.json e commite e envie o monitor.json (memória da rotina) e encerre sem responder.

4) Para cada pauta: matéria (300–600 palavras) com fatos da fonte oficial (vídeo/ata/pauta da Câmara quando houver, com link) e da imprensa com link; falas entre aspas só se estiverem literalmente na fonte (paráfrase não vai entre aspas); sempre o outro lado (se as fontes não trazem a manifestação, diga isso e liste quem procurar em "checagem pendente"; nunca escreva que o HOJE MT procurou alguém sem ter procurado) e "checagem pendente". Salve em content/pautas/camara-cuiaba/<AAAA-MM-DD>-<slug>.md e crie como RASCUNHO no Ghost (content/lib/ghost.mjs posts.add, status draft, source html, tag Política ou Cidades & Mato Grosso — slugs "politica" / "cidades" —; custom_excerpt até 300 caracteres), nunca publique. Modelo de formato: content/pautas/camara-varzea-grande/2026-10-01-pccss-saude-garis-aprovados.md.

5) Arte SEMPRE no Canva, montagem ilustrativa própria (nunca frame de vídeo da TV/YouTube da Câmara nem imagem de outros veículos). Siga content/README.md, seção "Artes dos artigos no Canva": ilustração realista de ficção, personagens reais sem rosto (de costas/silhueta), cenário de plenário/sessão, ruas e prédios de Cuiabá; copy-design DAHWDzwR5c0 para a capa 16:9 (selo "ILUSTRAÇÃO · HOJE MT") e, para o card do Instagram, content/card.mjs (JSON em content/pautas/cards) ou copy-design DAHWHxXxNqw 4:5 (kicker "CÂMARA DE CUIABÁ"). Aplique a capa com content/imagem-post.mjs --legenda="Ilustração: HOJE MT (gerada com IA; cena de ficção)", rode content/og-whatsapp.mjs --slug --da-destaque, registre em content/pautas/ilustracoes/registro.json, hospede o card com content/upload-ghost.mjs e acrescente em content/pautas/agenda-instagram.json com status "aguardando_materia". Matéria de eleição com candidatos: não use foto oficial se houver acusação/investigação. Se o Canva estiver em quota_cooldown, deixe a arte para o próximo disparo e registre "arte pendente" no monitor.json. Charge só em Curtas, pelo fluxo "Charges no Canva".

6) Atualize content/pautas/camara-cuiaba/monitor.json (pautas criadas), rode `node camara-cuiaba.mjs --marcar`, commit + git push -u origin claude/exciting-thompson-4rhut2 (sem segredos; se o push falhar, git pull --rebase e tente de novo) e responda em uma linha por pauta: título, link do rascunho e fonte principal.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- Arquivos de memória da rotina (content/pautas/radar/manchetes-vistas.json, monitor.json das Câmaras, registros) são commitados e enviados **sempre**, mesmo quando a rotina encerra sem responder — a próxima sessão não tem outra memória.
- Outras rotinas rodam em paralelo e fazem push no mesmo branch: em conflito de rebase num JSON de memória ou registro, junte as duas versões (união, sem perder itens; preserve a indentação do arquivo); em `content/paginas/radar-eleitoral.html`, nunca junte à mão: resolva o radar-dados.json, rode `python3 content/paginas/radar-build.py`, `git add` dos dois e `git rebase --continue`.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
