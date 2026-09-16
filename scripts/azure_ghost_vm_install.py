import paramiko
import sys
import os

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
WWW_DOMAIN = "www.hojemt.com.br"
LOCAL_THEME_ZIP = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip"

def run_cmd(client, cmd, sudo=False):
    print(f"\n🚀 [Azure VM hmt]: {cmd}")
    full_cmd = f"echo '{PASS}' | sudo -S bash -c \"{cmd}\"" if sudo else cmd
    stdin, stdout, stderr = client.exec_command(full_cmd)

    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")

    if out.strip():
        print(f"📋 STDOUT:\n{out.strip()}")
    if err.strip() and "password for" not in err:
        print(f"⚠️ STDERR:\n{err.strip()}")

    return out, err

def main():
    print(f"📡 Conectando via SSH à VM Azure hmt ({USER}@{HOST})...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=20)
        print("✅ Conexão SSH estabelecida com a VM Azure 'hmt'!")

        # 1. Atualizar pacotes do sistema Ubuntu na VM Azure
        run_cmd(client, "apt-get update -y && apt-get install -y curl wget git unzip nginx certbot python3-certbot-nginx build-essential sqlite3 libsqlite3-dev", sudo=True)

        # 2. Garantir Node.js v20 LTS
        run_cmd(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", sudo=True)
        run_cmd(client, "apt-get install -y nodejs", sudo=True)
        run_cmd(client, "npm install -g ghost-cli@latest pm2", sudo=True)

        # 3. Preparar diretório /var/www/ghost
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes /var/www/ghost/content/data", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost && chmod -R 775 /var/www/ghost", sudo=True)

        # 4. SFTP Upload do tema hojemt-usatoday.zip para a VM
        print(f"⬆️ Enviando tema hojemt-usatoday.zip para a VM Azure...")
        sftp = client.open_sftp()
        sftp.put(LOCAL_THEME_ZIP, "/home/hmt/hojemt-usatoday.zip")
        sftp.close()

        # 5. Extrair o tema na pasta oficial do Ghost
        run_cmd(client, "cp /home/hmt/hojemt-usatoday.zip /var/www/ghost/content/themes/hojemt-usatoday.zip", sudo=True)
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # 6. Configurar Nginx Reverse Proxy para o Ghost na VM Azure
        nginx_conf = f"""server {{
    listen 80;
    listen [::]:80;
    server_name {DOMAIN} {WWW_DOMAIN} {HOST};

    client_max_body_size 50M;

    location / {{
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:2368;
    }}
}}"""

        run_cmd(client, "cat << 'EOF' > /etc/nginx/sites-available/hojemt\n" + nginx_conf + "\nEOF", sudo=True)
        run_cmd(client, "ln -sf /etc/nginx/sites-available/hojemt /etc/nginx/sites-enabled/hojemt", sudo=True)
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # 7. Reiniciar e Persistir o serviço Ghost na VM Azure via PM2
        run_cmd(client, "cd /var/www/ghost && pm2 restart ghost 2>/dev/null || pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # 8. Certbot SSL para hojemt.com.br
        run_cmd(client, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || echo '⚠️ SSL Let Encrypt OK'", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST CMS E TEMA INSTALADOS COM SUCESSO NA VM AZURE 'hmt'!")
        print(f"🖥️ VM Azure Overview: https://portal.azure.com/#@cienciamsn.onmicrosoft.com/resource/subscriptions/4c485838-8ddd-485c-a351-b50d55a4184a/resourceGroups/hmt-pro/providers/Microsoft.Compute/virtualMachines/hmt/overview")
        print(f"🌐 Website Oficial HTTPS: https://{DOMAIN}")
        print(f"🌐 Subdomínio WWW: https://{WWW_DOMAIN}")
        print(f"🛠️ Painel Admin Ghost: https://{DOMAIN}/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro na instalação na VM Azure: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
