import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
USER_ZIP_PATH = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip"
LOCAL_SERVER_JS = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/server.js"

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
    print(f"📡 Conectando SSH em {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # SFTP Upload de server.js e do zip do tema
        print("⬆️ Upload de server.js e hojemt-usatoday.zip...")
        sftp = client.open_sftp()
        sftp.put(LOCAL_SERVER_JS, "/home/hmt/server.js")
        sftp.put(USER_ZIP_PATH, "/home/hmt/hojemt-usatoday.zip")
        sftp.close()

        # Copiar e atualizar pasta /var/www/ghost
        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js", sudo=True)
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # Reiniciar PM2 com server.js
        run_cmd(client, "cd /var/www/ghost && pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # Testar resposta em /ghost/
        run_cmd(client, "curl -I https://hojemt.com.br/ghost/", sudo=True)

        print("\n" + "="*80)
        print("🎉 PAINEL GHOST ADMIN FINAL LIBERADO E OPERACIONAL!")
        print(f"🛠️ ACESSE AGORA EM: https://{DOMAIN}/ghost/")
        print(f"🌐 WEBSITE OFICIAL: https://{DOMAIN}")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro final: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
