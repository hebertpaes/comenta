#!/usr/bin/env bash
# =============================================================
# Teste de carga leve: simula VÁRIOS visitantes iniciando um
# atendimento AO MESMO TEMPO pelo widget público do site.
# Cada um vira uma conversa real na fila do painel (Conversas).
#
# Uso (a partir de deploy/):
#   bash test-multiusuarios.sh          # 6 usuários simultâneos
#   N=15 bash test-multiusuarios.sh     # 15 usuários simultâneos
#
# Depois, abra o painel → Conversas (http://localhost:8080) e veja
# todos na fila ao mesmo tempo, cada um no seu time.
# Observação: os números são fictícios, então NÃO responda por aqui
# se quiser testar a ida ao WhatsApp — para isso use seu 2º número real.
# =============================================================
set -u
API="${API_URL:-http://localhost:4000}"
N="${N:-6}"

NAMES=("Ana Souza" "Bruno Lima" "Carla Dias" "Diego Rocha" "Elaine Melo" "Felipe Antunes" "Gabriela Reis" "Heitor Nunes" "Iara Campos" "João Prado" "Kelly Ramos" "Lucas Vieira" "Marina Alves" "Nathan Costa" "Olívia Braga")
TEAMS=("Suporte" "Vendas" "Financeiro" "Marketing")
MSGS=("Meu pedido não chegou, podem verificar?" "Quero assinar o plano Pro hoje" "Preciso da 2ª via da fatura" "Temos interesse em fechar parceria" "O app não abre no meu celular" "Qual o valor do plano Business?" "Como conecto o WhatsApp?" "Recebi cobrança duplicada")

echo "==> Disparando $N atendimentos SIMULTÂNEOS em $API"
echo ""
for i in $(seq 0 $((N-1))); do
  name="${NAMES[$((i % ${#NAMES[@]}))]} $((i+1))"
  team="${TEAMS[$((i % ${#TEAMS[@]}))]}"
  msg="${MSGS[$((i % ${#MSGS[@]}))]}"
  phone=$(printf '55669%08d' $((90000000 + i)))   # números fictícios distintos (13 dígitos)
  (
    resp=$(curl -s -X POST "$API/widget/start" -H "Content-Type: application/json" \
      -d "{\"name\":\"$name\",\"team\":\"$team\",\"phone\":\"$phone\",\"message\":\"$msg\"}")
    cid=$(printf '%s' "$resp" | sed -n 's/.*"conversationId":"\([^"]*\)".*/\1/p')
    tok=$(printf '%s' "$resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
    if [ -n "$cid" ]; then
      # segunda mensagem do visitante (simula a conversa fluindo)
      curl -s -X POST "$API/widget/message" -H "Content-Type: application/json" \
        -d "{\"conversationId\":\"$cid\",\"token\":\"$tok\",\"body\":\"Estou aguardando, obrigado!\"}" >/dev/null
      echo "  ✓ [$team] $name  →  conversa ${cid:0:8}…"
    else
      echo "  ✗ $name falhou: $resp"
    fi
  ) &
done
wait
echo ""
echo "✔ Pronto. Abra o painel → 💬 Conversas:  http://localhost:8080"
echo "  Você deve ver $N conversas na fila (status 'pending'), distribuídas nos times."
echo "  Clique em cada uma e responda para ver a resposta aparecer na conversa."
