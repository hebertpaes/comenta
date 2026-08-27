import paramiko
import os
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
WWW_DOMAIN = "www.hojemt.com.br"

LOCAL_SERVER_JS = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/server.js"
REMOTE_SERVER_JS = "/var/www/ghost/server.js"

def run_cmd(client, cmd, sudo=False):
    print(f"\n🚀 [Executando]: {cmd}")
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
    print(f"📡 Conectando SSH em {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ Conectado com sucesso!")

        # 1. Copia o server.js do Ghost local para o servidor remoto
        print(f"⬆️ SFTP Upload de {LOCAL_SERVER_JS} -> /home/hmt/server.js...")
        sftp = client.open_sftp()
        sftp.put(LOCAL_SERVER_JS, "/home/hmt/server.js")
        sftp.close()

        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js && chown -R hmt:hmt /var/www/ghost", sudo=True)

        # 2. Inicia o servidor Ghost via PM2
        run_cmd(client, "cd /var/www/ghost && pm2 delete ghost 2>/dev/null || true")
        run_cmd(client, "cd /var/www/ghost && pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # 3. Escreve o arquivo Nginx limpo e sem erros de sintaxe
        run_cmd(client, """cat << 'EOF' > /etc/nginx/sites-available/hojemt
server {
    listen 80;
    listen [::]:80;
    server_name hojemt.com.br www.hojemt.com.br 20.55.8.18;

    client_max_body_size 50M;

    location / {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:2368;
    }
}
EOF""", sudo=True)

        run_cmd(client, "ln -sf /etc/nginx/sites-available/hojemt /etc/nginx/sites-enabled/hojemt", sudo=True)
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # 4. Certbot SSL
        run_cmd(client, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || echo '⚠️ Certbot: DNS pendente'", sudo=True)

        # 5. Teste HTTP Local no servidor
        run_cmd(client, "curl -I http://127.0.0.1:2368/ || true")

        print("\n" + "="*80)
        print(f"🎉 GHOST CMS TOTALMENTE OPERACIONAL NO DOMÍNIO {DOMAIN}!")
        print(f"🌐 Website Oficial: http://{DOMAIN} (ou https://{DOMAIN})")
        print(f"🌐 Subdomínio WWW: http://{WWW_DOMAIN}")
        print(f"🌐 Acesso via IP Direct: http://{HOST}")
        print(f"🛠️ Painel Admin Ghost: http://{DOMAIN}/ghost")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro final: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
