# Publicar o Comenta em produção (VPS + Docker + Nginx)

Repositório **único** (monorepo). Coloca **todos os produtos** no ar sob `comenta.com.br`:

| Produto | Domínio | Origem | Serviço |
|---|---|---|---|
| Site / landing + chat (Next.js) | `comenta.com.br` (+ `www`) | `site/` | `site` (:3000) |
| Painel (React/Vite) | `app.comenta.com.br` | `saas/web` | `panel` (:8080) |
| API (Fastify + Postgres + Redis) | `api.comenta.com.br` | `saas/api` | `api` (:4000) |
| Blog / CMS (Ghost + MySQL) | `blog.comenta.com.br` | imagem oficial | `ghost` (:2368) |

Os serviços escutam só em `127.0.0.1`; o **Nginx do host** (com TLS via Let's Encrypt) publica os domínios.

---

## Instalação automática (1 comando)

Com o **DNS já apontando** para o VPS, rode como root:

```bash
curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/claude/project-creation-az9g99/deploy/bootstrap.sh \
  | sudo DOMAIN=comenta.com.br [email protected] bash
```

O `bootstrap.sh` instala Docker/Nginx/Certbot, clona **este** repo, builda o
painel, sobe os containers, configura o Nginx e emite o SSL. Use `SKIP_SSL=1`
enquanto o DNS não propagou.

---

## Passo a passo

### 1. DNS
Registros **A** para o IP do VPS: `@`, `www`, `app`, `api`, `blog`.

### 2. Pré-requisitos no VPS
```bash
curl -fsSL https://get.docker.com | sh
sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### 3. Clonar o repo
```bash
sudo mkdir -p /srv/comenta && cd /srv/comenta
git clone https://github.com/hebertpaes/comenta.git
git -C comenta checkout claude/project-creation-az9g99   # enquanto não mesclar
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
sudo certbot --nginx -d comenta.com.br -d www.comenta.com.br -d app.comenta.com.br -d api.comenta.com.br
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
- **WhatsApp** do chat do site: ajuste `NEXT_PUBLIC_WHATSAPP` no `.env`.
- Estrutura do monorepo (npm workspaces, lockfile único na raiz): `site/` (landing+chat), `saas/api`, `saas/web`, `packages/shared` (contratos comuns à API e ao painel), `content/` (robô do blog), `apps/editor` (editor de vídeo), `deploy/` (este) e `projects/comenta/` (instalador, fora dos workspaces).
- Os Dockerfiles de `saas/api`, `site` e `content` usam a **raiz** do repositório como contexto de build, porque o lockfile é único e `@comenta/shared` só existe localmente.
