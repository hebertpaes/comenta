import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"

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
    print(f"📡 Conectando ao servidor remoto {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # Garantir que server.js esteja em /var/www/ghost/server.js
        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        # Iniciar PM2 com /var/www/ghost/server.js
        run_cmd(client, "cd /var/www/ghost && pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # Recarregar Nginx
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # Testar resposta local na porta 2368
        run_cmd(client, "curl -I http://127.0.0.1:2368/ghost/", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST ADMIN TOTALMENTE LIBERADO E OPERACIONAL NA URL!")
        print("🌐 Painel Ghost Admin: https://hojemt.com.br/ghost/")
        print("🌐 Site Oficial: https://hojemt.com.br/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
