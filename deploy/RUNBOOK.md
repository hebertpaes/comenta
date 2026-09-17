# Publicar o Comenta em produção (VPS + Docker + Nginx)

Repositório **único** (monorepo). Coloca **todos os produtos** no ar sob `intsoft.com.br`
(o domínio vem de `DOMAIN`; nada está cravado no compose):

| Produto                          | Domínio                    | Origem     | Serviço         |
| -------------------------------- | -------------------------- | ---------- | --------------- |
| Site / landing + chat (Next.js)  | `intsoft.com.br` (+ `www`) | `site/`    | `site` (:3000)  |
| Painel (React/Vite)              | `app.intsoft.com.br`       | `saas/web` | `panel` (:8080) |
| API (Fastify + Postgres + Redis) | `api.intsoft.com.br`       | `saas/api` | `api` (:4000)   |
| Blog / CMS (Ghost)               | `blog.intsoft.com.br`      | ghost-cli  | `-` (:2368)     |

O blog é o Ghost que **já está instalado** no servidor (fora do Docker). O
compose também traz um container de Ghost, mas ele fica no profile `ghost` e só
sobe num servidor limpo — ver "Ghost" mais abaixo.

Os serviços escutam só em `127.0.0.1`; o **Nginx do host** (com TLS via Let's Encrypt) publica os domínios.

---

## Instalação automática (1 comando)

Com o **DNS já apontando** para o VPS, rode como root:

```bash
ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/bootstrap.sh" \
  | sudo BRANCH="$ramo" DOMAIN=intsoft.com.br TAKE_OVER=1 [email protected] bash
```

O script confere o DNS de cada nome antes de agir, não sobrescreve vhost de
outro site sem `TAKE_OVER=1`, reaproveita o Ghost que já existe na porta 2368,
emite **um certificado por domínio** (um registro que ainda não propagou não
impede os outros) e reescreve o vhost inteiro a cada execução já com o bloco
`443` — o HTTPS não cai entre o deploy e o certbot.

### Ghost

`GHOST_MODE=auto` (padrão): se houver algo na 2368, esse Ghost é mantido e o
container do blog não sobe. `GHOST_MODE=docker` força o container (só faz
sentido em servidor limpo). Quando o sistema assume o domínio raiz, a `url` do
Ghost precisa ir para `https://blog.DOMAIN`, senão o blog redireciona o visitante
para o site novo; isso é feito com `MOVE_GHOST=1`, e o script **recusa** enquanto
`blog.DOMAIN` não apontar para o servidor — mover antes disso deixaria o blog
sem endereço nenhum.

O `bootstrap.sh` instala Docker/Nginx/Certbot, clona **este** repo, builda o
painel, sobe os containers, configura o Nginx e emite o SSL. Use `SKIP_SSL=1`
enquanto o DNS não propagou.

---

## Passo a passo

### 1. DNS

Registros **A** para o IP do servidor: `@`, `www`, `app`, `api`, `blog`.

**Estado em 17/09/2026** (conferido por DNS e HTTP):

| Nome                  | Aponta para                                                |
| --------------------- | ---------------------------------------------------------- |
| `intsoft.com.br`      | `147.15.103.114` — Ghost no ar                             |
| `www.intsoft.com.br`  | `147.15.103.114` — Ghost no ar                             |
| `app.intsoft.com.br`  | **não existe**                                             |
| `api.intsoft.com.br`  | **não existe**                                             |
| `blog.intsoft.com.br` | **não existe**                                             |
| `comenta.com.br`      | **não resolve mais** (era o antigo CNAME para o Cloud Run) |

Ou seja: **faltam três registros A** (`app`, `api`, `blog`) apontando para
`147.15.103.114`. Sem eles o painel e a API não têm endereço, e o blog não tem
para onde ir quando o site assumir o domínio raiz — por isso o `bootstrap.sh`
se recusa a mover o Ghost antes de `blog` existir.

#### Se o domínio estiver no Cloudflare

Os registros se criam no painel do Cloudflare (zona `intsoft.com.br`).

Crie os cinco registros com o **proxy desligado** (nuvem **cinza**, "DNS only"):

| Tipo | Nome   | Conteúdo  | Proxy |
| ---- | ------ | --------- | ----- |
| A    | `@`    | IP do VPS | cinza |
| A    | `www`  | IP do VPS | cinza |
| A    | `app`  | IP do VPS | cinza |
| A    | `api`  | IP do VPS | cinza |
| A    | `blog` | IP do VPS | cinza |

O proxy precisa ficar desligado **pelo menos até o SSL sair**. Com a nuvem
laranja, o Cloudflare responde no lugar do seu servidor e o desafio HTTP-01
pode não chegar ao Nginx — a emissão falha com `Invalid response ... 404`.
Hoje o apex está com a nuvem **cinza** (o DNS devolve o IP do servidor, não um
IP do Cloudflare), que é o estado certo para emitir.

Depois que o Certbot emitir os certificados, você pode religar o proxy — mas
só com **SSL/TLS → Overview → Full (strict)**. Em "Flexible" o Cloudflare fala
HTTP com o seu servidor, e o Nginx responde com um redirecionamento para HTTPS:
o resultado é um laço de redirecionamento infinito.

Duas coisas que também merecem atenção com o proxy ligado:

- **WebSocket do painel.** A API usa Socket.IO em `api.intsoft.com.br`. O
  Cloudflare suporta WebSocket, mas confirme em **Network → WebSockets** que
  está habilitado, senão o tempo real do painel para de funcionar.
- **QR do WhatsApp.** O pareamento via Baileys depende de conexão longa; o
  timeout de 100 s do Cloudflare no plano gratuito pode cortar. Se o QR ficar
  expirando, deixe `api` sem proxy (nuvem cinza).

Alternativa, se quiser manter o proxy ligado desde o início: emita um
**Origin Certificate** no Cloudflare (SSL/TLS → Origin Server), instale-o no
Nginx e rode o bootstrap com `SKIP_SSL=1`, pulando o Certbot.

Confira a propagação antes de seguir:

```bash
for h in intsoft.com.br www.intsoft.com.br app.intsoft.com.br \
         api.intsoft.com.br blog.intsoft.com.br; do
  printf '%-24s %s\n' "$h" "$(dig +short "$h" A | tail -1)"
done
```

Todos os cinco têm de devolver o IP do VPS. Enquanto não devolverem, use
`SKIP_SSL=1` no bootstrap e emita o certificado depois.

### 2. Pré-requisitos no VPS

```bash
curl -fsSL https://get.docker.com | sh
sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### 3. Clonar o repo

```bash
sudo mkdir -p /srv/comenta && cd /srv/comenta
git clone https://github.com/hebertpaes/comenta.git
git -C comenta checkout claude/modernizacao   # enquanto o PR não for mesclado
```

### 4. Segredos

```bash
cd /srv/comenta/comenta/deploy
cp .env.example .env
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
nano .env              # DB_PASSWORD, REDIS_PASSWORD, ANTHROPIC_API_KEY, NEXT_PUBLIC_WHATSAPP
```

### 5. Build do painel (uma vez)

O repositório é um monorepo npm workspaces: o `npm ci` roda na raiz, uma vez
para todos os projetos. O painel importa `@comenta/shared`, que precisa ser
compilado antes.

```bash
cd /srv/comenta/comenta
npm ci
npm run build -w @comenta/shared
VITE_API_URL=https://api.intsoft.com.br npm run build -w @comenta/web
```

### 6. Subir tudo

```bash
cd /srv/comenta/comenta/deploy
docker compose --env-file .env up -d --build
docker compose ps
```

### 7. Nginx + HTTPS

O `deploy/nginx/comenta.conf` versionado é **só referência**: quem grava o vhost
é o `bootstrap.sh`, e ele reescreve o arquivo inteiro a cada execução. Não edite
`/etc/nginx/sites-available/comenta.conf` à mão — a próxima execução sobrescreve.

```bash
sudo DOMAIN=intsoft.com.br TAKE_OVER=1 [email protected] bash deploy/bootstrap.sh
```

---

## Atualizar

```bash
# o próprio bootstrap.sh atualiza o repo, rebuilda o painel e sobe os containers
sudo DOMAIN=intsoft.com.br TAKE_OVER=1 bash /srv/comenta/comenta/deploy/bootstrap.sh
```

## Logs

```bash
cd /srv/comenta/comenta/deploy
docker compose logs -f site
docker compose logs -f api
```

## Notas

- **IA Claude**: sem `ANTHROPIC_API_KEY`, a API responde `503` só nos endpoints de IA.
- **Painel instalável**: em `https://app.intsoft.com.br` o Chrome oferece "Instalar" e o atendente ganha um app de janela própria, com ícone no Dock — como o Chrome Remote Desktop. Depende do HTTPS do passo 7: por `http://` (ou pelo IP da LAN) o navegador não oferece nada. Detalhes e solução de problemas em [`saas/web/README.md`](../saas/web/README.md).
- **WhatsApp** do chat do site: ajuste `NEXT_PUBLIC_WHATSAPP` no `.env`.
- Estrutura do monorepo (npm workspaces, lockfile único na raiz): `site/` (landing+chat), `saas/api`, `saas/web`, `packages/shared` (contratos comuns à API e ao painel), `content/` (robô do blog), `apps/editor` (editor de vídeo), `deploy/` (este) e `projects/comenta/` (instalador, fora dos workspaces).
- Os Dockerfiles de `saas/api`, `site` e `content` usam a **raiz** do repositório como contexto de build, porque o lockfile é único e `@comenta/shared` só existe localmente.
- `deploy/` é o **único** lugar de deploy do repositório: compose, nginx, `bootstrap.sh` e, em `deploy/azure/`, os scripts de publicação na Azure. O antigo `saas/deploy/` foi removido — era um subconjunto deste, sem site, blog e painel, e expunha a API direto na porta 4000 em vez de só em `127.0.0.1`.
