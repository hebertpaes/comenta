import paramiko
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
    print(f"📡 Conectando ao servidor SSH {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ Conectado com sucesso!")

        # SFTP Upload de /Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip
        print(f"⬆️ SFTP Upload: {USER_ZIP_PATH} -> /home/hmt/hojemt-usatoday-user.zip...")
        sftp = client.open_sftp()
        sftp.put(USER_ZIP_PATH, "/home/hmt/hojemt-usatoday-user.zip")
        sftp.close()

        # Extrair tema no Ghost remoto
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday-user.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # Reiniciar PM2
        run_cmd(client, "pm2 restart ghost || (cd /var/www/ghost && pm2 start server.js --name ghost)", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # Recarregar Nginx
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        print("\n" + "="*80)
        print(f"🎉 TEMA /Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip APLICADO COM SUCESSO!")
        print(f"🌐 Website Oficial HTTPS: https://{DOMAIN}")
        print(f"🌐 Subdomínio WWW: https://www.hojemt.com.br")
        print(f"🛠️ Painel Admin Ghost: https://{DOMAIN}/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
