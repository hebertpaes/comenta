import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"

def run_cmd(client, cmd, sudo=False):
    print(f"🚀 [Executando na VM Azure]: {cmd}")
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
    print(f"📡 Conectando via SSH em {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ Conectado via SSH na VM Azure 'hmt'!")

        run_cmd(client, "whoami; hostname; uptime")
        run_cmd(client, "pm2 list", sudo=True)
        run_cmd(client, "systemctl status nginx --no-pager", sudo=True)
        run_cmd(client, "ls -la /var/www/ghost/content/themes/hojemt", sudo=True)
        run_cmd(client, "curl -I https://hojemt.com.br/")

    except Exception as e:
        print(f"❌ Erro SSH: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
