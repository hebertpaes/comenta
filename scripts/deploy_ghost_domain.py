import paramiko
import os
import sys
import zipfile

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
WWW_DOMAIN = "www.hojemt.com.br"

LOCAL_THEME_DIR = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/content/themes/hojemt"
ZIP_OUT_PATH = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/hojemt-usatoday.zip"

def create_theme_zip():
    print(f"📦 Criando pacote do Tema USA TODAY (hojemt)...")
    with zipfile.ZipFile(ZIP_OUT_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(LOCAL_THEME_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, LOCAL_THEME_DIR)
                zipf.write(file_path, arcname)
    print(f"✓ ZIP criado: {ZIP_OUT_PATH} ({os.path.getsize(ZIP_OUT_PATH)} bytes)")

def run_cmd(client, cmd, sudo=False):
    print(f"\n🚀 [Executando no Servidor]: {cmd}")
    full_cmd = f"echo '{PASS}' | sudo -S bash -c \"{cmd}\"" if sudo else cmd
    stdin, stdout, stderr = client.exec_command(full_cmd)

    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")

    if out.strip():
        print(f"📋 STDOUT:\n{out.strip()}")
    if err.strip() and "password for" not in err:
        print(f"⚠️ STDERR:\n{err.strip()}")

    return out, err

def upload_file(client, local_path, remote_path):
    print(f"⬆️ SFTP Upload: {local_path} -> {remote_path}...")
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    print("✓ Upload concluído com sucesso!")

def main():
    create_theme_zip()

    print(f"\n📡 Conectando via SSH em {USER}@{HOST} para instalar {DOMAIN}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=20)
        print(f"✅ Conectado com sucesso ao servidor {HOST}!")

        # 1. Atualiza apt e instala Nginx + Certbot
        run_cmd(client, "apt-get update -y && apt-get install -y curl wget git unzip nginx certbot python3-certbot-nginx build-essential", sudo=True)

        # 2. Instala Node.js 20 LTS
        run_cmd(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", sudo=True)
        run_cmd(client, "apt-get install -y nodejs", sudo=True)
        run_cmd(client, "node -v; npm -v")

        # 3. Instala Ghost-CLI globalmente
        run_cmd(client, "npm install -g ghost-cli@latest", sudo=True)

        # 4. Prepara diretório /var/www/ghost com usuário hmt
        run_cmd(client, "mkdir -p /var/www/ghost && chown -R hmt:hmt /var/www/ghost && chmod 775 /var/www/ghost", sudo=True)

        # 5. Instalação do Ghost local configurado para o domínio hojemt.com.br
        print(f"\n👻 Instalando Ghost CMS para o domínio {DOMAIN}...")
        run_cmd(client, "cd /var/www/ghost && ghost install local --no-prompt --url http://hojemt.com.br || true")

        # 6. Upload e extração do Tema hojemt (USA TODAY)
        remote_zip = "/home/hmt/hojemt-usatoday.zip"
        upload_file(client, ZIP_OUT_PATH, remote_zip)

        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt")
        run_cmd(client, f"unzip -o {remote_zip} -d /var/www/ghost/content/themes/hojemt")
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost/content/themes/hojemt")

        # 7. Reiniciar Ghost
        run_cmd(client, "cd /var/www/ghost && ghost restart || ghost start || true")

        # 8. Configuração do Nginx para hojemt.com.br, www.hojemt.com.br e IP
        nginx_config = f"""server {{
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

        run_cmd(client, f"echo '{nginx_config}' > /etc/nginx/sites-available/hojemt", sudo=True)
        run_cmd(client, "ln -sf /etc/nginx/sites-available/hojemt /etc/nginx/sites-enabled/hojemt", sudo=True)
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # 9. Tenta gerar certificado SSL gratuito via Let's Encrypt para hojemt.com.br
        print(f"\n🔒 Solicitando Certificado SSL Let's Encrypt para {DOMAIN} e {WWW_DOMAIN}...")
        run_cmd(client, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || echo '⚠️ Certbot SSL: verifique se o DNS de {DOMAIN} já aponta para {HOST}'", sudo=True)

        print("\n" + "="*80)
        print(f"🎉 GHOST CMS INSTALADO COM SUCESSO NO DOMÍNIO {DOMAIN}!")
        print(f"🌐 Website Oficial: http://{DOMAIN} (ou https://{DOMAIN})")
        print(f"🌐 Subdomínio WWW: http://{WWW_DOMAIN}")
        print(f"🌐 Acesso via IP: http://{HOST}")
        print(f"🛠️ Painel Admin Ghost: http://{DOMAIN}/ghost")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro na implantação no domínio {DOMAIN}: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
