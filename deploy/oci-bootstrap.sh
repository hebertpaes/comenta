#!/usr/bin/env bash
# =============================================================================
#  Rodar no ORACLE CLOUD SHELL (ja autenticado como o dono do tenancy):
#
#    curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/main/deploy/oci-bootstrap.sh | bash
#
#  O que faz, sem precisar de senha nem de chave SSH:
#   1. Libera TCP 80 e 443 (0.0.0.0/0) na Security List da sub-rede da instancia.
#   2. Via "Run Command" (Oracle Cloud Agent, roda como root na VM) autoriza a
#      chave publica do operador no usuario ubuntu/opc, para instalar por SSH.
#
#  Variaveis opcionais: INSTANCE_ID, PUBKEY
# =============================================================================
set -euo pipefail

INSTANCE_ID="${INSTANCE_ID:-ocid1.instance.oc1.sa-saopaulo-1.antxeljry6y5mtqcbljfilfkt2houqrctxob6yxeuf66mgzxmqja4xca6pwq}"
PUBKEY="${PUBKEY:-ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILPJj6AAru0U+MRkIQVBkUmEwruWsda+3t1y2RE8CXwL oci-ghost}"

log() { echo "[$(date +%T)] $*"; }
command -v oci >/dev/null || { echo "ERRO: OCI CLI nao encontrado. Rode dentro do Oracle Cloud Shell."; exit 1; }

COMP=$(oci compute instance get --instance-id "$INSTANCE_ID" --query 'data."compartment-id"' --raw-output)
STATE=$(oci compute instance get --instance-id "$INSTANCE_ID" --query 'data."lifecycle-state"' --raw-output)
log "instancia: $STATE | compartment: $COMP"
[ "$STATE" = "RUNNING" ] || { echo "ERRO: a instancia nao esta RUNNING ($STATE)."; exit 1; }

# -----------------------------------------------------------------------------
# 1) Security List: ingress TCP 80 e 443
# -----------------------------------------------------------------------------
SUBNET=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" --query 'data[0]."subnet-id"' --raw-output)
PUBIP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" --query 'data[0]."public-ip"' --raw-output)
SL=$(oci network subnet get --subnet-id "$SUBNET" --query 'data."security-list-ids"[0]' --raw-output)
log "IP publico: $PUBIP | subnet: $SUBNET"
log "security list: $SL"

oci network security-list get --security-list-id "$SL" --query 'data."ingress-security-rules"' > /tmp/ingress.json
python3 - <<'PY'
import json, re
rules = json.load(open('/tmp/ingress.json'))
def has(port):
    for r in rules:
        t = (r.get('tcp-options') or {}).get('destination-port-range') or {}
        if r.get('protocol') == '6' and r.get('source') == '0.0.0.0/0' and t.get('min') == port:
            return True
    return False
added = []
for p in (80, 443):
    if not has(p):
        rules.append({"protocol": "6", "source": "0.0.0.0/0", "source-type": "CIDR_BLOCK", "is-stateless": False,
                      "tcp-options": {"destination-port-range": {"min": p, "max": p}}, "description": "Ghost HTTP/HTTPS"})
        added.append(p)
def camel(o):
    if isinstance(o, dict):
        return {re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k): camel(v) for k, v in o.items() if v is not None}
    if isinstance(o, list):
        return [camel(x) for x in o]
    return o
json.dump(camel(rules), open('/tmp/ingress_new.json', 'w'))
open('/tmp/ingress_added', 'w').write(' '.join(map(str, added)))
PY
ADDED=$(cat /tmp/ingress_added)
if [ -n "$ADDED" ]; then
  oci network security-list update --security-list-id "$SL" --ingress-security-rules file:///tmp/ingress_new.json --force >/dev/null
  log "portas liberadas na security list: $ADDED"
else
  log "portas 80/443 ja estavam liberadas"
fi

# -----------------------------------------------------------------------------
# 2) Run Command: autoriza a chave publica na VM (roda como root, sem SSH)
# -----------------------------------------------------------------------------
read -r -d '' SCRIPT <<EOS || true
U=ubuntu; id -u \$U >/dev/null 2>&1 || U=opc
H=\$(getent passwd \$U | cut -d: -f6)
install -d -m 700 -o \$U -g \$U "\$H/.ssh"
grep -qF "oci-ghost" "\$H/.ssh/authorized_keys" 2>/dev/null || echo "$PUBKEY" >> "\$H/.ssh/authorized_keys"
chown \$U:\$U "\$H/.ssh/authorized_keys"; chmod 600 "\$H/.ssh/authorized_keys"
echo "KEY_OK user=\$U"; grep -E '^(PRETTY_NAME)=' /etc/os-release
EOS

CONTENT=$(python3 -c 'import json,sys; print(json.dumps({"source":{"sourceType":"TEXT","text":sys.argv[1]},"output":{"outputType":"TEXT"}}))' "$SCRIPT")
CMD=$(oci instance-agent command create --compartment-id "$COMP" --display-name "autorizar-chave-ghost" \
      --target "{\"instanceId\":\"$INSTANCE_ID\"}" --content "$CONTENT" --execution-time-out-in-seconds 300 \
      --query 'data.id' --raw-output)
log "run command criado: $CMD (aguardando execucao...)"

for i in $(seq 1 30); do
  sleep 5
  ST=$(oci instance-agent command-execution get --command-id "$CMD" --instance-id "$INSTANCE_ID" --query 'data."lifecycle-state"' --raw-output 2>/dev/null || echo "PENDING")
  case "$ST" in
    SUCCEEDED)
      OUT=$(oci instance-agent command-execution get --command-id "$CMD" --instance-id "$INSTANCE_ID" --query 'data.content.output.text' --raw-output 2>/dev/null || true)
      log "run command OK:"; echo "$OUT"; break;;
    FAILED|TIMED_OUT|CANCELED)
      OUT=$(oci instance-agent command-execution get --command-id "$CMD" --instance-id "$INSTANCE_ID" --query 'data.content.output' 2>/dev/null || true)
      log "run command $ST:"; echo "$OUT"
      echo "Dica: no console, Instancia > Oracle Cloud Agent > habilite 'Compute Instance Run Command' e rode de novo."; exit 1;;
    *) [ $((i % 6)) -eq 0 ] && log "estado: $ST";;
  esac
done

cat <<TXT

============================================================
 Pronto. Agora a chave SSH foi autorizada e as portas 80/443 liberadas!
 Instale o Ghost na VM com:
   curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/main/install.sh \\
     | sudo DOMAIN=comenta.com.br EMAIL=contato@comenta.com.br bash
============================================================
TXT
