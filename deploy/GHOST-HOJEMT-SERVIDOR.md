# Ghost do HOJE MT em produção — como o servidor está montado de verdade

Anotado em 01/10/2026, depois de uma queda (Cloudflare 502). Vale mais que `install_ghost.sh`
e que os scripts antigos do repositório, que falam em pm2 e `/var/www/ghost`.

| Item | Valor real |
| --- | --- |
| Servidor | VM Ubuntu 24.04 (Azure), usuário `hmt`, disco `/` de ~28 GB |
| Instalação do Ghost | `/var/www/hojemt` (ghost-cli, Ghost 6.x) — **não** é `/var/www/ghost` |
| Gerenciador de processo | **systemd**, unidade `ghost_hojemt-com-br` — **não** é pm2 (`pm2 ls` vem vazio) |
| Porta do Ghost | **2369** (`server.port` em `/var/www/hojemt/config.production.json`) |
| Banco | MySQL local, base `ghost_prod` (acesso root via `sudo mysql`, por socket) |
| Nginx | `/etc/nginx/sites-enabled/` (são links simbólicos: use `grep -R`, não `grep -r`) |

`deploy/nginx_hojemt.conf` ainda aponta para 2368; no servidor, o `proxy_pass` tem de apontar para
**2369** (ou a porta que estiver no `config.production.json`). Porta diferente = 502.

## Sintoma: Cloudflare 502 "Host Error"

O nginx está de pé e o Ghost não. Causas vistas até aqui: **disco cheio** (MySQL e Ghost param de
gravar e caem). Sempre comece por:

```bash
df -h /
sudo systemctl status mysql ghost_hojemt-com-br --no-pager | head -30
sudo journalctl -u ghost_hojemt-com-br -n 60 --no-pager
tail -n 40 /var/www/hojemt/content/logs/*error.log
```

## Religar

```bash
sudo systemctl restart mysql
cd /var/www/hojemt && ghost ls            # mostra running/stopped
sudo systemctl start ghost_hojemt-com-br  # ou: ghost start
sudo systemctl enable ghost_hojemt-com-br mysql   # sobe sozinho depois de reboot
curl -I http://127.0.0.1:2369/            # 200 ou 301
curl -I https://hojemt.com.br/
```

## Onde o disco costuma ir embora (medido em 01/10/2026: 28 GB, 100% usado)

`/home/hmt/backups` ~7 GB · `/home/hmt/hojemt-repo` ~4 GB · `/home/hmt/midia-recebida` ~2 GB ·
`/home/hmt/.claude` ~1,3 GB · `/var/lib/snapd` ~2,5 GB · `/var/www/hojemt` ~3,4 GB ·
`/var/log` (journal) ~1 GB · caches do npm ~0,7 GB.

Limpeza segura (nunca mexa em `/var/lib/mysql`, `content/images` nem `content/data`):

```bash
sudo journalctl --vacuum-size=100M
sudo apt-get clean
npm cache clean --force; sudo npm cache clean --force
sudo find /var/www/hojemt/content/logs -name '*.log*' -mtime +3 -delete
sudo find /tmp -xdev -type f -mtime +2 -delete
# backups antigos: primeiro só listar, depois apagar
find /home/hmt/backups -type f -mtime +7 -print
# versões antigas de snap
snap list --all | awk '/disabled/{print $1, $3}'     # e: sudo snap remove NOME --revision=REV
sudo snap set system refresh.retain=2
```

Para não repetir: rotação de `/home/hmt/backups` (manter os 7 mais recentes ou copiar para fora da
VM), `binlog_expire_logs_seconds=259200` no MySQL e um alerta quando `/` passar de 85%.

## Segurança

Nenhuma senha deste servidor deve ficar em script ou chat. As que apareceram em texto no
repositório e em conversas (SSH do `hmt`, MySQL, admin do Ghost) precisam ser trocadas.
