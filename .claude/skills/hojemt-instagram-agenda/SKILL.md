---
name: hojemt-instagram-agenda
description: Publicar no Instagram @hoje.mt o item vencido da agenda (content/pautas/agenda-instagram.json) via Zapier. Use ao rodar a rotina de publicação do Instagram.
---

# hojemt-instagram-agenda

Rotina original: `trig_014WnzAnzYATz1c5sqpRVz9h` (procedimento abaixo, mantido como o editor aprovou; só os caminhos da sessão antiga foram trocados pelas ferramentas do repositório).

## Preparo (sempre, antes de tudo)

Esta rotina tem de funcionar numa sessão nova, sem memória de conversa: tudo o que ela precisa está neste arquivo, no `CLAUDE.md` da raiz e nos arquivos do repositório.

1. Na raiz do repositório: `git fetch origin claude/exciting-thompson-4rhut2 && git checkout -B claude/exciting-thompson-4rhut2 origin/claude/exciting-thompson-4rhut2` (se já estiver no branch com trabalho local, commite antes e use `git pull --rebase origin claude/exciting-thompson-4rhut2`).
2. `bash content/tools/preparar-sessao.sh` (dependências Node/Python e Chromium; idempotente).
3. (Esta rotina NÃO usa o Ghost nem precisa do preparar-sessao.sh: pule os passos 2 e 3 se derem aviso; ela só usa o Zapier e o git.) `source content/tools/ambiente.sh --checar` — confira uma vez; depois, **em cada chamada de Bash** que rode Node, Python de rede ou Ghost, comece com `source "$(git rev-parse --show-toplevel)/content/tools/ambiente.sh" >/dev/null && ...`, porque as variáveis não passam de uma chamada para a outra. O script exporta NODE_USE_ENV_PROXY/NODE_EXTRA_CA_CERTS, TMPDIR e `$HOJEMT_TMP` (pasta de temporários, padrão /tmp/hojemt) e confere, sem mostrar valores, GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY. Se faltarem, pare e avise em uma linha que as variáveis de ambiente do Ghost não estão configuradas no ambiente do Claude Code (nunca peça a chave no chat, nunca grave chave no repositório).
4. Leia o `CLAUDE.md` da raiz (regras editoriais, de arte, de voz, de segurança e de git) se ainda não estiver no contexto.

Ferramentas comuns: `content/tools/recentes.mjs` (posts das últimas N horas), `content/tools/ler-post.mjs` (texto de um post), `content/tools/rascunho-ghost.mjs` (rascunho a partir de .md), `content/tools/radar-varredura.sh` (manchetes novas dos veículos de MT, com memória em content/pautas/radar/manchetes-vistas.json), `content/tools/smoke-radar.cjs` (teste da página do Radar).

## Procedimento

Agenda do Instagram (disparo automático da Routine). Abra content/pautas/agenda-instagram.json e pegue o item MAIS ANTIGO com status "agendado" cujo campo "quando" (hora de Cuiabá, UTC-4) já passou. Se não houver item vencido, não faça nada e encerre sem responder.

ANTES DE PUBLICAR (proteção contra publicação em dobro, porque cada disparo é uma sessão nova e o status "publicado" só existe no git): (a) `git pull --rebase origin claude/exciting-thompson-4rhut2` e releia o item; (b) liste as últimas mídias da conta (execute_zapier_read_action _zap_raw_request, tool_name "instagram_for_business_make_api_get_request", GET https://graph.facebook.com/v21.0/17841460614185827/media?fields=id,caption,permalink,timestamp&limit=10) e, se alguma das últimas 48 h tiver legenda que comece igual à do item, NÃO publique: marque o item "publicado" com esse permalink e timestamp, commite e encerre. Depois de publicar, commite e faça push imediatamente (antes de qualquer outro passo).

Se houver, publique só esse item no @hoje.mt via Zapier (carregue as tools com ToolSearch se precisar):
- formato card, charge ou carrossel: execute_zapier_write_action com selected_api "InstagramBusinessCLIAPI", action "publish_media_v2", tool_name "instagram_for_business_publish_photo_s", params {"media": item.midia (lista de URLs; 2–10 = carrossel), "caption": item.legenda, "instagramPageId": "17841460614185827"}.
- formato video: action "publish_video", tool_name "instagram_for_business_publish_video", params {"video": item.midia[0], "caption": item.legenda, "instagramPageId": "17841460614185827"}.
- Vídeo com erro "Video is still processing" (o Zapier desiste antes de o Instagram terminar): confira na lista de mídias da conta que não publicou (GET https://graph.facebook.com/v21.0/17841460614185827/media?fields=id,permalink,timestamp,media_type&limit=5) e publique em etapas, ainda pelo Zapier: (a) execute_zapier_write_action, action "_zap_raw_request", tool_name "instagram_for_business_make_api_mutating_request", params {"url": "https://graph.facebook.com/v21.0/17841460614185827/media", "method": "POST", "querystring": {"media_type": "REELS", "video_url": item.midia[0], "share_to_feed": "true", "caption": item.legenda}, "fail_on_errors": false} → id do contêiner; (b) consulte GET https://graph.facebook.com/v21.0/<contêiner>?fields=status_code,status até FINISHED (espere 60-120 s entre consultas com python3 -c 'import time; time.sleep(90)', no máximo 6 vezes); (c) POST https://graph.facebook.com/v21.0/17841460614185827/media_publish com querystring {"creation_id": "<contêiner>"}; registre a tentativa no item.
- Outro erro "mídia não está pronta"/transitório: confira primeiro na lista de mídias da conta que não publicou (evite duplicar) e tente uma única vez mais.
Depois busque o permalink: execute_zapier_read_action _zap_raw_request (tool_name "instagram_for_business_make_api_get_request", fail_on_errors false) GET https://graph.facebook.com/v21.0/<id>?fields=permalink,timestamp,media_type.

Registre: no item do agenda-instagram.json, status "publicado", permalink e publicado_em (ISO); se for charge ou vídeo de charge, grave o permalink também no arquivo indicado em charge_json (campo instagram); acrescente permalink → matéria em content/pautas/instagram-links.json. Faça commit (mensagem curta, sem segredos) e git push -u origin claude/exciting-thompson-4rhut2.

Regras: nunca publique um item duas vezes; não altere legendas nem mídia; não publique itens futuros; se a publicação falhar de vez, marque status "erro" com o motivo, faça commit e avise. Responda ao usuário em uma linha: o que foi publicado, horário e o link.


## Fechamento (sempre)

- Commit só dos arquivos que a rotina mexeu (nunca `git add -A`; nunca .env, chaves, node_modules nem arquivos de `$HOJEMT_TMP`), mensagem curta em português, com as linhas finais de autoria que o ambiente exigir.
- Arquivos de memória da rotina (content/pautas/radar/manchetes-vistas.json, monitor.json das Câmaras, registros) são commitados e enviados **sempre**, mesmo quando a rotina encerra sem responder — a próxima sessão não tem outra memória.
- Outras rotinas rodam em paralelo e fazem push no mesmo branch: em conflito de rebase num JSON de memória ou registro, junte as duas versões (união, sem perder itens; preserve a indentação do arquivo); em `content/paginas/radar-eleitoral.html`, nunca junte à mão: resolva o radar-dados.json, rode `python3 content/paginas/radar-build.py`, `git add` dos dois e `git rebase --continue`.
- `git push -u origin claude/exciting-thompson-4rhut2`; se for recusado, `git pull --rebase origin claude/exciting-thompson-4rhut2` e tente de novo até 4 vezes (espera de 2, 4, 8 e 16 s). Nunca push de tags, nunca merge na main, nunca pull request.
