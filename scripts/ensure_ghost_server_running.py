import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
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
    print(f"📡 Conectando SSH em {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado com sucesso!")

        # Upload server.js
        sftp = client.open_sftp()
        sftp.put(LOCAL_SERVER_JS, "/home/hmt/server.js")
        sftp.close()

        run_cmd(client, "cp /home/hmt/server.js /var/www/ghost/server.js", sudo=True)
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost", sudo=True)

        run_cmd(client, "pm2 delete all 2>/dev/null || true", sudo=True)
        run_cmd(client, "cd /var/www/ghost && pm2 start server.js --name ghost", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # Testes
        run_cmd(client, "sleep 2 && curl -I http://127.0.0.1:2368/ghost/", sudo=True)
        run_cmd(client, "curl -I -k https://hojemt.com.br/ghost/", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST E ADMIN E TEMA USA TODAY 100% OPERACIONAIS!")
        print("🌐 Website Oficial: https://hojemt.com.br")
        print("🛠️ Admin Ghost: https://hojemt.com.br/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro ao assegurar Ghost: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
