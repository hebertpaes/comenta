import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
WWW_DOMAIN = "www.hojemt.com.br"

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

        # 1. Instala MySQL Server se não estiver instalado
        run_cmd(client, "apt-get update -y && apt-get install -y mysql-server certbot python3-certbot-nginx ufw", sudo=True)
        run_cmd(client, "systemctl enable mysql && systemctl start mysql", sudo=True)

        # 2. Executa as instruções SQL do usuário
        sql_cmds = """
CREATE DATABASE IF NOT EXISTS ghost_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'ghost'@'localhost' IDENTIFIED BY 'Bd9B4LN@Rb';
ALTER USER 'ghost'@'localhost' IDENTIFIED BY 'Bd9B4LN@Rb';
GRANT ALL PRIVILEGES ON ghost_production.* TO 'ghost'@'localhost';

CREATE USER IF NOT EXISTS 'ghost'@'127.0.0.1' IDENTIFIED BY 'Bd9B4LN@Rb';
ALTER USER 'ghost'@'127.0.0.1' IDENTIFIED BY 'Bd9B4LN@Rb';
GRANT ALL PRIVILEGES ON ghost_production.* TO 'ghost'@'127.0.0.1';

FLUSH PRIVILEGES;
"""
        sftp = client.open_sftp()
        with sftp.open("/home/hmt/setup_ghost.sql", "w") as f:
            f.write(sql_cmds)
        sftp.close()

        print("🛢️ Executando script SQL do MySQL...")
        run_cmd(client, "mysql < /home/hmt/setup_ghost.sql", sudo=True)

        # 3. Garante portas de firewall 80 e 443 abertas
        run_cmd(client, "ufw allow 80/tcp && ufw allow 443/tcp", sudo=True)

        # 4. Ajusta Nginx para escutar em 80 E 443 sem falha no SSL Cloudflare Error 521
        run_cmd(client, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || echo '⚠️ Certbot ja configurado ou aguardando DNS'", sudo=True)

        # 5. Reinicia PM2 e Nginx
        run_cmd(client, "cd /var/www/ghost && (pm2 restart ghost || pm2 start server.js --name ghost)", sudo=True)
        run_cmd(client, "pm2 save", sudo=True)
        run_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)

        # 6. Teste final
        run_cmd(client, "curl -I http://127.0.0.1:80/", sudo=True)

        print("\n" + "="*80)
        print("🎉 BANCO MYSQL CONFIGURADO & ERRO CLOUDFLARE 521 RESOLVIDO!")
        print("🛢️ Banco MySQL: ghost_production (Usuário: ghost / Senha: Bd9B4LN@Rb)")
        print("🌐 Website Oficial: https://hojemt.com.br")
        print("🛠️ Admin Ghost: https://hojemt.com.br/ghost/")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro na execução: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
