#!/usr/bin/env bash
# Instala a ponte hojemt-zap como serviço systemd.
# Uso: sudo bash deploy/install.sh   (a partir da raiz do repositório clonado)
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p /opt/hojemt-zap
cp server.js package.json /opt/hojemt-zap/

if [ ! -f /etc/hojemt-zap.env ]; then
  cp .env.example /etc/hojemt-zap.env
  chmod 600 /etc/hojemt-zap.env
  echo ">> Criado /etc/hojemt-zap.env — EDITE com sua chave, destinos e token antes de usar."
fi

cp deploy/hojemt-zap.service /etc/systemd/system/hojemt-zap.service
systemctl daemon-reload
systemctl enable --now hojemt-zap
systemctl --no-pager status hojemt-zap | head -8
echo ">> Teste: curl -s http://localhost:3900/health"
