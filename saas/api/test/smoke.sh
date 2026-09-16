#!/bin/bash
# Smoke test da API Comenta SaaS. Requer a API rodando em :4000.
set -uo pipefail
B=${API:-http://localhost:4000}
J="Content-Type: application/json"
C="curl -s --noproxy localhost"
pass=0; fail=0
ok() { pass=$((pass+1)); echo "PASS  $1"; }
no() { fail=$((fail+1)); echo "FAIL  $1 :: $2"; }

# signup de uma empresa nova
EMAIL="dono+$RANDOM@empresa.com"
RESP=$($C -X POST $B/auth/signup -H "$J" -d "{\"companyName\":\"Loja Teste\",\"name\":\"Dono\",\"email\":\"$EMAIL\",\"password\":\"senhaforte123\"}")
TOKEN=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$TOKEN" ] && ok "signup empresa+admin" || no "signup" "$RESP"
A="Authorization: Bearer $TOKEN"

# /auth/me traz plano e uso
ME=$($C $B/auth/me -H "$A")
echo "$ME" | grep -q '"plan"' && ok "auth/me com plano" || no "auth/me" "$ME"

# criar contato
CT=$($C -X POST $B/contacts -H "$J" -H "$A" -d '{"name":"Cliente Ana","phone":"5511999990000","tags":["vip"]}')
CID=$(echo "$CT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
[ -n "$CID" ] && ok "criar contato" || no "criar contato" "$CT"

# criar canal simulador direto no banco (não há rota pública ainda) e conversa+mensagens
python3 - "$EMAIL" "$CID" <<'PY'
import sys, subprocess, json
email, cid = sys.argv[1], sys.argv[2]
def q(s):
    out=subprocess.check_output(["psql","postgresql://comenta:comenta123@localhost:5432/comenta_saas","-tAqc",s]).decode().strip()
    return out.splitlines()[0] if out else ""
company=q(f"SELECT company_id FROM users WHERE email='{email}'")
ch=q(f"INSERT INTO channels(company_id,type,name,status) VALUES('{company}','simulator','Sim',E'connected') RETURNING id")
conv=q(f"INSERT INTO conversations(company_id,contact_id,channel_id,status) VALUES('{company}','{cid}','{ch}','open') RETURNING id")
for d,b in [("in","Oi, meu pedido nao chegou"),("out","Ola! Pode me informar o numero?"),("in","Pedido 123, ja faz 5 dias")]:
    q(f"INSERT INTO messages(company_id,conversation_id,direction,body) VALUES('{company}','{conv}','{d}',$${b}$$)")
open("/tmp/comenta_conv.txt","w").write(conv)
PY
CONV=$(cat /tmp/comenta_conv.txt)
[ -n "$CONV" ] && ok "criar conversa+mensagens (via db)" || no "criar conversa" ""

# listar conversas
LC=$($C "$B/conversations?status=open" -H "$A")
echo "$LC" | grep -q "$CONV" && ok "listar conversas" || no "listar conversas" "$LC"

# detalhe da conversa traz mensagens
DC=$($C "$B/conversations/$CONV" -H "$A")
echo "$DC" | grep -q "pedido" && ok "detalhe conversa com mensagens" || no "detalhe conversa" "$DC"

# enviar resposta do atendente
SM=$($C -X POST "$B/conversations/$CONV/messages" -H "$J" -H "$A" -d '{"body":"Vou verificar seu pedido agora."}')
echo "$SM" | grep -q '"direction":"out"' && ok "enviar mensagem do atendente" || no "enviar mensagem" "$SM"

# métricas do dashboard
DM=$($C "$B/dashboard/metrics" -H "$A")
echo "$DM" | grep -q '"conversations"' && ok "dashboard/metrics" || no "dashboard" "$DM"

# criar API key
AK=$($C -X POST $B/api-keys -H "$J" -H "$A" -d '{"name":"integracao-erp"}')
KEY=$(echo "$AK" | python3 -c "import sys,json;print(json.load(sys.stdin).get('key',''))")
[ -n "$KEY" ] && ok "criar API key" || no "criar API key" "$AK"

# usar a API key para autenticar (listar contatos)
KC=$($C "$B/contacts" -H "X-API-Key: $KEY")
echo "$KC" | grep -q "Cliente Ana" && ok "autenticar via X-API-Key" || no "auth api key" "$KC"

# criar webhook
WH=$($C -X POST $B/webhooks -H "$J" -H "$A" -d '{"url":"https://exemplo.com/hook","events":["message.created"]}')
echo "$WH" | grep -q '"secret":"whsec_' && ok "criar webhook (com secret)" || no "criar webhook" "$WH"

# IA: deve responder 503 quando ANTHROPIC_API_KEY não está setada, ou 200 quando está
AIC=$($C -o /dev/null -w "%{http_code}" -X POST "$B/conversations/$CONV/ai/classify" -H "$A")
{ [ "$AIC" = "503" ] || [ "$AIC" = "200" ]; } && ok "endpoint IA responde ($AIC)" || no "endpoint IA" "$AIC"

# OpenAPI docs
DOC=$($C -o /dev/null -w "%{http_code}" $B/docs)
[ "$DOC" = "200" ] && ok "OpenAPI /docs" || no "docs" "$DOC"

echo ""
echo "RESULTADO: $pass PASS / $fail FAIL"
[ "$fail" = "0" ]
