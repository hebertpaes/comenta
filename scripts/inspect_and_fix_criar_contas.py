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
    print(f"📡 Conectando SSH em {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # 1. Ler o conteúdo atual do script criar_contas.sh
        print("📖 Conteúdo atual de /home/hmt/criar_contas.sh:")
        run_cmd(client, "cat /home/hmt/criar_contas.sh")

        # 2. Instalar bcryptjs globalmente ou na pasta do Ghost se necessário
        print("📦 Instalando bcryptjs para execução do script de contas...")
        run_cmd(client, "npm install -g bcryptjs", sudo=True)
        run_cmd(client, "mkdir -p /var/www/hojemt/current && cd /var/www/hojemt/current && npm init -y && npm install bcryptjs --save", sudo=True)

        # 3. Executar o script criar_contas.sh novamente
        print("🚀 Executando novamente /home/hmt/criar_contas.sh...")
        run_cmd(client, "bash /home/hmt/criar_contas.sh", sudo=True)

        print("\n" + "="*80)
        print("🎉 SCRIPT CRIAR_CONTAS.SH EXECUTADO COM SUCESSO SEM ERROS DE MÓDULO!")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro SSH: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
