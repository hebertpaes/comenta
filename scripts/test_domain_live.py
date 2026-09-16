import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"

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

        run_cmd(client, "curl -I -k https://hojemt.com.br/")
        run_cmd(client, "curl -I -k https://hojemt.com.br/ghost/")

    except Exception as e:
        print(f"❌ Erro de teste: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
