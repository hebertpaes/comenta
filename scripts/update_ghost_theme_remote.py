import paramiko
import os
import sys
import zipfile

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"

LOCAL_THEME_DIR = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/content/themes/hojemt"
ZIP_OUT_PATH = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/hojemt-usatoday.zip"
LOCAL_SERVER_JS = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/server.js"

def create_theme_zip():
    print(f"📦 Empacotando tema hojemt-usatoday.zip...")
    with zipfile.ZipFile(ZIP_OUT_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(LOCAL_THEME_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, LOCAL_THEME_DIR)
                zipf.write(file_path, arcname)
    print(f"✓ hojemt-usatoday.zip gerado com sucesso ({os.path.getsize(ZIP_OUT_PATH)} bytes)")

def run_cmd(client, cmd, sudo=False):
    print(f"🚀 [Executando]: {cmd}")
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
    create_theme_zip()

    print(f"📡 Conectando SSH no servidor {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ Conectado ao servidor remoto!")

        # SFTP Upload do ZIP do tema e do server.js
        sftp = client.open_sftp()
        sftp.put(ZIP_OUT_PATH, "/home/hmt/hojemt-usatoday.zip")
        sftp.put(LOCAL_SERVER_JS, "/home/hmt/server.js")
        sftp.close()
        print("✓ Uploads dos arquivos concluídos com sucesso!")

        # Copiar server.js e descompactar tema
        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js", sudo=True)
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # Reiniciar processo Ghost com PM2
        run_cmd(client, "pm2 restart ghost || (cd /var/www/ghost && pm2 start server.js --name ghost)", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        print("\n" + "="*80)
        print(f"🎉 TEMA HOJEMT-USATODAY.ZIP ATUALIZADO NO SERVIDOR {HOST}!")
        print(f"🌐 Website Oficial HTTPS: https://{DOMAIN}")
        print(f"🌐 Subdomínio WWW: https://www.hojemt.com.br")
        print(f"🛠️ Painel Admin Ghost: https://{DOMAIN}/ghost")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro na atualização do tema: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
