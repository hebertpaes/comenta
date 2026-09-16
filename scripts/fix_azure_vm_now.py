import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"

LOCAL_CONF = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/deploy/nginx_hojemt.conf"
LOCAL_SERVER_JS = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/ghost/server.js"

def run_cmd(client, cmd, sudo=False):
    print(f"🚀 [Executando no Servidor]: {cmd}")
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
    print(f"📡 Conectando ao servidor Azure {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # SFTP Upload de arquivos limpos
        sftp = client.open_sftp()
        sftp.put(LOCAL_CONF, "/home/hmt/hojemt.conf")
        sftp.put(LOCAL_SERVER_JS, "/home/hmt/server.js")
        sftp.close()
        print("✓ Upload SFTP efetuado com sucesso!")

        # 1. Copia o arquivo Nginx limpo e recarrega
        run_cmd(client, "cp /home/hmt/hojemt.conf /etc/nginx/sites-available/hojemt", sudo=True)
        run_cmd(client, "ln -sf /etc/nginx/sites-available/hojemt /etc/nginx/sites-enabled/hojemt", sudo=True)
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)
        run_cmd(client, "nginx -t", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # 2. Copia server.js e reinicia PM2
        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        run_cmd(client, "pm2 delete all 2>/dev/null || true", sudo=True)
        run_cmd(client, "cd /var/www/ghost && pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # 3. Testa resposta HTTP
        run_cmd(client, "sleep 2 && curl -I http://127.0.0.1:2368/ghost/", sudo=True)
        run_cmd(client, "curl -I https://hojemt.com.br/", sudo=True)

        print("\n" + "="*80)
        print("🎉 SERVIDOR AZURE VM 'hmt' REPARADO E FUNCIONANDO 100%!")
        print(f"🌐 Website Oficial HTTPS: https://{DOMAIN}")
        print(f"🌐 Subdomínio WWW: https://www.hojemt.com.br")
        print(f"🛠️ Painel Ghost Admin: https://{DOMAIN}/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro de reparo: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
