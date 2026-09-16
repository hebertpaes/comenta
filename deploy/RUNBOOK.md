# Publicar o Comenta em produção (VPS + Docker + Nginx)

Repositório **único** (monorepo). Coloca **todos os produtos** no ar sob `comenta.com.br`:

| Produto                          | Domínio                    | Origem         | Serviço         |
| -------------------------------- | -------------------------- | -------------- | --------------- |
| Site / landing + chat (Next.js)  | `comenta.com.br` (+ `www`) | `site/`        | `site` (:3000)  |
| Painel (React/Vite)              | `app.comenta.com.br`       | `saas/web`     | `panel` (:8080) |
| API (Fastify + Postgres + Redis) | `api.comenta.com.br`       | `saas/api`     | `api` (:4000)   |
| Blog / CMS (Ghost + MySQL)       | `blog.comenta.com.br`      | imagem oficial | `ghost` (:2368) |

Os serviços escutam só em `127.0.0.1`; o **Nginx do host** (com TLS via Let's Encrypt) publica os domínios.

---

## Instalação automática (1 comando)

Com o **DNS já apontando** para o VPS, rode como root:

```bash
curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/claude/modernizacao/deploy/bootstrap.sh \
  | sudo DOMAIN=comenta.com.br [email protected] bash
```

> **Use `claude/modernizacao`, não o ramo base.** O `bootstrap.sh` do
> `claude/project-creation-az9g99` está quebrado desde a migração para npm
> workspaces: ele monta só `saas/web` e roda `npm ci` lá dentro, onde não
> existe mais lockfile — falha na etapa 4/7. A correção está no ramo desta
> modernização. Depois que o PR for mesclado, troque para o ramo padrão.

O `bootstrap.sh` instala Docker/Nginx/Certbot, clona **este** repo, builda o
painel, sobe os containers, configura o Nginx e emite o SSL. Use `SKIP_SSL=1`
enquanto o DNS não propagou.

---

## Passo a passo

### 1. DNS

Registros **A** para o IP do VPS: `@`, `www`, `app`, `api`, `blog`.

**Estado em 26/07/2026:** só o apex `comenta.com.br` tem registro A (aponta
para o Cloudflare, `104.21.93.129`, e o que responde atrás dele é um 404 do
Google — sobra de um deploy antigo em Cloud Run, não este repositório).
`www`, `app`, `api` e `blog` **não existem** — nem A, nem CNAME. Nenhum
serviço deste repositório está no ar hoje.

#### Se o domínio estiver no Cloudflare (é o caso hoje)

Os nameservers de `comenta.com.br` são `cheryl.ns.cloudflare.com` e
`evan.ns.cloudflare.com`, então os registros se criam no painel do Cloudflare.

Crie os cinco registros com o **proxy desligado** (nuvem **cinza**, "DNS only"):

| Tipo | Nome   | Conteúdo  | Proxy |
| ---- | ------ | --------- | ----- |
| A    | `@`    | IP do VPS | cinza |
| A    | `www`  | IP do VPS | cinza |
| A    | `app`  | IP do VPS | cinza |
| A    | `api`  | IP do VPS | cinza |
| A    | `blog` | IP do VPS | cinza |

O proxy precisa ficar desligado **pelo menos até o SSL sair**. Com a nuvem
laranja, o Cloudflare responde no lugar do seu servidor e o desafio HTTP-01 do
`certbot --nginx` nunca chega no Nginx — a emissão falha com
`Invalid response ... 404`. O apex hoje está justamente nesse estado.

Depois que o Certbot emitir os certificados, você pode religar o proxy — mas
só com **SSL/TLS → Overview → Full (strict)**. Em "Flexible" o Cloudflare fala
HTTP com o seu servidor, e o Nginx responde com um redirecionamento para HTTPS:
o resultado é um laço de redirecionamento infinito.

Duas coisas que também merecem atenção com o proxy ligado:

- **WebSocket do painel.** A API usa Socket.IO em `api.comenta.com.br`. O
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
for h in comenta.com.br www.comenta.com.br app.comenta.com.br \
         api.comenta.com.br blog.comenta.com.br; do
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
VITE_API_URL=https://api.comenta.com.br npm run build -w @comenta/web
```

### 6. Subir tudo

```bash
cd /srv/comenta/comenta/deploy
docker compose --env-file .env up -d --build
docker compose ps
```

### 7. Nginx + HTTPS

```bash
sudo cp deploy/nginx/comenta.conf /etc/nginx/sites-available/comenta.conf
sudo ln -s /etc/nginx/sites-available/comenta.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d comenta.com.br -d www.comenta.com.br -d app.comenta.com.br -d api.comenta.com.br -d blog.comenta.com.br
```

---

## Atualizar

```bash
cd /srv/comenta/comenta && git pull
npm ci
npm run build -w @comenta/shared
VITE_API_URL=https://api.comenta.com.br npm run build -w @comenta/web
cd deploy && docker compose --env-file .env up -d --build
```

## Logs

```bash
cd /srv/comenta/comenta/deploy
docker compose logs -f site
docker compose logs -f api
```

## Notas

- **IA Claude**: sem `ANTHROPIC_API_KEY`, a API responde `503` só nos endpoints de IA.
- **Painel instalável**: em `https://app.comenta.com.br` o Chrome oferece "Instalar" e o atendente ganha um app de janela própria, com ícone no Dock — como o Chrome Remote Desktop. Depende do HTTPS do passo 7: por `http://` (ou pelo IP da LAN) o navegador não oferece nada. Detalhes e solução de problemas em [`saas/web/README.md`](../saas/web/README.md).
- **WhatsApp** do chat do site: ajuste `NEXT_PUBLIC_WHATSAPP` no `.env`.
- Estrutura do monorepo (npm workspaces, lockfile único na raiz): `site/` (landing+chat), `saas/api`, `saas/web`, `packages/shared` (contratos comuns à API e ao painel), `content/` (robô do blog), `apps/editor` (editor de vídeo), `deploy/` (este) e `projects/comenta/` (instalador, fora dos workspaces).
- Os Dockerfiles de `saas/api`, `site` e `content` usam a **raiz** do repositório como contexto de build, porque o lockfile é único e `@comenta/shared` só existe localmente.
- `deploy/` é o **único** lugar de deploy do repositório: compose, nginx, `bootstrap.sh` e, em `deploy/azure/`, os scripts de publicação na Azure. O antigo `saas/deploy/` foi removido — era um subconjunto deste, sem site, blog e painel, e expunha a API direto na porta 4000 em vez de só em `127.0.0.1`.
