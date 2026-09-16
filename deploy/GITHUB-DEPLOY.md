# Deploy pelo GitHub → servidor (intsoft.com.br e comenta.com.br)

Cada push na `main` publica o site (Next.js, pasta `site/`) no servidor, sem
passo manual. O build roda no GitHub Actions; o servidor só recebe o resultado
e reinicia o processo. Também dá para disparar na mão, de qualquer ramo, em
**Actions → Deploy → Run workflow**.

| Peça               | Onde                           | O que faz                                                        |
| ------------------ | ------------------------------ | ---------------------------------------------------------------- |
| Workflow           | `.github/workflows/deploy.yml` | Builda o site, manda um tarball por SSH e roda o script          |
| Script do servidor | `deploy/deploy_site.sh`        | Instala Node/PM2/Nginx/Certbot, publica o release, SSL           |
| Página da IntSoft  | `site/app/intsoft/page.tsx`    | Servida em `/intsoft` e na raiz quando o host é `intsoft.com.br` |

O mesmo processo responde pelos dois domínios: `intsoft.com.br` abre a página
institucional da IntSoft e `comenta.com.br` abre a home do Comenta (rewrite por
host em `site/next.config.js`).

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

| Tipo     | Nome                  | Valor                                                                                     |
| -------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Secret   | `DEPLOY_HOST`         | `147.15.103.114` (ou `intsoft.com.br`, depois do DNS)                                     |
| Secret   | `DEPLOY_USER`         | `ubuntu`                                                                                  |
| Secret   | `DEPLOY_SSH_KEY`      | conteúdo **inteiro** de `~/.ssh/comenta_deploy` (a privada)                               |
| Secret   | `DEPLOY_EMAIL`        | e-mail do Let's Encrypt (opcional; sem ele o SSL é pulado)                                |
| Variable | `DEPLOY_DOMAINS`      | opcional — default: `intsoft.com.br www.intsoft.com.br comenta.com.br www.comenta.com.br` |
| Variable | `NEXT_PUBLIC_APP_URL` | opcional — URL do painel embutida no build                                                |
| Variable | `NEXT_PUBLIC_API_URL` | opcional — URL da API embutida no build                                                   |
| Variable | `DEPLOY_ENABLED`      | opcional — `false` desliga o deploy sem apagar o workflow                                 |

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
4. chama `http://SERVIDOR/health` e espera um 200.

No servidor, depois:

```bash
pm2 status comenta-site      # processo
pm2 logs comenta-site        # logs do Next
ls -l /srv/comenta-site      # current -> releases/<commit>
```

## Sem GitHub (na mão, no servidor)

O mesmo script clona o repositório e builda ali — serve para um servidor sem
os segredos configurados, ou para testar um ramo:

```bash
curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/main/deploy/deploy_site.sh \
  | sudo BRANCH=main EMAIL=voce@exemplo.com bash
```

Numa VM com menos de 2 GB de RAM o `npm ci` do monorepo pode ser morto por
falta de memória; nesse caso prefira o caminho pelo GitHub, que não compila
nada no servidor.

## O que mudou em relação ao `oracle_setup.sh`

O `deploy/oracle_setup.sh` subia um `server.js` de espera na porta 2368 e
apontava o Nginx dos dois domínios para ele. O `deploy_site.sh` grava o
**mesmo arquivo** (`/etc/nginx/sites-available/intsoft.com.br`) apontando
para o site de verdade na porta 3000, então rodar o novo por cima do antigo
troca a página de espera pelo site sem sobrar bloco duplicado no Nginx. O
processo antigo (`intsoft-comenta` no PM2 do usuário `ubuntu`) pode ser
removido com `pm2 delete intsoft-comenta`.
