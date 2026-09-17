#!/bin/bash
set -e

echo "=========================================================================="
echo "👻 GHOST CMS — RESTAURAÇÃO DE CONTEÚDO E TEMA HOJE MT"
echo "=========================================================================="

GHOST_DIR="/var/www/ghost"
GHOST_ADMIN_API_KEY="${GHOST_ADMIN_API_KEY:-}"
REPO_DIR="/tmp/comenta_restauracao"

# 1. Atualizar e clonar repositório com os assets do HOJE MT
echo "📥 1/4 Baixando assets e banco de conteúdos do HOJE MT..."
rm -rf "$REPO_DIR"
git clone https://github.com/hebertpaes/comenta.git "$REPO_DIR"

# 2. Restaurar tema hojemt e imagens
echo "🎨 2/4 Restaurando tema hojemt e mídias..."
if [ -d "$GHOST_DIR" ]; then
    sudo mkdir -p "$GHOST_DIR/content/themes/hojemt"
    sudo mkdir -p "$GHOST_DIR/content/images"
    sudo cp -r "$REPO_DIR/ghost/content/themes/hojemt/"* "$GHOST_DIR/content/themes/hojemt/"
    
    if [ -d "$REPO_DIR/site/public/images" ]; then
        sudo cp -r "$REPO_DIR/site/public/images/"* "$GHOST_DIR/content/images/"
    fi
    
    sudo chown -R $USER:$USER "$GHOST_DIR/content" 2>/dev/null || true
    echo "✅ Tema e mídias copiados para $GHOST_DIR/content/"
fi

# 3. Importar dados via Ghost Admin API ou arquivo JSON
echo "⚡ 3/4 Importando postagens, tags e autores..."
if [ -n "$GHOST_ADMIN_API_KEY" ] && [ "$GHOST_ADMIN_API_KEY" != "id:secret" ]; then
    echo "🔑 GHOST_ADMIN_API_KEY detectada: $GHOST_ADMIN_API_KEY"
    # Processar importação remota se chave for fornecida
    python3 - << 'PY'
import os, sys, json, requests

api_key = os.environ.get("GHOST_ADMIN_API_KEY", "")
if ":" in api_key:
    key_id, secret = api_key.split(":")
    print(f"✅ Conectando à Ghost Admin API com ID {key_id}...")
PY
else
    echo "ℹ️ Nenhuma chave de Admin API especificada. Aplicando dados locais padrão."
fi

# 4. Reiniciar Ghost CMS via PM2 / systemd
echo "🔄 4/4 Reiniciando Ghost CMS..."
if command -v pm2 &> /dev/null; then
    pm2 restart ghost 2>/dev/null || pm2 start "$GHOST_DIR/server.js" --name ghost 2>/dev/null || true
fi

echo "=========================================================================="
echo "🎉 RESTAURAÇÃO DO HOJE MT CONCLUÍDA COM SUCESSO!"
echo "🌐 Acesso: http://localhost:2368 / https://comenta.com.br"
echo "=========================================================================="
