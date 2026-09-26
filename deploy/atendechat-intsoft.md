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

## Acesso SSH ao servidor (recuperado em 25/09)

A chave original da VM se perdeu. O acesso sai do Oracle Cloud Shell:

1. Criar uma sessão gerenciada no Bastion `ghostbastion` com a chave
   `~/.ssh/ghostkey.pub` (dura 3 h). Enquanto ela está ativa, o plugin
   Bastion da VM coloca essa chave em `authorized_keys` do usuário `ubuntu`.
2. O túnel pelo próprio Bastion fecha a conexão ("kex_exchange_identification");
   em vez dele, entrar direto no IP público com a `ghostkey` durante a sessão.
3. Nessa janela, instalar uma chave permanente `~/.ssh/intsoft_admin`
   (RSA 4096: o Cloud Shell roda em modo FIPS e recusa ed25519) e o atalho
   `ssh intsoft` em `~/.ssh/config`.
4. Guardar cópia da chave privada `intsoft_admin` num gerenciador de senhas.
   Nunca no repositório nem em conversa.

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

**Atenção ao Node.** O instalador do fornecedor tenta pôr o Node 20 (NodeSource)
no sistema. O Ghost 6.63 do intsoft exige Node `^22.23.1 || ^24.20.0` (conferido
no registro npm em 25/09) e hoje roda com o 22.23.2. Por isso, no servidor do
Ghost, usar só a versão corrigida do instalador (`instalador-intsoft`), que não
mexe no Node do sistema. Situação verificada em 25/09: Ubuntu 24.04.5, 11 GB de
RAM, sem swap, 40 GB livres, sem Docker, Postgres ou PM2; `app` e `api` ainda
sem registro no DNS.

Detalhes do servidor conferidos em 25/09 (Claude Code rodando no Cloud Shell):

- Node 22.23.2 veio do apt, repositório NodeSource
  (`/etc/apt/sources.list.d/nodesource.sources`); o serviço
  `ghost_intsoft-com-br` roda `/usr/bin/node` como usuário `ghost` (uid 997).
- `nginx -t` passa; `client_max_body_size` está nos blocos do Ghost (1g no SSL,
  50m no HTTP), sem diretiva no nível `http`.
- iptables: INPUT libera só 22, 80 e 443; FORWARD rejeita tudo.
- Fuso do servidor: UTC.
- Banco do Ghost: MySQL local `ghost_prod` (o site ainda não tem posts).

Backup feito antes de qualquer instalação (25/09 19:36 UTC), sem `ghost backup`
(que pede login de administrador): `sudo mysqldump --single-transaction
--routines --triggers ghost_prod | gzip` + `tar` de `content/` e
`config.production.json`. Ficou em `/var/www/ghost/backup/` no servidor e em
`~/backups-ghost/` no Cloud Shell (o tar contém a senha do banco: manter com
permissão 600).

```bash
# DEPOIS da instalação
cd /var/www/* && ghost ls && ghost doctor     # Ghost "running"
curl -I https://intsoft.com.br                # 200
sudo nginx -t && pm2 list                     # nginx ok; intsoft-backend/frontend online
```

Se o Ghost cair: `ghost restart`; se reclamar da versão do Node, `ghost doctor`
mostra o motivo (em último caso, restaurar o backup com `ghost import`).

## Pacote de instalação guiada (26/09) — use este

O passo a passo manual abaixo ficou como referência. Para instalar, use o
`pacote-intsoft.zip` (versão do patch `2026-09-26.1`, sha256
`17275beea1f1e814ebb435927d13b82328de191f1e604c866dba14c979cd1be7`), entregue
ao editor pelo chat e **fora deste repositório** (tem trechos adaptados dos
scripts do fornecedor). O pacote **não** tem a credencial do fornecedor nem
senhas: ele aplica as correções no `instalador-main.zip` original do editor
dentro do servidor e confere antes se é a versão testada (23/05/2025).

- Siga o `LEIA-ME.txt` do pacote (Passos 1 a 10, pelo Cloud Shell da Oracle,
  dentro do `tmux`). A instalação guiada pergunta tudo, gera senhas fortes se
  você só apertar Enter, troca a senha de fábrica do painel logo após o seed e
  manda as credenciais por e-mail (Gmail, porta 587, senha de app de
  intsoft@intsoft.com.br). Depois, apague a mensagem em Enviados do Gmail e
  revogue a senha de app.
- Não mexe no Node do Ghost, não reinicia o nginx (só testa e recarrega), não
  muda o fuso nem o firewall, faz backup do Ghost antes e roda o `posflight`
  no fim.
- Testado só em ambiente simulado (PostgreSQL e bcrypt reais; Docker, nginx,
  certbot e systemd simulados). Ainda não confirmados no servidor real: a
  tabela `"Users"` do Atendechat (`email`/`"passwordHash"`), a rota
  `/auth/login`, o envio pelo Gmail e a entrega no iCloud. Se a troca da
  senha do painel falhar, a instalação para sem publicar o painel.
- Passo 10 (limpeza): apagar o `instalador-main.zip` original (e a pasta que
  o Mac cria ao abrir) do Mac, do Cloud Shell e do `/home/ubuntu` do
  servidor: ele tem a credencial do fornecedor.

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
