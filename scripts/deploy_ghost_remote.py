import paramiko
import os
import sys
import zipfile

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"

LOCAL_THEME_DIR = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/content/themes/hojemt"
ZIP_OUT_PATH = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/hojemt-usatoday.zip"

def create_theme_zip():
    print(f"📦 Criando arquivo ZIP do Tema USA TODAY (hojemt)...")
    with zipfile.ZipFile(ZIP_OUT_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(LOCAL_THEME_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, LOCAL_THEME_DIR)
                zipf.write(file_path, arcname)
    print(f"✓ ZIP criado em: {ZIP_OUT_PATH} ({os.path.getsize(ZIP_OUT_PATH)} bytes)")

def run_cmd(client, cmd, sudo=False):
    print(f"\n🚀 [Executando]: {cmd}")
    full_cmd = f"echo '{PASS}' | sudo -S bash -c \"{cmd}\"" if sudo else cmd
    stdin, stdout, stderr = client.exec_command(full_cmd)

    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")

    if out.strip():
        print(f"📋 Out:\n{out.strip()}")
    if err.strip() and "password for" not in err:
        print(f"⚠️ Err:\n{err.strip()}")

    return out, err

def upload_file(client, local_path, remote_path):
    print(f"⬆️ Enviando arquivo {local_path} -> {remote_path} via SFTP...")
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    print("✓ Upload concluído!")

def main():
    create_theme_zip()

    print(f"\n📡 Conectando ao servidor remoto {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ Conexão SSH estabelecida!")

        # 1. Atualiza repositórios e instala utilitários básicos
        run_cmd(client, "apt-get update -y && apt-get install -y curl wget git unzip nginx build-essential", sudo=True)

        # 2. Instala Node.js v20 LTS
        run_cmd(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", sudo=True)
        run_cmd(client, "apt-get install -y nodejs", sudo=True)
        run_cmd(client, "node -v; npm -v")

        # 3. Instala Ghost-CLI globalmente
        run_cmd(client, "npm install -g ghost-cli@latest", sudo=True)

        # 4. Prepara pasta /var/www/ghost com permissões para o usuário hmt
        run_cmd(client, "mkdir -p /var/www/ghost && chown -R hmt:hmt /var/www/ghost && chmod 775 /var/www/ghost", sudo=True)

        # 5. Instala o Ghost CMS na pasta /var/www/ghost
        print("\n👻 Instalando Ghost CMS no servidor...")
        run_cmd(client, "cd /var/www/ghost && ghost install local --no-prompt")

        # 6. Upload do Tema hojemt no estilo USA TODAY
        remote_zip = "/home/hmt/hojemt-usatoday.zip"
        upload_file(client, ZIP_OUT_PATH, remote_zip)

        # 7. Descompacta o tema na pasta de temas do Ghost
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt")
        run_cmd(client, f"unzip -o {remote_zip} -d /var/www/ghost/content/themes/hojemt")
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost/content/themes/hojemt")

        # 8. Reinicia o Ghost para aplicar as alterações
        run_cmd(client, "cd /var/www/ghost && ghost restart || ghost start")

        # 9. Configura Nginx Reverse Proxy para o Ghost (Porta 80 -> 2368)
        nginx_conf = """server {
    listen 80;
    server_name 20.55.8.18;

    location / {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:2368;
    }
}"""

        run_cmd(client, f"echo '{nginx_conf}' > /etc/nginx/sites-available/ghost", sudo=True)
        run_cmd(client, "ln -sf /etc/nginx/sites-available/ghost /etc/nginx/sites-enabled/ghost", sudo=True)
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST CMS INSTALADO E CONFIGURADO COM SUCESSO NO SERVIDOR!")
        print(f"🌐 Site Ghost (Estilo USA TODAY): http://{HOST}")
        print(f"🌐 Porta Direta Ghost: http://{HOST}:2368")
        print(f"🛠️ Painel Admin Ghost: http://{HOST}/ghost")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro durante a instalação do Ghost no servidor: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
