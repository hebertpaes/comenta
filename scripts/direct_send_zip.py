import paramiko
import os
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
USER_ZIP_PATH = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip"

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

        # 1. SFTP Upload para /home/hmt/hojemt-usatoday.zip
        print(f"⬆️ SFTP Upload de {USER_ZIP_PATH} -> /home/hmt/hojemt-usatoday.zip...")
        sftp = client.open_sftp()
        sftp.put(USER_ZIP_PATH, "/home/hmt/hojemt-usatoday.zip")
        sftp.close()

        # 2. Copia o zip para a pasta de temas do Ghost /var/www/ghost/content/themes/
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes", sudo=True)
        run_cmd(client, "cp /home/hmt/hojemt-usatoday.zip /var/www/ghost/content/themes/hojemt-usatoday.zip", sudo=True)
        
        # 3. Descompacta o tema em /var/www/ghost/content/themes/hojemt
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # 4. Reinicia o PM2 e o Nginx
        run_cmd(client, "pm2 restart ghost || (cd /var/www/ghost && pm2 start server.js --name ghost)", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # 5. Validação HTTP
        run_cmd(client, "curl -I https://hojemt.com.br/", sudo=True)

        print("\n" + "="*80)
        print(f"🎉 ARQUIVO {USER_ZIP_PATH} ENVIADO E APLICADO NO SERVIDOR!")
        print(f"📂 Salvo em: /var/www/ghost/content/themes/hojemt-usatoday.zip")
        print(f"🌐 Website HTTPS: https://{DOMAIN}")
        print(f"🛠️ Ghost Admin: https://{DOMAIN}/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro no envio: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
