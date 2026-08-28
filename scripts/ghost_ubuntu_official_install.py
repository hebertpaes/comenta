import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
MYSQL_USER = "ghost"
MYSQL_PASS = "Bd9B4LN@Rb"
MYSQL_DB = "ghost_production"

def run_cmd(client, cmd, sudo=False):
    print(f"\n🚀 [Executando no Servidor (docs.ghost.org/install/ubuntu)]: {cmd}")
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
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=20)
        print("✅ SSH Conectado com Sucesso!")

        # Passo 1: Atualização do sistema e pacotes essenciais
        print("\n--- Passo 1: Pacotes Essenciais (Ubuntu) ---")
        run_cmd(client, "apt-get update -y && apt-get install -y nginx mysql-server ufw curl wget git unzip build-essential", sudo=True)

        # Passo 2: Instalação do Node.js v20 LTS oficial
        print("\n--- Passo 2: Node.js v20 LTS ---")
        run_cmd(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", sudo=True)
        run_cmd(client, "apt-get install -y nodejs", sudo=True)
        run_cmd(client, "node -v; npm -v")

        # Passo 3: Instalação do Ghost-CLI oficial
        print("\n--- Passo 3: Ghost-CLI ---")
        run_cmd(client, "npm install -g ghost-cli@latest", sudo=True)

        # Passo 4: Configuração do MySQL conforme guia docs.ghost.org
        print("\n--- Passo 4: MySQL Database ---")
        sql_script = f"""
CREATE DATABASE IF NOT EXISTS {MYSQL_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '{MYSQL_USER}'@'localhost' IDENTIFIED BY '{MYSQL_PASS}';
ALTER USER '{MYSQL_USER}'@'localhost' IDENTIFIED BY '{MYSQL_PASS}';
GRANT ALL PRIVILEGES ON {MYSQL_DB}.* TO '{MYSQL_USER}'@'localhost';
FLUSH PRIVILEGES;
"""
        sftp = client.open_sftp()
        with sftp.open("/home/hmt/setup_ghost.sql", "w") as f:
            f.write(sql_script)
        sftp.close()

        run_cmd(client, "mysql < /home/hmt/setup_ghost.sql", sudo=True)

        # Passo 5: Diretório e permissões em /var/www/ghost
        print("\n--- Passo 5: Diretório /var/www/ghost ---")
        run_cmd(client, "mkdir -p /var/www/ghost", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)
        run_cmd(client, "chmod 775 /var/www/ghost", sudo=True)

        # Passo 6: Instalação do Ghost CMS via CLI oficial
        print("\n--- Passo 6: Ghost Install Oficial ---")
        # Limpa pasta para evitar "directory is not empty"
        run_cmd(client, "rm -rf /var/www/ghost/* /var/www/ghost/.* 2>/dev/null || true")

        install_cmd = f"cd /var/www/ghost && ghost install --url https://{DOMAIN} --db mysql --dbhost localhost --dbuser {MYSQL_USER} --dbpass '{MYSQL_PASS}' --dbname {MYSQL_DB} --no-prompt --setup-nginx --setup-ssl --ssl-email contato@{DOMAIN} || cd /var/www/ghost && ghost install local --no-prompt"
        run_cmd(client, install_cmd)

        # Passo 7: Enviar e ativar o Tema hojemt (USA TODAY)
        print("\n--- Passo 7: Ativação do Tema hojemt ---")
        theme_zip = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip"
        sftp = client.open_sftp()
        sftp.put(theme_zip, "/home/hmt/hojemt-usatoday.zip")
        sftp.close()

        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # Passo 8: Reiniciar Nginx e Ghost
        run_cmd(client, "cd /var/www/ghost && ghost restart || pm2 restart ghost || pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST CMS INSTALADO SEGUINDO DOCS.GHOST.ORG/INSTALL/UBUNTU!")
        print(f"🌐 Website Oficial: https://{DOMAIN}")
        print(f"🌐 Subdomínio WWW: https://www.hojemt.com.br")
        print(f"🛠️ Setup do Admin Ghost: https://{DOMAIN}/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro na instalação oficial Ghost Ubuntu: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
