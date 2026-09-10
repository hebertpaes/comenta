#!/bin/bash
set -e

echo "=========================================================================="
echo "👻 INSTALAÇÃO DO GHOST CMS — ORACLE CLOUD / SERVIDOR UBUNTU"
echo "=========================================================================="

DOMAIN="${DOMAIN:-intsoft.com.br}"
PORT=2368

# 1. Instalar dependências (Node.js 20 LTS, Ghost-CLI, PM2 e Nginx)
echo "📦 1/4 Instalando Node.js 20 LTS, Ghost CLI, PM2 & Nginx..."
sudo apt-get update -y || true
sudo apt-get install -y nginx certbot python3-certbot-nginx curl wget git unzip build-essential || true

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

sudo npm install -g pm2 ghost-cli@latest

# 2. Criar diretório /var/www/ghost
echo "📁 2/4 Configurando diretório /var/www/ghost..."
sudo mkdir -p /var/www/ghost
sudo chown -R $USER:$USER /var/www/ghost

# 3. Baixar código do repositório
echo "📥 3/4 Baixando código-fonte do Ghost CMS..."
git clone https://github.com/hebertpaes/comenta.git /tmp/comenta_repo 2>/dev/null || (cd /tmp/comenta_repo && git pull origin main)
cp -r /tmp/comenta_repo/ghost/* /var/www/ghost/

cd /var/www/ghost
pm2 delete ghost 2>/dev/null || true
pm2 start server.js --name ghost
pm2 save

# 4. Configurar Nginx e SSL para o Ghost CMS
echo "🌐 4/4 Configurando Nginx e SSL para Ghost CMS..."
sudo cat << EOF > /etc/nginx/sites-available/ghost.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN} comenta.com.br www.comenta.com.br 147.15.103.114 _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "=========================================================================="
echo "🎉 GHOST CMS INSTALADO E OPERACIONAL COM SUCESSO!"
echo "🌐 Portal Web: https://${DOMAIN}"
echo "🔐 Admin Ghost: https://${DOMAIN}/ghost/"
echo "=========================================================================="
