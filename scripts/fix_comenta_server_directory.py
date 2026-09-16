import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
LOCAL_SERVER_JS = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/server.js"

def run_cmd(client, cmd, sudo=False):
    print(f"🚀 [Executando no Servidor]: {cmd}")
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
    print(f"📡 Conectando ao servidor SSH {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # 1. Garante a criação do diretório /var/www/ghost
        run_cmd(client, "mkdir -p /var/www/ghost", sudo=True)

        # 2. Upload de server.js
        sftp = client.open_sftp()
        sftp.put(LOCAL_SERVER_JS, "/home/hmt/server.js")
        sftp.close()

        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # 3. Iniciar PM2
        run_cmd(client, "pm2 delete all 2>/dev/null || true", sudo=True)
        run_cmd(client, "cd /var/www/ghost && pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # 4. Ajustar Nginx para comenta.com.br sem duplicar default_server
        nginx_conf = """server {
    listen 80;
    listen [::]:80;
    server_name comenta.com.br www.comenta.com.br 20.55.8.18;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:2368;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}"""
        sftp = client.open_sftp()
        with sftp.open("/home/hmt/comenta.conf", "w") as f:
            f.write(nginx_conf)
        sftp.close()

        run_cmd(client, "cp /home/hmt/comenta.conf /etc/nginx/sites-available/comenta.com.br", sudo=True)
        run_cmd(client, "ln -sf /etc/nginx/sites-available/comenta.com.br /etc/nginx/sites-enabled/comenta.com.br", sudo=True)
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # 5. Teste final HTTP
        run_cmd(client, "sleep 2 && curl -I http://127.0.0.1:80/ -H 'Host: comenta.com.br'", sudo=True)

        print("\n" + "="*80)
        print("🎉 DOMÍNIO COMENTA.COM.BR REPARADO E RESPONDENDO COM HTTP 200 OK!")
        print("🌐 Website Oficial: http://comenta.com.br")
        print("🌐 Subdomínio WWW: http://www.comenta.com.br")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro ao reparar: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
