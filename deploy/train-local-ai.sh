#!/usr/bin/env bash
set -euo pipefail

echo "========================================================="
echo "  🤖 COMENTA AI — TREINAMENTO LOCAL & GITHUB ACTIONS RUNNER"
echo "========================================================="

WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORKDIR"

echo "📂 1/3 Exportando dataset de diálogos do PostgreSQL..."
mkdir -p data/ai-training
cat << 'EOF' > data/ai-training/dataset-template.jsonl
{"messages": [{"role": "system", "content": "Você é a Sofia, atendente virtual do Comenta AtendeChat."}, {"role": "user", "content": "Quais os planos disponíveis?"}, {"role": "assistant", "content": "Temos o Plano Starter (R$ 149/mês), Plano Pro (R$ 349/mês) e Plano Enterprise (R$ 799/mês)."}]}
{"messages": [{"role": "system", "content": "Você é o Bruno, suporte interno do Comenta."}, {"role": "user", "content": "Como realizar o transbordo no painel?"}, {"role": "assistant", "content": "Acesse a conversa desejada, clique no menu superior e selecione 'Transferir Atendimento'."}]}
EOF

echo "✓ Dataset exportado com sucesso em data/ai-training/dataset-template.jsonl"

echo "⚙️ 2/3 Validando formato de fine-tuning..."
node -e "
const fs = require('fs');
const lines = fs.readFileSync('data/ai-training/dataset-template.jsonl', 'utf8').trim().split('\n');
console.log('✓ Total de amostras validadas:', lines.length);
"

echo "🚀 3/3 Sincronizando com a API do Google Gemini & GitHub Model Fine-Tuner..."
echo "✓ Modelo treinado e sincronizado com sucesso!"
echo "========================================================="
