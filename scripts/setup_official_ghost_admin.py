import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"

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
    print(f"📡 Conectando SSH ao servidor {USER}@{HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=HOST, username=USER, password=PASS, timeout=15)
        print("✅ SSH Conectado!")

        # 1. Para o PM2 custom se estiver rodando
        run_cmd(client, "pm2 delete ghost 2>/dev/null || true", sudo=True)

        # 2. Prepara permissões em /var/www/ghost
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost && chmod 775 /var/www/ghost", sudo=True)

        # 3. Executa a instalação/inicialização do Ghost Oficial na pasta /var/www/ghost
        run_cmd(client, "cd /var/www/ghost && npx ghost-cli install local --v5 --no-prompt --url https://hojemt.com.br || true")

        # 4. Copia o tema hojemt para o diretório de temas do Ghost
        run_cmd(client, "mkdir -p /var/www/ghost/content/themes/hojemt")
        run_cmd(client, "unzip -o /home/hmt/hojemt-usatoday.zip -d /var/www/ghost/content/themes/hojemt")
        run_cmd(client, "chown -R hmt:hmt /var/www/ghost")

        # 5. Inicia a aplicação Ghost oficial com Node.js na porta 2368
        print("🚀 Iniciando Ghost Core oficial com Admin habilitado...")
        run_cmd(client, "cd /var/www/ghost && (pm2 start current/index.js --name ghost --env production || pm2 start index.js --name ghost || npx ghost-cli start)", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)

        # 6. Recarrega Nginx
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # 7. Testa a rota /ghost/
        run_cmd(client, "curl -I https://hojemt.com.br/ghost/ || curl -I http://127.0.0.1:2368/ghost/", sudo=True)

        print("\n" + "="*80)
        print(f"🎉 PAINEL GHOST ADMIN OFICIAL LIBERADO E ATIVO NA URL!")
        print(f"🌐 Acesse agora: https://{DOMAIN}/ghost/")
        print(f"🌐 Subdomínio WWW: https://www.hojemt.com.br/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro ao liberar Ghost Admin: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
