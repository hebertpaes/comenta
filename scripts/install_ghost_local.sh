#!/usr/bin/env bash
# ==============================================================================
# Script de Instalação Local do Ghost CMS (docs.ghost.org/install/local)
# Comenta & Gumesmomo Fit — Estrutura Local
# ==============================================================================

set -e

echo "👻 Iniciando configuração do Ghost CMS em ambiente local..."

# 1. Verifica se o Node.js e o NPM estão disponíveis
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale o Node.js v18 ou v20/v22."
    exit 1
fi

echo "✔ Node.js detectado: $(node -v)"
echo "✔ NPM detectado: $(npm -v)"

# 2. Instala o Ghost-CLI globalmente (se necessário)
if ! command -v ghost &> /dev/null; then
    echo "📦 Instalando ghost-cli globalmente via npm..."
    npm install -g ghost-cli@latest
else
    echo "✔ ghost-cli já está instalado globalmente."
fi

# 3. Prepara a pasta de instalação local do Ghost em ghost/
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GHOST_DIR="${PROJECT_ROOT}/ghost"

mkdir -p "${GHOST_DIR}"
cd "${GHOST_DIR}"

echo "📂 Diretório do Ghost: ${GHOST_DIR}"

# 4. Executa a instalação local do Ghost se a pasta estiver vazia
if [ ! -f "config.development.json" ]; then
    echo "🚀 Executando 'ghost install local'..."
    ghost install local --no-prompt || echo "⚠️ Instalação interativa do Ghost finalizada."
else
    echo "✔ Ghost local já configurado no diretório."
fi

echo "=============================================================================="
echo "🎉 Ghost CMS Local configurado com sucesso!"
echo "🌐 URL do Ghost Local: http://localhost:2368"
echo "🛠️ Painel Admin Ghost: http://localhost:2368/ghost"
echo "=============================================================================="
