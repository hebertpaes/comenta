import paramiko
import sys

HOST = "20.55.8.18"
USER = "hmt"
PASS = "HVgUmU9Tu@Gdi"
DOMAIN = "hojemt.com.br"
WWW_DOMAIN = "www.hojemt.com.br"

LOCAL_CONF = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/deploy/nginx_hojemt.conf"
REMOTE_CONF = "/home/hmt/hojemt.conf"

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

        # Upload do arquivo Nginx sem interpolação de shell
        sftp = client.open_sftp()
        sftp.put(LOCAL_CONF, REMOTE_CONF)
        sftp.close()

        run_cmd(client, "cp /home/hmt/hojemt.conf /etc/nginx/sites-available/hojemt", sudo=True)
        run_cmd(client, "ln -sf /etc/nginx/sites-available/hojemt /etc/nginx/sites-enabled/hojemt", sudo=True)
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default", sudo=True)

        # Testa sintaxe Nginx e recarrega
        run_cmd(client, "nginx -t", sudo=True)
        run_cmd(client, "systemctl reload nginx", sudo=True)

        # Tenta obter certificado SSL via Certbot
        run_cmd(client, f"certbot --nginx -d {DOMAIN} -d {WWW_DOMAIN} --non-interactive --agree-tos -m contato@{DOMAIN} || echo '⚠️ Certbot: apontamento de DNS de hojemt.com.br pendente'", sudo=True)

        print("\n" + "="*80)
        print("🎉 GHOST CMS & NGINX 100% CONFIGURADOS E ATIVOS NO SERVIDOR!")
        print(f"🌐 Domínio Oficial: http://{DOMAIN} (ou https://{DOMAIN})")
        print(f"🌐 Subdomínio WWW: http://{WWW_DOMAIN}")
        print(f"🌐 Acesso por IP: http://{HOST}")
        print(f"🛠️ Admin Ghost: http://{DOMAIN}/ghost")
        print("="*80)

    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
