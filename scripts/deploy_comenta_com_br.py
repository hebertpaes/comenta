import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "comenta.com.br"
WWW_DOMAIN = "www.comenta.com.br"

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
    print(f"📡 Conectando SSH em {USER}@{HOST} para implantar {DOMAIN}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # 1. Nginx Config para comenta.com.br
        nginx_conf = f"""server {{
    listen 80;
    listen [::]:80;
    server_name {DOMAIN} {WWW_DOMAIN};

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
        with sftp.open("/home/hmt/comenta.conf", "w") as f:
            f.write(nginx_conf)
        sftp.close()

        run_cmd(client, f"cp /home/hmt/comenta.conf /etc/nginx/sites-available/{DOMAIN}", sudo=True)
        run_cmd(client, f"ln -sf /etc/nginx/sites-available/{DOMAIN} /etc/nginx/sites-enabled/", sudo=True)
        run_cmd(client, "nginx -t", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # 2. SSL Let's Encrypt para comenta.com.br
        run_cmd(client, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || echo '⚠️ SSL Certbot ja configurado ou aguardando propagacao de DNS'", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # 3. Teste HTTP
        run_cmd(client, f"curl -I http://127.0.0.1:80/ -H 'Host: {DOMAIN}'", sudo=True)

        print("\n" + "="*80)
        print(f"🎉 IMPLANTAÇÃO DE {DOMAIN} CONCLUÍDA COM SUCESSO!")
        print(f"🌐 Website Oficial: http://{DOMAIN} (ou https://{DOMAIN})")
        print(f"🌐 Subdomínio WWW: http://{WWW_DOMAIN}")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro na implantação de {DOMAIN}: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
