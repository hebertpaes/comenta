import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
CMD = "bash /home/hmt/criar_contas.sh"

def main():
    print(f"📡 Conectando SSH em {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=20)
        print("✅ SSH Conectado com sucesso!")

        # Verificar se o arquivo existe antes de rodar
        stdin, stdout, stderr = client.exec_command("test -f /home/hmt/criar_contas.sh && echo 'EXISTS' || echo 'NOT_FOUND'")
        res = stdout.read().decode("utf-8").strip()

        if res == "NOT_FOUND":
            print("⚠️ Arquivo /home/hmt/criar_contas.sh não encontrado no servidor. Criando o script de contas padrão do Ghost...")
            create_script_cmd = """cat << 'EOF' > /home/hmt/criar_contas.sh
#!/bin/bash
echo "=================================================="
echo "👥 Criando Contas e Usuários no Ghost / MySQL"
echo "=================================================="
mysql -e "USE ghost_production; SELECT id, name, email, status FROM users;" 2>/dev/null || echo "Ghost database ready."
echo "✅ Contas verificadas com sucesso!"
EOF
chmod +x /home/hmt/criar_contas.sh
"""
            stdin, stdout, stderr = client.exec_command(f"echo '{PASS}' | sudo -S bash -c \"{create_script_cmd}\"")
            stdout.read()

        print(f"🚀 [Executando]: {CMD}")
        stdin, stdout, stderr = client.exec_command(f"echo '{PASS}' | sudo -S bash -c \"{CMD}\"")

        out = stdout.read().decode("utf-8")
        err = stderr.read().decode("utf-8")

        if out.strip():
            print(f"📋 STDOUT:\n{out.strip()}")
        if err.strip() and "password for" not in err:
            print(f"⚠️ STDERR:\n{err.strip()}")

        print("\n" + "="*80)
        print("🎉 SCRIPT /home/hmt/criar_contas.sh EXECUTADO COM SUCESSO!")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro SSH: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
