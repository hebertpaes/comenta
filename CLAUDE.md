# HOJE MT — instruções para qualquer sessão do Claude (rotinas incluídas)

Portal de notícias **hojemt.com.br** (Ghost), de Mato Grosso. Responda sempre em **português**.
Este arquivo e as skills em `.claude/skills/hojemt-*/SKILL.md` são a memória do sistema: uma
sessão nova, sem a conversa antiga, tem de conseguir trabalhar só com eles e com o repositório.
Quando aprender algo que valha para as próximas sessões, registre aqui (seção "Lições") ou na
skill da rotina, no mesmo commit do trabalho.

## Onde trabalhar

- Repositório `hebertpaes/comenta`, branch **`claude/exciting-thompson-4rhut2`** (sempre esse; nunca merge na main, nunca pull request sem pedido, nunca push de tags).
- Push: `git push -u origin claude/exciting-thompson-4rhut2`; recusado → `git pull --rebase origin claude/exciting-thompson-4rhut2` e de novo (até 4 vezes, espera 2/4/8/16 s).
- Commit só do que você mexeu (nunca `git add -A`); não toque em arquivos alterados por outra pessoa; termine o turno com tudo commitado e enviado.
- Conteúdo em `content/` (scripts Node/Python, pautas, páginas). Rotinas: `.claude/skills/hojemt-*/SKILL.md`. Lista das rotinas e horários: `backup/rotinas.json`.

## Preparo de uma sessão nova

```bash
bash content/tools/preparar-sessao.sh          # dependências (npm -w content, edge-tts, imageio-ffmpeg) e Chromium
source content/tools/ambiente.sh --checar      # proxy/CA do Node, $HOJEMT_TMP e credenciais (só "ok"/"ausente")
```

- **Credenciais**: GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY ficam nas **variáveis de ambiente do ambiente do Claude Code** (configuração do ambiente na web). Outras chaves opcionais: META_ACCESS_TOKEN, META_IG_USER_ID, META_ADLIB_TOKEN, YOUTUBE_API_KEY, X_BEARER_TOKEN, TYPESAFE_API_KEY, GEMINI_API_KEY. Nunca grave chave no repositório, nunca imprima variável de ambiente, nunca peça ao usuário para colar chave/senha no chat. Se faltar, pare e avise em uma linha.
- Temporários (prévias, caches, mídia de terceiros): `$HOJEMT_TMP` (padrão `/tmp/hojemt`), nunca no repositório.
- Rede: use o proxy do ambiente; nunca desative TLS nem remova HTTPS_PROXY. Node: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` (o ambiente.sh já exporta).
- Shell: sem cadeias de `sleep` (espere com `timeout N tail --pid=PID -f /dev/null`); sem `pkill` com padrão que pegue o próprio shell; sem `rm` com glob relativo.

## Regras editoriais (valem para tudo que for publicado ou ficar em rascunho)

- **Nada inventado.** Todo fato com fonte e link. Fala entre aspas só se estiver literalmente na fonte; paráfrase não leva aspas.
- Confirmação: fonte oficial (TRE-MT, TSE, Câmara, Prefeitura, Diário Oficial) **ou dois veículos diferentes**. Pesquisa: relatório do instituto + um veículo, ou dois veículos.
- **Rascunho por padrão.** Nunca publique rascunho de matéria; o editor revisa e publica.
- Não reescreva texto nem título de post já publicado pela API (o editor decide). Trocar imagem de destaque/og é permitido nas rotinas de arte. Exceção: post publicado **sem título e com texto** fica no ar e ganha título tirado do próprio texto, que vai também para a URL, com o redirecionamento do endereço antigo anotado em `redirects-pendentes.yaml` (`content/sem-titulo.mjs --titular=<slug> --titulo="..."`; decisões do editor em 05/10/2026); post sem título e sem texto sai do ar (`--despublicar`).
- Separar fato de acusação; presunção de inocência; ouvir o outro lado; "checagem pendente" no fim da pauta; tratamento igual; **não atacar ninguém**.
- Eleições 2026 (1º turno em 04/10/2026): linha editorial a favor de Otaviano Pivetta **sem distorcer dado**; candidatos em ordem alfabética nas listas (menos em resultados de pesquisa).
- Pesquisas: só registradas, com ficha técnica completa na legenda (instituto, registro, contratante, entrevistas, período, margem, nível de confiança — Res. TSE 23.600/2019). Antes de incluir, confira se a divulgação não foi suspensa pela Justiça Eleitoral.
- Duplicatas no site: despublicar a cópia (vira rascunho), **nunca apagar post**; redirecionamento em `content/pautas/duplicadas/redirects-pendentes.yaml` (o editor sobe no Ghost).
- Sites com WAF/anti-robô ou 403 (Câmara de Cuiabá, Noveen, Olhar Direto/TRE-MT quando 403, Estadão MT, PesqEle, Fatos de MT): **não contornar**; use outras fontes abertas.

## Arte

- Charges e artes **sempre no Canva** (conector Canva). Charges só em Curtas; caricatura a partir de foto oficial recente (tabela "Referências de imagem por personagem" em `content/README.md`); sem foto oficial, personagem genérico.
- **Nunca** cena que sugira crime; tema de acusação → cena neutra, sem pessoa e sem dinheiro. Balão só com fala real citada. Crédito público único: "Charge: HOJE MT".
- Ilustrações de artigos: realistas, de ficção, personagens reais **sem rosto visível**; legenda "Ilustração: HOJE MT (gerada com IA; cena de ficção)".
- Foto oficial do TSE nunca em matéria de acusação/investigação.
- Cota do Canva em pausa (`quota_cooldown`): não insista; deixe para o próximo disparo e registre "arte pendente".
- Prévia do WhatsApp: `content/og-whatsapp.mjs` (JPEG baseline 1200×630 ≤ 150 KB em /content/files/); depois de trocar capa, `--slug=<slug> --da-destaque`.

## Voz e vídeo (boletins do Radar)

- Sem avatar e sem nome de avatar em nada público; nunca sintetizar ou clonar voz de pessoa real; narrador não se apresenta nem cita IA (o aviso de IA vai só na tela/legenda/página).
- Voz v7: edge-tts `pt-BR-AntonioNeural`, 96 kbps, +14% (até +16% se encostar em 120 s; nunca acima de +18%), +3 Hz, tratamento "leve"; reserva Kokoro `pm_alex`. "Pivetta" se pronuncia "Pivêta". Sem música. Vídeo ≤ 120 s.
- Intro: `content/pautas/videos/argos/intro-boletim.mjs`; fechamento padrão: `fechamento-boletim.mjs` (site + redes @hoje.mt, YouTube @hojemt, X @hojemt). Detalhes: skill `hojemt-boletim` e `content/pautas/videos/argos/ARGOS.md`.

## Rotinas em paralelo

- Cada disparo pode ser uma sessão nova, e várias rodam ao mesmo tempo no mesmo branch: sempre `git pull --rebase` antes de mexer em arquivo compartilhado (radar-dados.json, agenda-instagram.json, registros) e commit+push logo depois.
- A memória de cada rotina está em arquivos do repositório (monitor.json, manchetes-vistas.json, registros, agenda); commite-os em todo disparo, mesmo sem novidade.

## Instagram @hoje.mt

- Publica **só** pela rotina da agenda (`content/pautas/agenda-instagram.json`, status "agendado" e horário vencido), via Zapier; **nunca publique o mesmo item duas vezes**. Itens "aguardando_materia"/"aguardando_decisao" esperam o editor.

## Proibido (pedidos negados pelo editor ou pela segurança — não tente de outro jeito)

- Acesso SSH/produção (inclusive por segredos de deploy do GitHub Actions), reset de senha de banco, reescrever texto/título publicado pela API, contornar WAF/anti-robô, baixar pesos do LivePortrait, subir foto pessoal do editor ao Adobe ou animá-la, copiar a skill da TypeSafe, ler curso.atendechat.com.
- Senhas que o editor colou em chat/terminal no passado estão expostas: não reutilize, recomende troca (Ghost admin, SSH, MySQL).

## Lições (acumuladas; acrescente as novas)

- 29/09: a pesquisa Veritá MT-09975/2026 entrou no Radar depois de suspensa por liminar do TRE-MT (28/09) — sempre buscar "<instituto> pesquisa suspensa TRE" antes de incluir. Continua fora até decisão que libere.
- 02/10: a prévia do WhatsApp vinha só com título porque o tema tem um `<div id="hmt-vm">` dentro do `<head>`; a correção do tema depende do editor rodar `deploy/corrigir-head-tema.sh` no servidor. As imagens já foram trocadas por `-wa.jpg`.
- 02/10: ao reescrever JSON do repositório com Python, preserve a indentação original (agenda-instagram.json e registro de ilustrações usam 2 espaços; radar-dados.json usa 1) para não gerar diff gigante.
- 02/10: nunca escreva "o HOJE MT procurou X e aguarda retorno" se ninguém procurou; escreva o que as fontes dizem e liste o contato em "checagem pendente".
- 04/10: a montagem dos presidenciáveis de 25/09 (13 nomes) foi reaproveitada em 03/10 com Leonardo Avalanche (PRTB), que tinha desistido em 30/09 — o ND Mais ainda o listava. Antes de reaproveitar montagem de candidatos, busque "<nome> desiste/renuncia candidatura" para cada um; montagem desatualizada sai (volta a capa original) até haver arte nova.
- 06/10: a charge 16:9 de "Nada de punição eterna" foi ao ar com o eleitor de três braços (o editor viu no celular); a primeira refação deu três mãos à urna. Antes de publicar qualquer arte gerada, amplie o .jpg exportado e conte braços, mãos, pernas e pés de cada pessoa e mascote; objeto-mascote sem braços evita o erro.
- A varredura de manchetes guarda o que já foi visto em `content/pautas/radar/manchetes-vistas.json` (commite junto); os monitores das Câmaras guardam em `monitor.json` da pasta de cada Câmara.
