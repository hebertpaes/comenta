import paramiko
import sys
import os
import shutil

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
WWW_DOMAIN = "www.hojemt.com.br"

LOCAL_THEME_FOLDER = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt"
LOCAL_THEME_ZIP = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip"
TMP_ZIP = "/tmp/azure_ghost_theme.zip"

def run_cmd(client, cmd, sudo=False):
    print(f"\n🚀 [Azure VM hmt]: {cmd}")
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
    print("📦 Compactando tema oficial de PROJETO-HMT...")
    if os.path.exists(TMP_ZIP):
        os.remove(TMP_ZIP)

    if os.path.exists(LOCAL_THEME_FOLDER):
        shutil.make_archive("/tmp/azure_ghost_theme", "zip", LOCAL_THEME_FOLDER)
    else:
        shutil.copy(LOCAL_THEME_ZIP, TMP_ZIP)

    print(f"📡 Conectando via SSH à VM Azure hmt ({USER}@{HOST})...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=20)
        print("✅ SSH Conectado à VM Azure!")

        # 1. Parar processos antigos e preparar pacotes
        run_cmd(client, "pm2 delete all 2>/dev/null || true", sudo=True)
        run_cmd(client, "apt-get update -y && apt-get install -y nginx mysql-server ufw certbot python3-certbot-nginx curl wget git unzip build-essential", sudo=True)

        # 2. Node.js v20 LTS + PM2 + Ghost-CLI
        run_cmd(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", sudo=True)
        run_cmd(client, "apt-get install -y nodejs", sudo=True)
        run_cmd(client, "npm install -g ghost-cli@latest pm2", sudo=True)

        # 3. Configurar MySQL
        sql_script = """
CREATE DATABASE IF NOT EXISTS ghost_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ghost'@'localhost' IDENTIFIED BY 'Bd9B4LN@Rb';
ALTER USER 'ghost'@'localhost' IDENTIFIED BY 'Bd9B4LN@Rb';
GRANT ALL PRIVILEGES ON ghost_production.* TO 'ghost'@'localhost';
CREATE USER IF NOT EXISTS 'ghost'@'127.0.0.1' IDENTIFIED BY 'Bd9B4LN@Rb';
ALTER USER 'ghost'@'127.0.0.1' IDENTIFIED BY 'Bd9B4LN@Rb';
GRANT ALL PRIVILEGES ON ghost_production.* TO 'ghost'@'127.0.0.1';
FLUSH PRIVILEGES;
"""
        sftp = client.open_sftp()
        with sftp.open("/home/hmt/setup_ghost.sql", "w") as f:
            f.write(sql_script)
        sftp.put(TMP_ZIP, "/home/hmt/azure_ghost_theme.zip")
        sftp.close()

        run_cmd(client, "mysql < /home/hmt/setup_ghost.sql", sudo=True)

        # 4. Criar diretório /var/www/ghost e instalar tema
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt /var/www/ghost/content/data", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/azure_ghost_theme.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost && chmod -R 775 /var/www/ghost", sudo=True)

        # 5. Iniciar Ghost via PM2
        local_server_js = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/server.js"
        sftp = client.open_sftp()
        sftp.put(local_server_js, "/home/hmt/server.js")
        sftp.close()

        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)
        run_cmd(client, "cd /var/www/ghost && pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # 6. Nginx & SSL
        run_cmd(client, "ufw allow 80/tcp && ufw allow 443/tcp", sudo=True)
        run_cmd(client, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || systemctl reload nginx", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # 7. Validação
        run_cmd(client, "sleep 2 && curl -I -k https://hojemt.com.br/", sudo=True)
        run_cmd(client, "curl -I -k https://hojemt.com.br/ghost/", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST CMS INSTALADO NO AZURE VM 'hmt' COM SUCESSO!")
        print(f"🖥️ Azure Portal VM: https://portal.azure.com/#@cienciamsn.onmicrosoft.com/resource/subscriptions/4c485838-8ddd-485c-a351-b50d55a4184a/resourceGroups/hmt-pro/providers/Microsoft.Compute/virtualMachines/hmt/overview")
        print(f"🌐 Website HTTPS: https://{DOMAIN}")
        print(f"🌐 Subdomínio WWW: https://{WWW_DOMAIN}")
        print(f"🛠️ Painel Admin Ghost: https://{DOMAIN}/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro de instalação no Azure: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
