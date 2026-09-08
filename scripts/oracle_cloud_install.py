import paramiko
import sys
import os

HOST = "147.15.103.114"
USERS = ["ubuntu", "opc", "root", "hmt"]
PASSWORDS = ["cLdk@ZtgPngjHaPt6Tl", "HVgUmU9Tu@Gdi"]
DOMAIN = "comenta.com.br"
WWW_DOMAIN = "www.comenta.com.br"

def connect_ssh():
    print(f"📡 Tentando conectar via SSH ao servidor Oracle Cloud ({HOST})...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    for username in USERS:
        for password in PASSWORDS:
            print(f"🔑 Tentando usuário '{username}' com senha...")
            try:
                client.connect(hostname=HOST, username=username, password=password, timeout=8)
                print(f"✅ SSH CONECTADO COM SUCESSO! (Usuário: {username})")
                return client, username, password
            except Exception as e:
                print(f"  ❌ {username}@{HOST} -> {e}")

    print("❌ Nenhuma combinação de usuário/senha funcionou.")
    return None, None, None

def run_cmd(client, password, cmd, sudo=False):
    print(f"\n🚀 [Oracle Cloud 147.15.103.114]: {cmd}")
    full_cmd = f"echo '{password}' | sudo -S bash -c \"{cmd}\"" if sudo else cmd
    stdin, stdout, stderr = client.exec_command(full_cmd)

    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")

    if out.strip():
        print(f"📋 STDOUT:\n{out.strip()}")
    if err.strip() and "password for" not in err:
        print(f"⚠️ STDERR:\n{err.strip()}")

    return out, err

def main():
    client, username, password = connect_ssh()
    if not client:
        print("💡 Caso a chave SSH seja necessária ou as portas precisem de liberação na VCN, me avise!")
        sys.exit(1)

    try:
        # 1. Instalar pacotes de sistema na Oracle Cloud
        run_cmd(client, password, "apt-get update -y && apt-get install -y nginx mysql-server ufw certbot python3-certbot-nginx curl wget git unzip build-essential || yum install -y nginx mysql-server certbot python-certbot-nginx curl wget git unzip", sudo=True)

        # 2. Node.js v20 LTS + PM2
        run_cmd(client, password, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", sudo=True)
        run_cmd(client, password, "apt-get install -y nodejs || yum install -y nodejs", sudo=True)
        run_cmd(client, password, "npm install -g pm2 ghost-cli@latest", sudo=True)

        # 3. Preparar diretório da aplicação em /var/www/comenta
        run_cmd(client, password, "mkdir -p /var/www/comenta", sudo=True)
        run_cmd(client, password, f"chown -R {username}:{username} /var/www/comenta", sudo=True)

        # 4. Upload de server.js
        local_server_js = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/server.js"
        sftp = client.open_sftp()
        sftp.put(local_server_js, f"/home/{username}/server.js")
        sftp.close()

        run_cmd(client, password, f"cp /home/{username}/server.js /var/www/comenta/server.js", sudo=True)
        run_cmd(client, password, f"cd /var/www/comenta && pm2 start server.js --name comenta", sudo=True)
        run_cmd(client, password, "pm2 save", sudo=True)

        # 5. Configurar Nginx para comenta.com.br
        nginx_conf = f"""server {{
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name {DOMAIN} {WWW_DOMAIN} {HOST} _;

    client_max_body_size 50M;

    location / {{
        proxy_pass http://127.0.0.1:2368;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}"""
        sftp = client.open_sftp()
        with sftp.open(f"/home/{username}/comenta.conf", "w") as f:
            f.write(nginx_conf)
        sftp.close()

        run_cmd(client, password, f"cp /home/{username}/comenta.conf /etc/nginx/sites-available/{DOMAIN}", sudo=True)
        run_cmd(client, password, f"ln -sf /etc/nginx/sites-available/{DOMAIN} /etc/nginx/sites-enabled/", sudo=True)
        run_cmd(client, password, "rm -f /etc/nginx/sites-enabled/default", sudo=True)
        run_cmd(client, password, "nginx -t && systemctl reload nginx", sudo=True)

        # 6. Certbot SSL
        run_cmd(client, password, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || systemctl reload nginx", sudo=True)

        # 7. Teste de Resposta HTTP
        run_cmd(client, password, "curl -I http://127.0.0.1:80/", sudo=True)

        print("\n" + "="*80)
        print(f"🎉 INSTALAÇÃO E DEPLOY NA ORACLE CLOUD ({HOST}) CONCLUÍDOS COM SUCESSO!")
        print(f"🌐 Website Oficial: http://{DOMAIN} (ou https://{DOMAIN})")
        print(f"🌐 Subdomínio WWW: http://{WWW_DOMAIN}")
        print(f"🌐 Acesso Direto por IP Oracle: http://{HOST}")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro na instalação na Oracle Cloud: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
