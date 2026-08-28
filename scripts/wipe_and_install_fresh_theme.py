import paramiko
import sys
import shutil
import os

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"

LOCAL_THEME_FOLDER = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt"
LOCAL_THEME_ZIP = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip"
TMP_ZIP = "/tmp/fresh_hojemt_theme.zip"

def run_cmd(client, cmd, sudo=False):
    print(f"🚀 [Executando no Servidor Remote]: {cmd}")
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
    print("📦 Compactando pasta /Users/hebertpaes/Downloads/PROJETO-HMT/hojemt...")
    if os.path.exists(TMP_ZIP):
        os.remove(TMP_ZIP)

    if os.path.exists(LOCAL_THEME_FOLDER):
        shutil.make_archive("/tmp/fresh_hojemt_theme", "zip", LOCAL_THEME_FOLDER)
    else:
        shutil.copy(LOCAL_THEME_ZIP, TMP_ZIP)
    
    print("✅ Pacote ZIP criado com sucesso!")

    print(f"📡 Conectando ao servidor remoto {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # 1. Apaga tudo na pasta de temas do Ghost no servidor
        print("🧹 Apagando todos os temas antigos em /var/www/ghost/content/themes/...")
        run_cmd(client, "rm -rf /var/www/ghost/content/themes/*", sudo=True)
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)

        # 2. SFTP Upload do novo tema
        print("⬆️ Enviando o novo tema da pasta /Users/hebertpaes/Downloads/PROJETO-HMT via SFTP...")
        sftp = client.open_sftp()
        sftp.put(TMP_ZIP, "/home/hmt/fresh_hojemt_theme.zip")
        sftp.close()

        # 3. Descompactar no diretório do Ghost
        run_cmd(client, "unzip -o /home/hmt/fresh_hojemt_theme.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost && chmod -R 775 /var/www/ghost", sudo=True)

        # 4. Reiniciar Ghost e Nginx
        run_cmd(client, "cd /var/www/ghost && (pm2 restart ghost || pm2 start server.js --name ghost)", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # 5. Teste final
        run_cmd(client, "sleep 2 && curl -I -k https://hojemt.com.br/", sudo=True)

        print("\n" + "="*80)
        print("🎉 TEMA APAGADO E REINSTALADO COM SUCESSO A PARTIR DE PROJETO-HMT!")
        print("🌐 Website Oficial: https://hojemt.com.br")
        print("🛠️ Admin Ghost: https://hojemt.com.br/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro ao reinstalar tema: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
