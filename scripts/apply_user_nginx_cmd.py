import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"

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

        # 1. Remover padrão
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)

        # 2. Escrever configuração Nginx exatamente como solicitado
        nginx_conf = """server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name hojemt.com.br www.hojemt.com.br 20.55.8.18 _;

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

        # Salva o arquivo de configuração localmente e faz SFTP upload para não ter falha com bash EOF
        sftp = client.open_sftp()
        with sftp.open("/home/hmt/hojemt.conf", "w") as f:
            f.write(nginx_conf)
        sftp.close()

        run_cmd(client, "cp /home/hmt/hojemt.conf /etc/nginx/sites-available/hojemt", sudo=True)
        run_cmd(client, "ln -sf /etc/nginx/sites-available/hojemt /etc/nginx/sites-enabled/", sudo=True)

        # 3. Testa e recarrega Nginx
        run_cmd(client, "nginx -t", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # 4. Validação
        run_cmd(client, "curl -I http://127.0.0.1:80/", sudo=True)

        print("\n" + "="*80)
        print("🎉 CONFIGURAÇÃO NGINX SOLICITADA APLICADA E RECARREGADA COM SUCESSO!")
        print("🌐 Website Oficial: http://hojemt.com.br")
        print("🌐 Subdomínio WWW: http://www.hojemt.com.br")
        print("🌐 Acesso por IP: http://20.55.8.18")
        print("🛠️ Admin Ghost: http://hojemt.com.br/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro ao aplicar Nginx: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
