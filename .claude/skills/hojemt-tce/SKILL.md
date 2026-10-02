---
name: hojemt-tce
description: Monitor do TCE-MT (sessões e decisões) com rascunhos no Ghost. Use ao rodar a rotina do TCE-MT.
---

# hojemt-tce

Rotina original: `trig_017n6KdPrLbPFabBGSuEjD7n` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

Monitor do Tribunal de Contas de Mato Grosso (disparo automático; pedido do editor: "Monitore as sessões das lives do tribunal de contas mt e crie os conteúdos. Quando possível, para evitar problemas de direitos autorais, crie uma montagem ilustrativa"; e "Sempre resolva no Canva"). Regras: content/pautas/README.md (nada inventado, tudo com fonte e link, rascunho por padrão, separar fato de acusação, ouvir o outro lado, "checagem pendente"). Credenciais do Ghost: variáveis de ambiente GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY, carregadas e conferidas por `source content/tools/ambiente.sh --checar` (ver Preparo); se faltarem, pare e avise em uma linha (nunca peça nem mostre a chave).

1) Leia content/pautas/tce/monitor.json (último vídeo e última sessão vistos). Baixe o RSS do canal oficial (https://www.youtube.com/feeds/videos.xml?channel_id=UCBfh0XMJFExxL9qLC7JZtfg) e liste os vídeos novos desde o último visto: transmissões "TCE-MT – Nª SESSÃO ... PLENÁRIO" (lives das sessões, terças 14h30) e vídeos de decisões. Complete com WebSearch das últimas 24 h ("TCE-MT", "Tribunal de Contas de Mato Grosso", "Sérgio Ricardo TCE", "Plenário Virtual TCE-MT") em Portal Mato Grosso, HiperNotícias, Olhar Direto, Midianews, O Documento, Eh Fonte (inclusive TikTok @ehfonte, via https://www.tiktok.com/oembed?url=<link>). Se o usuário mandar link de TikTok/Instagram de sessão, trate como pista e confirme na fonte oficial.

2) Escolha o que vira conteúdo (no máximo 2 por disparo): decisões sobre prefeituras e órgãos de MT (contas com parecer, licitações suspensas, cautelares, multas, entendimentos), embates relevantes no plenário, sessões sem quórum, desdobramentos da crise entre conselheiros (pauta aberta: content/pautas/2026-09-24-crise-no-tce-mt.md e o rascunho crise-no-tce-mt-presidente-afasta-vice-e-sessao-cai-sem-quorum). Nada novo e sólido: atualize monitor.json (último visto) e encerre sem responder.

3) Para cada pauta: escreva matéria (400–700 palavras) ou curta, com fatos da fonte oficial (título/descrição do vídeo do TCE, voto, acórdão, Diário Oficial de Contas) e da imprensa com link; falas entre aspas só se confirmadas no vídeo oficial ou em 2 veículos (tentativa de transcrição: opusclip_submit_project com rangeStart/rangeEnd no trecho, se houver crédito); sempre o outro lado (assessoria do TCE, conselheiro, prefeitura) e "checagem pendente". Crie como RASCUNHO no Ghost (content/lib/ghost.mjs, tag Política ou Cidades & Mato Grosso), nunca publique.

4) Arte SEMPRE no Canva e SEMPRE montagem ilustrativa própria: nunca frames da TV Contas/YouTube, nunca recorte do TikTok ou de outros veículos. Siga content/README.md, seção "Artes dos artigos no Canva" (ilustração realista de ficção, personagens reais sem rosto, de costas/silhueta; prompt-base realista; cenário de plenário, processos, obras, municípios de MT); copy-design DAHWDzwR5c0 para a capa 16:9 (selo "ILUSTRAÇÃO · HOJE MT") e copy-design DAHWHxXxNqw para o card 4:5 do Instagram (fundo com a ilustração 4:5, kicker "TRIBUNAL DE CONTAS DE MT" 24 px bold #2EDC8A, manchete 66 px, linha de apoio 27 px branca, rodapé "Ilustração: HOJE MT (gerada com IA; cena de ficção) · hojemt.com.br"). Charge só em Curtas, pelo fluxo "Charges no Canva", com foto recente do personagem. Aplique a capa com content/imagem-post.mjs --legenda="Ilustração: HOJE MT (gerada com IA; cena de ficção)", rode content/og-whatsapp.mjs --slug --da-destaque, registre em content/pautas/ilustracoes/registro.json, hospede o 4:5 com content/upload-ghost.mjs e acrescente em content/pautas/agenda-instagram.json com status "aguardando_materia" (a rotina do Instagram só publica "agendado").

5) Atualize content/pautas/tce/monitor.json (último vídeo e sessão vistos, pautas criadas), commit + git push -u origin claude/exciting-thompson-4rhut2 (sem segredos) e responda em uma linha por pauta: título, link do rascunho e fonte principal.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
