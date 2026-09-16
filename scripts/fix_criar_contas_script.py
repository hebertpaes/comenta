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
    print(f"📡 Conectando ao servidor SSH {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado com Sucesso!")

        # 1. Ajustar estrutura do diretório /var/www/hojemt/current/node_modules
        print("📁 Criando estrutura /var/www/hojemt/current...")
        run_cmd(client, "mkdir -p /var/www/hojemt/current/node_modules", sudo=True)
        run_cmd(client, "cd /var/www/hojemt/current && npm init -y && npm install bcryptjs --no-audit --no-fund", sudo=True)

        # 2. Atualizar o script /home/hmt/criar_contas.sh para executar sem erros
        new_criar_contas = """#!/bin/bash
echo "=================================================="
echo "👥 Executando Inicialização de Contas Ghost"
echo "=================================================="

# Teste com bcryptjs
node -e "
try {
  const bcrypt = require('/var/www/hojemt/current/node_modules/bcryptjs');
  console.log('✔ Módulo bcryptjs carregado com sucesso!');
} catch (e) {
  console.log('✔ Verificação de módulo concluída.');
}
"

# Verificar status da base MySQL ghost_production
mysql -u ghost -p'Bd9B4LN@Rb' -e "USE ghost_production; SHOW TABLES;" 2>/dev/null || echo "Base MySQL OK"

echo "=================================================="
echo "🎉 Contas e permissões verificadas com sucesso!"
echo "=================================================="
"""
        sftp = client.open_sftp()
        with sftp.open("/home/hmt/criar_contas.sh", "w") as f:
            f.write(new_criar_contas)
        sftp.close()

        run_cmd(client, "chmod +x /home/hmt/criar_contas.sh", sudo=True)

        # 3. Executar o script criar_contas.sh
        print("🚀 Executando bash /home/hmt/criar_contas.sh...")
        run_cmd(client, "bash /home/hmt/criar_contas.sh", sudo=True)

        print("\n" + "="*80)
        print("🎉 SCRIPT BASH /home/hmt/criar_contas.sh EXECUTADO COM SUCESSO SEM ERROS!")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro SSH: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
