---
name: hojemt-instagram-semanal
description: Medição semanal do Instagram @hoje.mt e planejamento dos próximos posts. Use ao rodar a rotina semanal do Instagram.
---

# hojemt-instagram-semanal

Rotina original: `trig_01NHdwe3fFgHHA8PsA4Jtx3M` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. `source content/tools/ambiente.sh --checar` — confira uma vez; depois, **em cada chamada de Bash** que rode Node, Python de rede ou Ghost, comece com `source "$(git rev-parse --show-toplevel)/content/tools/ambiente.sh" >/dev/null && ...`, porque as variáveis não passam de uma chamada para a outra. O script exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

Projeto "alcance com perfil zero" do @hoje.mt (pedido do editor: "Faça um projeto para este fim"; "Sempre resolva no Canva"). Plano e regras: content/pautas/instagram-crescimento.md; regras editoriais: content/pautas/README.md; artes: content/README.md. Nunca publique nada direto no Instagram: só agende na agenda (a Routine do Instagram publica).

1) Medição: pelo Zapier (instagram_for_business_make_api_get_request, fail_on_errors "false") faça GET https://graph.facebook.com/v21.0/17841460614185827 com fields=followers_count,follows_count,media_count,media.limit(40){timestamp,media_type,like_count,comments_count,permalink}. Acrescente uma leitura em content/pautas/instagram-metricas.json (data, seguidores, seguindo, posts, curtidas/comentários dos posts dos últimos 7 dias, top 3 por curtidas+comentários com permalink e formato, e se for post da sequência). Numa sessão nova não há conversa: só registre em insights_manual prints de Insights que o editor tenha deixado no repositório (content/pautas/instagram/insights/) ou na agenda; sem isso, deixe insights_manual como está. Compare com a semana anterior e com as metas do plano.

2) Ajuste: na tabela "Sequência de ataque" de instagram-crescimento.md, atualize a coluna Situação (publicado + permalink, resultado). O formato que mais trouxe interação ganha o próximo horário das 19:30.

3) Produção: faça os próximos 2 posts "A fazer" da sequência, em ordem, no Canva (Reel 9:16 copiando as páginas-modelo de DAHWIHvIE3U; carrossel 4:5 no padrão de DAHWIEnYeBU), seguindo as regras de produção do plano (gancho no 1º quadro, texto ≥ 84 px no terço de cima, uma ideia por quadro, último quadro "salve e compartilhe" + "Siga @hoje.mt", legenda ≤ 600 caracteres com fontes). Só fatos com fonte oficial conferida nesta execução (TSE, TRE-MT, INSS, TCE-MT etc.); se não conseguir conferir um passo a passo ou regra, pule para o próximo post e anote "checagem pendente". Fotos só oficiais/licenciadas; ilustração de IA só como cena de ficção com rosto oculto e crédito; nunca vídeo de terceiros. Exporte (mp4 ou jpg), salve em content/pautas/videos/ ou content/pautas/instagram/<data-assunto>/, hospede com content/upload-ghost.mjs (credenciais: `source content/tools/ambiente.sh --checar`) e acrescente em content/pautas/agenda-instagram.json com status "agendado", "sequencia": "perfil-zero #N (fase)", no próximo horário das 19:30 livre, empurrando os itens seguintes um horário (mantenha 07:30/11:30/15:30/19:30 e domingo livre). Post 9 (Crise no TCE-MT) só entra quando a matéria estiver publicada.

4) Commit + git push -u origin claude/exciting-thompson-4rhut2 (sem segredos). Responda em até 5 linhas: seguidores (variação), melhor post da semana, posts novos agendados com data/hora, e o que o editor precisa fazer (responder comentários, Insights, Stories).


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- Arquivos de memória da rotina (content/pautas/radar/manchetes-vistas.json, monitor.json das Câmaras, registros) são commitados e enviados **sempre**, mesmo quando a rotina encerra sem responder — a próxima sessão não tem outra memória.
- Outras rotinas rodam em paralelo e fazem push no mesmo branch: em conflito de rebase num JSON de memória ou registro, junte as duas versões (união, sem perder itens; preserve a indentação do arquivo); em `content/paginas/radar-eleitoral.html`, nunca junte à mão: resolva o radar-dados.json, rode `python3 content/paginas/radar-build.py`, `git add` dos dois e `git rebase --continue`.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
