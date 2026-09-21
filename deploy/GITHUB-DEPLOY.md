# Deploy pelo GitHub → servidor (intsoft.com.br)

O sistema inteiro mora em **`intsoft.com.br`**, no servidor Oracle
`147.15.103.114` — o mesmo que hoje serve o Ghost. `comenta.com.br` não resolve
mais e deixou de ser o domínio de produção.

| Endereço              | O que responde        | Origem     | Porta interna |
| --------------------- | --------------------- | ---------- | ------------- |
| `intsoft.com.br`      | site + página IntSoft | `site/`    | 3000          |
| `www.intsoft.com.br`  | idem                  | `site/`    | 3000          |
| `app.intsoft.com.br`  | painel do atendente   | `saas/web` | 8080          |
| `api.intsoft.com.br`  | API (+ WebSocket)     | `saas/api` | 4000          |
| `blog.intsoft.com.br` | Ghost                 | ghost-cli  | 2368          |

Dois caminhos de deploy, escolhidos pela variável `DEPLOY_STACK`:

| `DEPLOY_STACK`  | Script                  | O que sobe                                                     |
| --------------- | ----------------------- | -------------------------------------------------------------- |
| `site` (padrão) | `deploy/deploy_site.sh` | Só o site, por tarball + PM2. Rápido, bom para cada push       |
| `full`          | `deploy/bootstrap.sh`   | Sistema completo em Docker: site, painel, API, Postgres, Redis |

Os dois usam a porta 3000 para o site, então **não convivem**: ao rodar o modo
`full`, o `bootstrap.sh` derruba o processo `comenta-site` do PM2 antes de subir
o container.

| Peça              | Onde                           | O que faz                                                        |
| ----------------- | ------------------------------ | ---------------------------------------------------------------- |
| Workflow          | `.github/workflows/deploy.yml` | Builda, manda por SSH e roda o script do modo escolhido          |
| Site (PM2)        | `deploy/deploy_site.sh`        | Node/PM2/Nginx/Certbot, release, SSL                             |
| Sistema (Docker)  | `deploy/bootstrap.sh`          | Docker, compose, Nginx dos 5 domínios, SSL por domínio, Ghost    |
| Página da IntSoft | `site/app/intsoft/page.tsx`    | Servida em `/intsoft` e na raiz quando o host é `intsoft.com.br` |

## 1. DNS

Registros **A** apontando para o IP do servidor (Oracle Cloud: `147.15.103.114`):

| Tipo | Nome  | Zona             | Conteúdo       |
| ---- | ----- | ---------------- | -------------- |
| A    | `@`   | `intsoft.com.br` | IP do servidor |
| A    | `www` | `intsoft.com.br` | IP do servidor |
| A    | `@`   | `comenta.com.br` | IP do servidor |
| A    | `www` | `comenta.com.br` | IP do servidor |

Se a zona estiver no Cloudflare, deixe o proxy **desligado** (nuvem cinza) até
o certificado sair — com o proxy ligado o desafio do Let's Encrypt não chega ao
Nginx. Detalhes em [`RUNBOOK.md`](RUNBOOK.md#1-dns).

Depois, se ligar o proxy (nuvem laranja), o modo SSL da zona precisa ser **Full**
ou **Full (strict)**. Em **Flexible** o Cloudflare fala HTTP com o servidor, o
servidor responde com o 301 para HTTPS, e o navegador entra em laço de
redirecionamento (`ERR_TOO_MANY_REDIRECTS`). Com o certificado emitido aqui,
**Full (strict)** funciona.

## Atenção: o que o servidor Oracle serve hoje

Em 16/09/2026, `intsoft.com.br` e `www.intsoft.com.br` já apontam para
`147.15.103.114`, e esse servidor responde com o portal Ghost "HOJE MT", com
HTTPS e com o admin em uso em `intsoft.com.br/ghost/`. O Nginx entrega um
domínio ao primeiro vhost que casar, então dois sites com o mesmo
`server_name` não convivem: um deles some sem aviso.

Por isso o `deploy_site.sh` **para antes de tocar no Nginx** quando outro
vhost habilitado já declara um dos domínios, e mostra os dois caminhos:

1. **Mover o Ghost para outro nome**, por exemplo `blog.intsoft.com.br`
   (crie o registro A, troque o `server_name` no vhost do Ghost, reemita o
   certificado) e repetir o deploy; ou
2. **`TAKE_OVER=1`**: o site assume `intsoft.com.br`, o vhost do Ghost é
   desabilitado (se era um link em `sites-enabled`, o arquivo continua em
   `sites-available`; se era arquivo de verdade, vira `.disabled` — nunca é
   apagado) e `/ghost`, `/ghost/` e `/content/` seguem para o Ghost na porta 2368. O admin continua em `https://intsoft.com.br/ghost/`; o que deixa de
   aparecer é a página pública do portal, até ele ganhar um nome próprio.

`comenta.com.br` **não resolve mais** (em 17/09/2026 não há registro A nem
CNAME; até 16/09 era um CNAME no Cloudflare para um serviço no Cloud Run). Todo
o sistema passou a viver em `intsoft.com.br`, e é esse o default dos scripts.

## Migrar o sistema completo para este servidor

> **O ramo vai em dois lugares.** Nenhum dos comandos abaixo funciona com
> `main` hoje: `deploy_site.sh`, `oci-new-instance.sh` e `ghost-api.mjs` não
> existem lá, e `bootstrap.sh` está numa versão antiga apontada para
> `comenta.com.br`. Como `curl -fsSL` sai com erro no 404 e o `bash` do outro
> lado da pipe recebe entrada vazia, o comando **falha em silêncio**. Até o
> merge, defina `ramo` e passe `BRANCH="$ramo"` junto — a URL escolhe a versão
> do script, `BRANCH` escolhe o código que o servidor clona:
>
> ```bash
> ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
> ```

Ordem que funciona, sem derrubar o blog:

1. **Crie os registros A** de `app`, `api` e `blog` apontando para
   `147.15.103.114` (nuvem cinza no Cloudflare). O `@` e o `www` já apontam.
   O `bootstrap.sh` imprime o estado de cada nome antes de mexer em qualquer
   coisa, e pula o HTTPS dos que ainda não propagaram.
2. **Suba o sistema**, assumindo os domínios que hoje são do Ghost:

   ```bash
   ssh -i ~/.ssh/intsoft_ghost ubuntu@147.15.103.114 \
     "curl -fsSL 'https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/bootstrap.sh' \
        | sudo BRANCH='$ramo' DOMAIN=intsoft.com.br TAKE_OVER=1 bash"
   ```

   O Ghost que já está lá **não é tocado**: o script detecta a porta 2368 ocupada,
   não sobe container de blog nenhum e passa a servi-lo em `blog.intsoft.com.br`.

3. **Mova a `url` do Ghost** (ele ainda acha que mora no domínio raiz, e sem isso
   manda o visitante do blog para o site novo). Só depois que `blog.intsoft.com.br`
   estiver apontando para o servidor:

   ```bash
   ssh -i ~/.ssh/intsoft_ghost ubuntu@147.15.103.114 \
     "sudo DOMAIN=intsoft.com.br TAKE_OVER=1 MOVE_GHOST=1 bash /srv/comenta/comenta/deploy/bootstrap.sh"
   ```

   Se o Cloudflare estiver com o proxy ligado (o DNS devolve IP do Cloudflare,
   não o do servidor), acrescente `FORCE_GHOST_MOVE=1` — a checagem de DNS não
   consegue enxergar através do proxy.

Pelo GitHub, o mesmo caminho é a variável `DEPLOY_STACK=full` mais
`DEPLOY_DOMAIN=intsoft.com.br` e `DEPLOY_TAKE_OVER=1`.

### 4. O tema e o conteúdo do Hoje MT, a partir do git

O servidor antigo do portal era uma VM na Azure (`hmt`, `20.55.8.18`). Ela está
parada e não inicia — o portal `hojemt.com.br` responde **522** no Cloudflare,
que é o erro de origem fora do ar. O acervo de imagens dessa máquina está no
disco dela, não aqui.

O que **está** no git e pode ir para o Ghost da Oracle:

| No repositório                                      | O que é                             |
| --------------------------------------------------- | ----------------------------------- |
| `ghost/content/themes/hojemt/`                      | tema Hoje MT (USA TODAY), v1.4.0    |
| `ghost/content/themes/hojemt/content/noticias.json` | export do Ghost: 183 posts, 13 tags |

```bash
# tema (e backup do conteúdo atual antes de qualquer coisa)
ssh -i ~/.ssh/intsoft_ghost ubuntu@147.15.103.114 \
  "curl -fsSL 'https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/ghost_restaurar_hojemt.sh' \
     | sudo BRANCH='$ramo' GHOST_ADMIN_API_KEY='<id real>:<secret real>' bash"

# tema + os 183 posts
... | sudo BRANCH="$ramo" GHOST_ADMIN_API_KEY='<id real>:<secret real>' IMPORTAR_CONTEUDO=1 bash
```

A chave sai em **Ghost → Settings → Integrations → Add custom integration**
(campo "Admin API Key", formato `id:secret`).

> **Sobre os 183 posts.** Desses, 170 usam as imagens de placeholder do próprio
> tema (`/assets/img/ph-1..4.svg`) e 13 usam fotos de banco (Unsplash). Nenhum
> traz foto de pauta nem crédito de fonte — é conteúdo de semente, não o acervo
> fotografado do portal. Por isso a importação **não roda sozinha**: só com
> `IMPORTAR_CONTEUDO=1`. O script sempre exporta o conteúdo atual para
> `/var/backups/` antes de mexer.

Para recuperar o acervo de verdade é preciso o disco da VM da Azure: destravar a
assinatura e ligar a máquina, ou criar uma VM nova a partir do disco dela e
puxar o MySQL do Ghost mais a pasta `content/images`.

### Deploy na mão, do seu Mac (sem GitHub)

A chave que a instância aceita é `~/.ssh/intsoft_ghost` (usuário `ubuntu`);
sem o `-i` o SSH responde "Permission denied (publickey)". O servidor já tem
conta Let's Encrypt, então não precisa de `EMAIL`:

```bash
ssh -i ~/.ssh/intsoft_ghost ubuntu@147.15.103.114 \
  "curl -fsSL 'https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/deploy_site.sh' | sudo BRANCH='$ramo' TAKE_OVER=1 bash"
```

Para publicar outro ramo enquanto ele não for mesclado, troque o nome **nos
dois lugares**: na URL (que escolhe a versão do script) e em `BRANCH=` (que
escolhe o código que o servidor vai clonar e buildar) — só a URL não basta.

```bash
ramo=claude/exciting-thompson-4rhut2
ssh -i ~/.ssh/intsoft_ghost ubuntu@147.15.103.114 \
  "curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/deploy_site.sh | sudo BRANCH=$ramo TAKE_OVER=1 bash"
```

Tire `TAKE_OVER=1` se preferir só ver o aviso de conflito primeiro. Numa VM
com 12 GB como essa, o build no próprio servidor leva alguns minutos.

## 2. Chave SSH para o GitHub entrar no servidor

No seu computador (não no servidor), gere um par só para o deploy:

```bash
ssh-keygen -t ed25519 -C "github-deploy comenta" -f ~/.ssh/comenta_deploy -N ""
```

Copie a **pública** para o servidor, no usuário que vai fazer o deploy
(na Oracle Cloud é `ubuntu`, que já tem `sudo` sem senha):

```bash
ssh-copy-id -i ~/.ssh/comenta_deploy.pub ubuntu@147.15.103.114
# ou, na mão, no servidor:
# cat >> ~/.ssh/authorized_keys   (cole o conteúdo de comenta_deploy.pub)
```

Confira que entra sem senha: `ssh -i ~/.ssh/comenta_deploy ubuntu@147.15.103.114 'sudo -n true && echo ok'`.

## 3. Segredos no GitHub

Em **github.com/hebertpaes/comenta → Settings → Secrets and variables → Actions**:

| Tipo     | Nome                  | Valor                                                                    |
| -------- | --------------------- | ------------------------------------------------------------------------ |
| Secret   | `DEPLOY_HOST`         | `147.15.103.114` (ou `intsoft.com.br`, depois do DNS)                    |
| Secret   | `DEPLOY_USER`         | `ubuntu`                                                                 |
| Secret   | `DEPLOY_SSH_KEY`      | conteúdo **inteiro** de `~/.ssh/comenta_deploy` (a privada)              |
| Secret   | `DEPLOY_EMAIL`        | e-mail do Let's Encrypt (opcional; sem ele o SSL é pulado)               |
| Variable | `DEPLOY_STACK`        | `site` (default) ou `full` — ver a tabela no topo                        |
| Variable | `DEPLOY_DOMAIN`       | domínio raiz do modo `full` (default: `intsoft.com.br`)                  |
| Variable | `DEPLOY_DOMAINS`      | domínios do modo `site` — default: `intsoft.com.br www.intsoft.com.br`   |
| Variable | `DEPLOY_TAKE_OVER`    | `1` para o site assumir um domínio que o Ghost já ocupa (veja "Atenção") |
| Variable | `NEXT_PUBLIC_APP_URL` | opcional — URL do painel embutida no build                               |
| Variable | `NEXT_PUBLIC_API_URL` | opcional — URL da API embutida no build                                  |
| Variable | `DEPLOY_ENABLED`      | opcional — `false` desliga o deploy sem apagar o workflow                |

A chave privada nunca sai do GitHub: o runner a usa para o `scp`/`ssh` e o
job termina. Se um dia ela vazar, apague a linha correspondente do
`authorized_keys` no servidor e gere outra.

## 4. Primeiro deploy

Faça um push na `main` (ou **Actions → Deploy → Run workflow**). O job:

1. roda `npm ci` e `npm run build -w @comenta/site` no runner;
2. monta o release (`standalone` + `.next/static` + `public`) e manda por `scp`;
3. entra por `ssh` e executa `deploy/deploy_site.sh` com `sudo`, que instala
   o que faltar, troca o symlink `/srv/comenta-site/current`, reinicia o
   processo `comenta-site` no PM2 (porta 3000), grava o Nginx e emite o SSL;
4. chama `/health` (pelo primeiro domínio de `DEPLOY_DOMAINS`, resolvido para
   o IP do servidor com `--resolve`, seguindo o redirecionamento para HTTPS) e
   espera um 200. Falhar aqui só gera aviso, não derruba o job.

O workflow **não espera o CI**: os dois disparam juntos no push. O `Build do
site` dentro do próprio Deploy já barra código que não compila; um teste
vermelho em outro pacote, não. Para publicar só depois do CI verde, use
**Run workflow** na mão em vez do push automático (ou `DEPLOY_ENABLED=false`).

### O vhost e o certificado

O script reescreve `/etc/nginx/sites-available/intsoft.com.br` inteiro a cada
deploy — inclusive o bloco `443`, quando já existe certificado cobrindo o
domínio. É por isso que o HTTPS não cai entre a gravação do arquivo e o
certbot: o bloco novo já sai com `ssl_certificate` apontando para a linhagem
encontrada em `/etc/letsencrypt/live/`.

O certbot roda em modo `certonly --webroot -w /var/www/html`, ou seja, **não
edita o Nginx**: só emite/renova, e o script grava a configuração. O
`location ^~ /.well-known/acme-challenge/` fica de fora do redirecionamento
para HTTPS, então a renovação automática (timer do certbot) continua
funcionando sem parar o serviço.

Se o certificado já cobre todos os `DOMAINS`, o passo 5 não chama o certbot —
nada de bater no limite de emissões do Let's Encrypt a cada push.

No servidor, depois:

```bash
pm2 status comenta-site      # processo
pm2 logs comenta-site        # logs do Next
ls -l /srv/comenta-site      # current -> releases/<commit>
```

## Nova instância na Oracle só para o Comenta

Se preferir não dividir a VM com o Ghost, o `deploy/oci-new-instance.sh`
cria, pelo Oracle Cloud Shell, uma instância nova com a mesma configuração da
`ghost-blog` (shape, OCPU, memória, imagem, sub-rede, disco), autoriza as suas
chaves e uma chave de deploy gerada ali, e instala o site (ou o sistema
completo, com `STACK=full`) no primeiro boot:

```bash
curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/oci-new-instance.sh" | bash
```

Ao final ele imprime o IP, os comandos de acompanhamento e os três secrets
(`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`) que ligam o workflow Deploy
à VM nova. A `ghost-blog` não é tocada.

## Tirar posts duplicados de um Ghost no ar

O portal apareceu com a mesma matéria repetida (mesmo título e imagem, slugs
diferentes) — não é bug do tema: são posts duplicados no banco, criados por um
gerador que repetia título/imagem. O `deploy/ghost-api.mjs` tem um comando que
acha e remove essas cópias pela Admin API, mantendo a **mais antiga** de cada
título. Roda de qualquer lugar que alcance o domínio; primeiro em seco:

```bash
GHOST_ADMIN_URL=https://hojemt.com.br GHOST_ADMIN_API_KEY='<id:secret>' \
  node deploy/ghost-api.mjs dedupe            # só lista o que apagaria
GHOST_ADMIN_URL=https://hojemt.com.br GHOST_ADMIN_API_KEY='<id:secret>' \
  node deploy/ghost-api.mjs dedupe --apagar   # apaga de fato
```

A chave sai em Ghost → Settings → Integrations → Add custom integration. O
seed do repositório (`noticias.json`) já foi deduplicado (era 317 posts com
134 repetições; ficou 183), então uma importação nova não recria o problema.

## hojemt.com.br numa VM nova na Oracle (Ghost igual ao de intsoft.com.br)

O mesmo `deploy/oci-new-instance.sh`, com `STACK=ghost`, cria a VM e instala
no primeiro boot um Ghost completo — MySQL, Nginx, systemd via ghost-cli, o
tema `hojemt` do repositório, título/descrição/idioma/fuso do portal — e arma
um cron que emite o certificado sozinho assim que o DNS apontar para a VM
nova (`deploy/oci-cloud-init-ghost.sh`). No **Oracle Cloud Shell** (ícone
`>_` no topo do console, região Brazil East):

```bash
ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/oci-new-instance.sh" \
  | STACK=ghost BRANCH="$ramo" EMAIL=voce@exemplo.com bash
```

Por padrão clona o shape da `ghost-blog`. Para o tamanho da VM `hmt` da Azure
(2 vCPU / 4 GiB) dentro do Always Free, acrescente
`SHAPE=VM.Standard.A1.Flex OCPUS=2 MEM=4` (ARM; a imagem Ubuntu 24.04 é
escolhida de novo para o shape). `NAME` muda o nome (default `hojemt`) e
`DOMAINS` o domínio (default `hojemt.com.br www.hojemt.com.br`).

Depois que o log da VM (`/var/log/ghost-install.log`) disser "Concluído":

1. **Cloudflare, zona hojemt.com.br**: registros A `@` e `www` → IP da VM,
   **nuvem cinza**. Hoje eles apontam (com proxy) para a VM da Azure, que está
   parada — enquanto o proxy estiver ligado o cron nunca vê o IP certo e o
   certificado não sai. Laranja só depois, com SSL/TLS "Full (strict)".
2. `https://hojemt.com.br/ghost/` → conta do dono.
3. Conteúdo, um dos dois caminhos:
   - **Acervo real, da VM da Azure** (se ela ligar): na VM nova,
     `sudo ORIGEM=hmt@20.55.8.18 bash /srv/comenta/comenta/deploy/ghost_migrar_de_outro_servidor.sh`
     — clona o banco inteiro e o `content/` (fotos, temas, usuários e senhas
     vêm junto). Pede a senha da origem uma vez; guarda o banco local anterior
     em `/var/backups/` antes de trocar e recusa migrar se a origem tiver um
     Ghost mais novo que o local.
   - **Semente do repositório** (183 posts, 170 com imagem de placeholder):
     `/root/LEIA-ghost.txt` na VM tem o comando do
     `ghost_restaurar_hojemt.sh` com a Admin API key.
   - **Só o conteúdo, sem SSH** (posts, tags, páginas, configurações): com uma
     Admin API key de cada Ghost, `deploy/ghost_migrar_api.sh` exporta de um e
     importa no outro pela Admin API — roda de qualquer lugar que alcance os
     dois domínios. Não leva os arquivos de imagem (as URLs seguem apontando
     para a origem), então serve quando as fotos são de banco/placeholder, não
     para o acervo com fotos próprias.

## Sem GitHub (na mão, no servidor)

Veja "Deploy na mão, do seu Mac" acima: o mesmo script clona o repositório e
builda no servidor quando não recebe `RELEASE_TARBALL`. Variáveis úteis:
`BRANCH`, `DOMAINS`, `EMAIL`, `SKIP_SSL=1`, `TAKE_OVER=1`.

## O que mudou em relação ao `oracle_setup.sh`

O `deploy/oracle_setup.sh` subia um `server.js` de espera na porta 2368 e
apontava o Nginx dos dois domínios para ele. O `deploy_site.sh` grava o
**mesmo arquivo** (`/etc/nginx/sites-available/intsoft.com.br`) apontando
para o site de verdade na porta 3000, então rodar o novo por cima do antigo
troca a página de espera pelo site sem sobrar bloco duplicado no Nginx. O
processo antigo (`intsoft-comenta` no PM2 do usuário `ubuntu`) pode ser
removido com `pm2 delete intsoft-comenta`.
