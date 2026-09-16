import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"

def run_ssh_command(client, command, use_sudo=False):
    print(f"🚀 Executando no servidor ({HOST}): {command}")
    if use_sudo:
        # Envia senha no sudo caso solicite
        stdin, stdout, stderr = client.exec_command(f"echo '{PASS}' | sudo -S {command}")
    else:
        stdin, stdout, stderr = client.exec_command(command)

    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")

    if out.strip():
        print(f"📋 STDOUT:\n{out}")
    if err.strip() and "password for" not in err:
        print(f"⚠️ STDERR:\n{err}")

    return out, err

def main():
    print(f"📡 Conectando via SSH em {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=10)
        print("✅ Conectado via SSH com sucesso!")

        run_ssh_command(client, "uname -a; lsb_release -a 2>/dev/null || cat /etc/os-release")
        run_ssh_command(client, "node -v || true; npm -v || true; docker -v || true; nginx -v || true")
        run_ssh_command(client, "pwd; whoami; df -h /")

    except Exception as e:
        print(f"❌ Erro de conexão SSH: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
