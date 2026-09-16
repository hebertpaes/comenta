#!/bin/bash
set -e

echo "=========================================================================="
echo "🚀 IMPLANTAÇÃO AUTOMÁTICA DO COMENTA AI — ORACLE CLOUD (147.15.103.114)"
echo "=========================================================================="

DOMAIN="${DOMAIN:-intsoft.com.br}"
WWW_DOMAIN="www.${DOMAIN}"

# 1. Atualizar e instalar Nginx, Node.js 20 LTS, Certbot e PM2
echo "📦 1/5 Instalando pacotes e runtime Node.js 20 LTS..."
sudo apt-get update -y || true
sudo apt-get install -y nginx mysql-server certbot python3-certbot-nginx curl wget git unzip build-essential ufw || true

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 ghost-cli@latest

# 2. Criar diretório da aplicação
echo "📁 2/5 Criando pasta da aplicação /var/www/comenta..."
sudo mkdir -p /var/www/comenta
sudo chown -R $USER:$USER /var/www/comenta

# 3. Criar arquivo de entrada Node.js server.js
echo "⚡ 3/5 Configurando servidor Node.js Comenta & IntSoft AI..."
cat << 'EOF' > /var/www/comenta/server.js
import http from "node:http";

const PORT = 2368;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IntSoft AI & Comenta 2.0 — Plataforma de Soluções Inteligentes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
    body { margin: 0; background: #0b0f19; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #141a29; border: 1px solid #1e293b; border-radius: 24px; max-width: 650px; width: 100%; padding: 40px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(0,80,255,0.2); color: #38bdf8; border: 1px solid rgba(0,80,255,0.4); font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 20px; }
    h1 { font-size: 32px; font-weight: 900; margin: 0 0 12px 0; background: linear-gradient(to right, #ffffff, #cbd5e1, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 30px; }
    .btn-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn { display: inline-block; background: linear-gradient(to right, #0050ff, #7c3aed); color: #fff; text-decoration: none; font-weight: 800; padding: 14px 28px; border-radius: 14px; font-size: 14px; box-shadow: 0 10px 25px rgba(0,80,255,0.4); }
    .btn-secondary { background: #1e293b; box-shadow: none; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✦ Oracle Cloud Live • intsoft.com.br & comenta.com.br</div>
    <h1>IntSoft AI Soluções & Comenta 2.0</h1>
    <p>Plataforma de Engenharia de Software, Agentes de IA, Automação de WhatsApp e Geomonitoramento em Tempo Real.</p>
    <div class="btn-group">
      <a href="https://intsoft.com.br" class="btn">intsoft.com.br</a>
      <a href="https://comenta.com.br" class="btn btn-secondary">comenta.com.br</a>
    </div>
  </div>
</body>
</html>`);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 IntSoft & Comenta AI Server rodando na porta ${PORT}`);
});
EOF

cd /var/www/comenta
pm2 delete all 2>/dev/null || true
pm2 start server.js --name intsoft-comenta
pm2 save

# 4. Configurar Nginx para intsoft.com.br e comenta.com.br
echo "🌐 4/5 Configurando Nginx Reverse Proxy para intsoft.com.br & comenta.com.br..."
sudo cat << 'EOF' > /etc/nginx/sites-available/intsoft.com.br
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name intsoft.com.br www.intsoft.com.br comenta.com.br www.comenta.com.br 147.15.103.114 _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:2368;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/intsoft.com.br /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 5. Certbot SSL para intsoft.com.br e comenta.com.br
echo "🔒 5/5 Configurando Certificados SSL..."
sudo certbot --nginx -d intsoft.com.br -d www.intsoft.com.br -d comenta.com.br -d www.comenta.com.br --non-interactive --agree-tos -m intsoft@icloud.com || sudo systemctl reload nginx

echo "=========================================================================="
echo "🎉 IMPLANTAÇÃO NA ORACLE CLOUD CONCLUÍDA COM SUCESSO!"
echo "🌐 Website Principal: https://intsoft.com.br"
echo "🌐 Website Comenta: https://comenta.com.br"
echo "=========================================================================="
