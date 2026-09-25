# Atendechat em intsoft.com.br — roteiro de instalação

Preparado em 25/09/2026 a partir do instalador enviado pelo editor
(`instalador-main.zip`, scripts `install_primaria` / `install_instancia`).
O instalador **não** fica neste repositório: ele contém a credencial do
fornecedor usada para baixar o código privado do Atendechat.

## Situação atual

- `intsoft.com.br` e `www` → `147.15.103.114` (Oracle Cloud, São Paulo),
  DNS na Cloudflare (`cheryl`/`evan.ns.cloudflare.com`), e-mail no iCloud.
- Nesse servidor já roda um **Ghost** (nginx 1.24 + Express) com o tema do
  HOJE MT, site "Intsoft".
- `app.intsoft.com.br` e `api.intsoft.com.br` ainda não existem.

## O que o instalador faz no servidor (atenção)

Roda como root e, em ordem: `apt update/upgrade`; instala **Node 20 pelo
NodeSource** (troca o Node do sistema), PM2, Docker, dependências do
Puppeteer, snapd, **nginx** (apaga `/etc/nginx/sites-enabled/default`),
certbot e PostgreSQL; cria o usuário `deploy`; clona o código; cria o
Redis em Docker; build do backend e do frontend; migrações e seed; sobe no
PM2; cria os sites do nginx e pede os certificados com certbot.

Por isso, **recomendado: uma VM nova só para o Atendechat** (Ubuntu 22.04,
mínimo 2 vCPU / 4 GB de RAM; na Oracle, a Ampere A1 gratuita serve). Instalar
no mesmo servidor do Ghost é possível, mas a troca de Node e o `apt upgrade`
podem derrubar o site até ser ajustado.

## Decisão do editor (25/09): instalar no MESMO servidor do Ghost do intsoft

Esse servidor (Oracle, 147.15.103.114) não é o do HOJE MT (o HOJE MT roda
na VM Azure, atrás da Cloudflare), então o portal não é afetado. O Ghost
do intsoft fica no ar se estas verificações forem feitas antes e depois:

```bash
# ANTES (como o usuário do Ghost, ex.: ubuntu)
free -h                 # precisa de 4 GB (RAM + swap); se menos, criar swap abaixo
node -v                 # anotar a versão usada pelo Ghost
cd /var/www/* && ghost ls && ghost backup   # guardar o backup gerado
ls /etc/nginx/sites-enabled/                # o Ghost usa <dominio>.conf; o instalador só apaga "default"
sudo ss -ltnp | grep -E ':(2368|3000|4000|5000)\b'   # 3000/4000/5000 devem estar livres

# swap de 4 GB se a máquina tiver pouca RAM
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile \
  && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

O instalador instala o Node 20 (NodeSource). O Ghost 6 aceita Node 20.11+ ou
22.13+; se o `node -v` de antes era 22, o Ghost continua funcionando com o 20,
mas confira no passo DEPOIS.

```bash
# DEPOIS da instalação
cd /var/www/* && ghost ls && ghost doctor     # Ghost "running"
curl -I https://intsoft.com.br                # 200
sudo nginx -t && pm2 list                     # nginx ok; intsoft-backend/frontend online
```

Se o Ghost cair: `ghost restart`; se reclamar da versão do Node, `ghost doctor`
mostra o motivo (em último caso, restaurar o backup com `ghost import`).

## Passo a passo

1. **DNS na Cloudflare** (zona intsoft.com.br) — dois registros A apontando
   para o IP do servidor do Atendechat, com a nuvem **cinza (DNS only)**
   durante a instalação, para o certbot validar:
   - `app` → IP do servidor (painel/frontend)
   - `api` → IP do servidor (backend)
2. **Firewall**: portas 80 e 443 abertas (na Oracle: Security List da VCN
   **e** iptables/ufw da VM).
3. **Copiar o instalador** para o servidor e entrar como root:
   ```bash
   sudo su - root
   cd /root
   unzip instalador-main.zip && mv instalador-main instalador
   cd instalador && chmod +x install_primaria install_instancia
   ./install_primaria
   ```
4. **Respostas do menu** (opção `0` — Instalar Atendechat):
   | Pergunta | Resposta sugerida |
   |---|---|
   | Senha do usuário deploy e do banco | senha forte **só com letras e números** |
   | Nome da instância | `intsoft` (minúsculas, sem espaço) |
   | Qtde de conexões/WhatsApp | ex.: `10` |
   | Qtde de usuários/atendentes | ex.: `20` |
   | Domínio do FRONTEND | `https://app.intsoft.com.br` |
   | Domínio do BACKEND | `https://api.intsoft.com.br` |
   | Porta do frontend | `3000` |
   | Porta do backend | `4000` |
   | Porta do Redis | `5000` |
5. **Conferir** depois da instalação:
   ```bash
   pm2 list                      # intsoft-backend e intsoft-frontend "online"
   curl -I https://api.intsoft.com.br
   curl -I https://app.intsoft.com.br
   ```
   Abrir `https://app.intsoft.com.br`, entrar com o usuário admin padrão
   mostrado no curso e **trocar a senha na hora**.
6. Depois de tudo funcionando, pode voltar a nuvem da Cloudflare para
   laranja (proxy), com SSL "Full (strict)".

## Se der erro

Mande a saída do terminal (as últimas 40 linhas) e a de `pm2 logs --lines 50`.
