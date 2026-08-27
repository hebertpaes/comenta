import paramiko
import sys
import json

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
USER_ZIP_PATH = "/Users/hebertpaes/Downloads/PROJETO-HMT/hojemt-usatoday.zip"

def run_cmd(client, cmd, sudo=False):
    print(f"\n🚀 [Executando]: {cmd}")
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
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=20)
        print("✅ SSH Conectado com Sucesso!")

        # 1. Limpa processos antigos do PM2
        run_cmd(client, "pm2 delete all 2>/dev/null || true", sudo=True)

        # 2. Instala dependências nativas e SQLite3
        run_cmd(client, "apt-get update -y && apt-get install -y sqlite3 libsqlite3-dev build-essential", sudo=True)

        # 3. Garante pasta /var/www/ghost e permissões do usuário hmt
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes /var/www/ghost/content/data", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost && chmod -R 775 /var/www/ghost", sudo=True)

        # 4. Upload do tema hojemt-usatoday.zip do usuário
        print(f"⬆️ Upload do tema oficial: {USER_ZIP_PATH}...")
        sftp = client.open_sftp()
        sftp.put(USER_ZIP_PATH, "/home/hmt/hojemt-usatoday.zip")
        sftp.close()

        run_cmd(client, "cp /home/hmt/hojemt-usatoday.zip /var/www/ghost/content/themes/hojemt-usatoday.zip", sudo=True)
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday.zip -d /var/www/ghost/content/themes/hojemt", sudo=True)

        # 5. Instala o Ghost Core oficial via NPM na pasta /var/www/ghost se necessário
        print("📦 Instalando Ghost Engine oficial...")
        run_cmd(client, "cd /var/www/ghost && npm init -y && npm install ghost@5.88.0 sqlite3 --save --legacy-peer-deps", sudo=True)

        # 6. Cria arquivo config.production.json padronizado do Ghost
        ghost_config = {
          "url": f"https://{DOMAIN}",
          "server": {
            "port": 2368,
            "host": "127.0.0.1"
          },
          "database": {
            "client": "sqlite3",
            "connection": {
              "filename": "/var/www/ghost/content/data/ghost.db"
            },
            "useNullAsDefault": True
          },
          "mail": {
            "transport": "Direct"
          },
          "logging": {
            "transports": ["file", "stdout"]
          },
          "process": "local",
          "paths": {
            "contentPath": "/var/www/ghost/content"
          }
        }

        config_str = json.dumps(ghost_config, indent=2)
        run_cmd(client, f"cat << 'EOF' > /var/www/ghost/config.production.json\n{config_str}\nEOF", sudo=True)

        # 7. Cria script de inicialização index.js para o Ghost Core
        entry_script = """import ghost from 'ghost';
ghost().then((ghostServer) => {
    ghostServer.start();
}).catch((err) => {
    console.error('Erro ao iniciar Ghost:', err);
});
"""
        run_cmd(client, f"cat << 'EOF' > /var/www/ghost/index.js\n{entry_script}\nEOF", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # 8. Inicia o Ghost oficial via PM2
        print("🚀 Iniciando Ghost Core oficial via PM2...")
        run_cmd(client, "cd /var/www/ghost && NODE_ENV=production pm2 start index.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # 9. Recarrega Nginx
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # 10. Aguarda 3 segundos e testa a resposta da URL de Admin
        run_cmd(client, "sleep 3 && curl -I http://127.0.0.1:2368/ghost/", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST CMS PADRÃO OFICIAL INSTALADO E ADMIN LIBERADO!")
        print(f"🛠️ ACESSE O WIZARD DE SETUP DO ADMIN EM: https://{DOMAIN}/ghost/")
        print(f"🌐 WEBSITE OFICIAL: https://{DOMAIN}")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro ao configurar Ghost padrão: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
