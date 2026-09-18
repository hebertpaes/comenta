#!/usr/bin/env bash
# =============================================================================
#  Cria uma instância NOVA na Oracle Cloud com a mesma configuração de outra
#  (shape, OCPUs, memória, imagem, sub-rede, tamanho do boot volume) e instala,
#  no primeiro boot, o site do Comenta — ou um Ghost completo (STACK=ghost),
#  como o de intsoft.com.br, para outro domínio (o caso de hojemt.com.br).
#
#  Rodar no ORACLE CLOUD SHELL (já autenticado como dono do tenancy):
#
#    O ramo vai duas vezes: na URL (escolhe a versão do script) e em BRANCH
#    (escolhe o código que o servidor clona). Hoje este arquivo não está em
#    main, então "main" na URL dá 404 e o comando falha calado.
#    ramo=claude/exciting-thompson-4rhut2   # troque para main depois do merge
#    curl -fsSL "https://raw.githubusercontent.com/hebertpaes/comenta/$ramo/deploy/oci-new-instance.sh" | bash
#
#  Variáveis opcionais:
#    SOURCE_INSTANCE_ID  instância modelo (default: a "ghost-blog" em sa-saopaulo-1)
#    NAME                nome da instância nova (default: comenta-site; hojemt
#                        quando STACK=ghost)
#    SHAPE / OCPUS / MEM sobrescrevem o que vem da instância modelo. Com SHAPE
#                        diferente a imagem é escolhida de novo (o Ubuntu 24.04
#                        mais recente compatível — um OCID x86 não sobe em A1).
#                        Ex.: SHAPE=VM.Standard.A1.Flex OCPUS=2 MEM=4 (Always
#                        Free, ARM) reproduz o tamanho da VM hmt da Azure.
#    PUBKEYS             chaves públicas autorizadas no usuário ubuntu, uma por
#                        linha (default: as chaves mac-intsoft e ghost-oci)
#    BRANCH              ramo do repositório a publicar (default: main)
#    DOMAINS             domínios do Nginx (default: intsoft.com.br www.intsoft.com.br;
#                        hojemt.com.br quando STACK=ghost)
#    STACK               site  = só o site Next.js (deploy_site.sh, PM2 + Nginx)
#                        full  = sistema completo em Docker: site, painel, API,
#                                Postgres, Redis e Ghost (deploy/bootstrap.sh;
#                                precisa dos subdomínios app., api. e blog.)
#                        ghost = só o Ghost (MySQL + Nginx + systemd, tema
#                                hojemt, HTTPS automático quando o DNS apontar)
#                                pelo deploy/oci-cloud-init-ghost.sh
#                        (default: site)
#    EMAIL               e-mail do Let's Encrypt (STACK=ghost). Sem ele o
#                        certificado fica pendente até editar /etc/ghost-ssl.env
#    NO_DEPLOY=1         só cria a VM, sem instalar nada no primeiro boot
#    DEPLOY_KEY          arquivo da chave de deploy gerada aqui no Cloud Shell
#                        (default: ~/.ssh/comenta_deploy). A pública entra na VM;
#                        a privada vai para o secret DEPLOY_SSH_KEY do GitHub,
#                        e é por ela que o workflow "Deploy" (e o Claude, através
#                        dele) entra no servidor.
#
#  O que acontece:
#   1. Lê a instância modelo e lança outra igual, com IP público, na mesma
#      sub-rede (que já tem 80/443 liberados pelo oci-bootstrap.sh; confere).
#   2. Gera a chave de deploy (se não existir) e autoriza, na VM, essa chave
#      mais as suas (mac-intsoft e ghost-oci).
#   3. Passa um cloud-init que instala o site (ou o sistema completo) com
#      SKIP_SSL=1 — o DNS ainda aponta para a VM antiga; o certificado vem depois.
#      No STACK=ghost o próprio cloud-init arma um cron que emite o certificado
#      sozinho assim que o DNS resolver para a VM nova.
#   4. Espera ficar RUNNING e imprime IP, comandos e os secrets para o GitHub.
# =============================================================================
set -euo pipefail

SOURCE_INSTANCE_ID="${SOURCE_INSTANCE_ID:-ocid1.instance.oc1.sa-saopaulo-1.antxeljry6y5mtqcbljfilfkt2houqrctxob6yxeuf66mgzxmqja4xca6pwq}"
BRANCH="${BRANCH:-main}"
NO_DEPLOY="${NO_DEPLOY:-0}"
STACK="${STACK:-site}"
EMAIL="${EMAIL:-}"
SHAPE_OVERRIDE="${SHAPE:-}"; OCPUS_OVERRIDE="${OCPUS:-}"; MEM_OVERRIDE="${MEM:-}"
if [ "$STACK" = "ghost" ]; then
  NAME="${NAME:-hojemt}"
  DOMAINS="${DOMAINS:-hojemt.com.br www.hojemt.com.br}"
else
  NAME="${NAME:-comenta-site}"
  DOMAINS="${DOMAINS:-intsoft.com.br www.intsoft.com.br}"
fi
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/comenta_deploy}"
PUBKEYS="${PUBKEYS:-ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBnAMxEEjNz9WW32ieYln9jjyxFIj1zXuR/k8C0LTEAm mac-intsoft
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHifpcES/NUHc9sVlLTV//R7mv3/6fXCfLVABn+KsCZE ghost-oci}"
case "$STACK" in site|full|ghost) ;; *) echo "STACK deve ser site, full ou ghost" >&2; exit 1;; esac

log(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die(){ printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }
command -v oci >/dev/null || die "OCI CLI não encontrado. Rode dentro do Oracle Cloud Shell."
command -v python3 >/dev/null || die "python3 não encontrado."

log "1/5 Lendo a instância modelo"
SRC_JSON="$(mktemp)"
trap 'rm -f "$SRC_JSON"' EXIT
oci compute instance get --instance-id "$SOURCE_INSTANCE_ID" --query 'data' > "$SRC_JSON" 2>/dev/null \
  || die "não consegui ler a instância $SOURCE_INSTANCE_ID (ela existe nesta região/tenancy?)."
# Um valor por linha, com aspas: um campo vazio (imagem ausente, por exemplo)
# num `read` de campos separados por espaço desloca todos os seguintes — e o
# número de OCPUs acabaria virando o id da imagem.
eval "$(python3 - "$SRC_JSON" <<'PYSRC'
import json, shlex, sys
d = json.load(open(sys.argv[1]))
sc = d.get("shape-config") or {}
campos = {
    "COMP": d.get("compartment-id", ""),
    "AD": d.get("availability-domain", ""),
    "SHAPE": d.get("shape", ""),
    "IMAGE": d.get("image-id") or (d.get("source-details") or {}).get("image-id") or "",
    "OCPUS": str(sc.get("ocpus") or ""),
    "MEM": str(sc.get("memory-in-gbs") or ""),
}
for k, v in campos.items():
    print(k + "=" + shlex.quote(v))
PYSRC
)"
[ -n "$COMP" ] && [ -n "$AD" ] && [ -n "$SHAPE" ] || die "a instância modelo veio sem compartment/AD/shape."
[ -n "$OCPUS_OVERRIDE" ] && OCPUS="$OCPUS_OVERRIDE"
[ -n "$MEM_OVERRIDE" ] && MEM="$MEM_OVERRIDE"
if [ -n "$SHAPE_OVERRIDE" ] && [ "$SHAPE_OVERRIDE" != "$SHAPE" ]; then
  # Shape diferente pode ser outra arquitetura (A1 = ARM): a imagem da modelo
  # não serve. Pega o Ubuntu 24.04 mais recente que a Oracle lista como
  # compatível com o shape pedido.
  SHAPE="$SHAPE_OVERRIDE"
  IMAGE="$(oci compute image list --compartment-id "$COMP" --shape "$SHAPE" \
      --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
      --sort-by TIMECREATED --sort-order DESC --query 'data[0].id' --raw-output 2>/dev/null || true)"
  [ -n "$IMAGE" ] && [ "$IMAGE" != "null" ] || die "não achei imagem Ubuntu 24.04 para o shape $SHAPE nesta região."
  echo "  shape sobrescrito: $SHAPE (imagem escolhida de novo)"
fi
[ -n "$IMAGE" ] || die "a instância modelo não expõe image-id."

# --shape-config só vale para shape flexível. Num shape fixo (VM.Standard.E2.1.Micro,
# o do free tier) a Oracle recusa o launch inteiro por causa desse parâmetro.
SHAPE_CONFIG=()
case "$SHAPE" in
  *.Flex) SHAPE_CONFIG=(--shape-config "{\"ocpus\": ${OCPUS:-1}, \"memoryInGBs\": ${MEM:-6}}") ;;
esac
SUBNET=$(oci compute instance list-vnics --instance-id "$SOURCE_INSTANCE_ID" --query 'data[0]."subnet-id"' --raw-output)
BOOT_ATT=$(oci compute boot-volume-attachment list --compartment-id "$COMP" --availability-domain "$AD" \
  --instance-id "$SOURCE_INSTANCE_ID" --query 'data[0]."boot-volume-id"' --raw-output 2>/dev/null || true)
BOOT_GB=50
if [ -n "$BOOT_ATT" ] && [ "$BOOT_ATT" != "null" ]; then
  BOOT_GB=$(oci bv boot-volume get --boot-volume-id "$BOOT_ATT" --query 'data."size-in-gbs"' --raw-output 2>/dev/null || echo 50)
fi
echo "  compartment: $COMP"
if [ ${#SHAPE_CONFIG[@]} -gt 0 ]; then
  echo "  AD: $AD | shape: $SHAPE (${OCPUS:-1} OCPU, ${MEM:-6} GB) | boot: ${BOOT_GB} GB"
else
  echo "  AD: $AD | shape: $SHAPE (fixo, sem shape-config) | boot: ${BOOT_GB} GB"
fi
echo "  imagem: $IMAGE"
echo "  sub-rede: $SUBNET"

log "2/5 Conferindo 80/443 na security list da sub-rede"
SL=$(oci network subnet get --subnet-id "$SUBNET" --query 'data."security-list-ids"[0]' --raw-output 2>/dev/null || true)
if [ -z "$SL" ] || [ "$SL" = "null" ]; then
  echo "  a sub-rede não usa security list (só NSG?) — libere 80/443 na mão, pelo console."
else
  oci network security-list get --security-list-id "$SL" --query 'data."ingress-security-rules"' > /tmp/ingress.json
  python3 - <<'PY'
import json, re
rules = json.load(open('/tmp/ingress.json'))
def has(port):
    for r in rules:
        if r.get('protocol') not in ('6', 'all') or r.get('source') != '0.0.0.0/0':
            continue
        tcp = r.get('tcp-options')
        # Sem tcp-options, ou sem faixa de portas, a regra libera tudo: já cobre.
        if not tcp or not tcp.get('destination-port-range'):
            return True
        t = tcp['destination-port-range']
        if t.get('min', 0) <= port <= t.get('max', 0):
            return True
    return False
added = []
for p in (80, 443):
    if not has(p):
        rules.append({"protocol": "6", "source": "0.0.0.0/0", "source-type": "CIDR_BLOCK", "is-stateless": False,
                      "tcp-options": {"destination-port-range": {"min": p, "max": p}}, "description": "Comenta HTTP/HTTPS"})
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
    echo "  portas liberadas: $ADDED"
  else
    echo "  80 e 443 já liberadas."
  fi
fi

log "3/5 Chave de deploy ($DEPLOY_KEY)"
# Chave só para automação: a pública vai para a VM, a privada para o secret do
# GitHub. Fica no Cloud Shell (home persistente) para reaproveitar em outras VMs.
if [ ! -f "$DEPLOY_KEY" ]; then
  mkdir -p "$(dirname "$DEPLOY_KEY")"
  ssh-keygen -t ed25519 -N "" -C "github-deploy comenta" -f "$DEPLOY_KEY" >/dev/null
  echo "  gerada."
else
  echo "  já existia — reaproveitada."
fi
PUBKEYS="$PUBKEYS
$(cat "$DEPLOY_KEY.pub")"

log "4/5 Lançando a instância $NAME (STACK=$STACK)"
# hostname-label: minúsculas, só letras/dígitos/hífen, sem hífen nas pontas — e
# único dentro da sub-rede. Se já existir um igual a Oracle recusa o launch;
# nesse caso rode de novo com NAME=outro-nome.
HOSTLABEL="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/^-*//; s/-*$//' | cut -c1-63)"
[ -n "$HOSTLABEL" ] || HOSTLABEL="comenta"
# cloud-init: roda como root no primeiro boot, com log em /var/log/comenta-deploy.log.
USER_DATA=""
if [ "$NO_DEPLOY" != "1" ]; then
  if [ "$STACK" = "ghost" ]; then
    # DOMAIN é o primeiro nome; o próprio cloud-init cuida do www.
    INSTALL_CMD="curl -fsSL \"https://raw.githubusercontent.com/hebertpaes/comenta/$BRANCH/deploy/oci-cloud-init-ghost.sh\" | BRANCH=\"$BRANCH\" DOMAIN=\"$(echo "$DOMAINS" | awk '{print $1}')\" EMAIL=\"$EMAIL\" bash"
  elif [ "$STACK" = "full" ]; then
    INSTALL_CMD="curl -fsSL \"https://raw.githubusercontent.com/hebertpaes/comenta/$BRANCH/deploy/bootstrap.sh\" | BRANCH=\"$BRANCH\" DOMAIN=\"$(echo "$DOMAINS" | awk '{print $1}')\" SKIP_SSL=1 bash"
  else
    INSTALL_CMD="curl -fsSL \"https://raw.githubusercontent.com/hebertpaes/comenta/$BRANCH/deploy/deploy_site.sh\" | BRANCH=\"$BRANCH\" DOMAINS=\"$DOMAINS\" SKIP_SSL=1 bash"
  fi
  USER_DATA=$(cat <<CI | base64 -w0
#!/bin/bash
exec > /var/log/comenta-deploy.log 2>&1
echo "[cloud-init] instalando STACK=$STACK do Comenta (ramo $BRANCH)"
$INSTALL_CMD
echo "[cloud-init] fim: \$?"
CI
)
fi
METADATA=$(python3 - "$PUBKEYS" "$USER_DATA" <<'PY'
import json, sys
m = {"ssh_authorized_keys": sys.argv[1]}
if sys.argv[2]:
    m["user_data"] = sys.argv[2]
print(json.dumps(m))
PY
)
LAUNCH=$(oci compute instance launch \
  --compartment-id "$COMP" --availability-domain "$AD" \
  --shape "$SHAPE" ${SHAPE_CONFIG[@]+"${SHAPE_CONFIG[@]}"} \
  --image-id "$IMAGE" --boot-volume-size-in-gbs "$BOOT_GB" \
  --subnet-id "$SUBNET" --assign-public-ip true \
  --display-name "$NAME" --hostname-label "$HOSTLABEL" \
  --metadata "$METADATA" \
  --wait-for-state RUNNING --wait-interval-seconds 10 \
  --query 'data.{id: id, state: "lifecycle-state"}' --output json) \
  || die "o launch falhou ou a espera por RUNNING estourou. A instância pode ter sido criada mesmo assim — confira no console antes de rodar de novo (senão nascem duas)."
NEW_ID=$(echo "$LAUNCH" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))' 2>/dev/null || true)
[ -n "$NEW_ID" ] || die "não consegui ler o id da instância nova; confira no console."
echo "  instância: $NEW_ID"

log "5/5 IP público"
NEW_IP=""
for _ in $(seq 1 30); do
  NEW_IP=$(oci compute instance list-vnics --instance-id "$NEW_ID" --query 'data[0]."public-ip"' --raw-output 2>/dev/null || true)
  [ -n "$NEW_IP" ] && [ "$NEW_IP" != "null" ] && break
  sleep 5
done
[ -n "$NEW_IP" ] && [ "$NEW_IP" != "null" ] || die "a instância subiu mas ainda não tem IP público; veja no console."

if [ "$STACK" = "ghost" ]; then
  DOM="$(echo "$DOMAINS" | awk '{print $1}')"
  cat <<TXT

============================================================
 Instância $NAME criada: $NEW_IP  — Ghost para $DOM

 O cloud-init está instalando (MySQL, Nginx, Ghost, tema hojemt): 10–20 min.
 Acompanhar:
   ssh -i $DEPLOY_KEY ubuntu@$NEW_IP "sudo tail -f /var/log/ghost-install.log"
 Ou do seu Mac:
   ssh -i ~/.ssh/intsoft_ghost ubuntu@$NEW_IP

 Quando o log disser "Concluído", no Cloudflare (zona $DOM):
   A  @    $NEW_IP   nuvem CINZA
   A  www  $NEW_IP   nuvem CINZA
 O certificado sai sozinho em até 5 min depois que o DNS propagar
 (EMAIL=${EMAIL:-VAZIO — sem e-mail não há certificado; edite /etc/ghost-ssl.env na VM}).
 Depois: https://$DOM/ghost/ para criar a conta do dono, e o
 /root/LEIA-ghost.txt da VM explica como importar os 317 posts.
============================================================
TXT
  exit 0
fi

cat <<TXT

============================================================
 Instância $NAME criada: $NEW_IP  (mesma configuração de ghost-blog)

 Entrar daqui mesmo, do Cloud Shell, com a chave de deploy:
   ssh -i $DEPLOY_KEY ubuntu@$NEW_IP
 Ou do seu Mac, com a chave mac-intsoft:
   ssh -i ~/.ssh/intsoft_ghost ubuntu@$NEW_IP

 O site está sendo instalado pelo cloud-init (leva alguns minutos).
 Acompanhar:
   ssh -i $DEPLOY_KEY ubuntu@$NEW_IP "sudo tail -f /var/log/comenta-deploy.log"
 Testar antes do DNS (responde pelo IP):
   curl -sS -o /dev/null -w '%{http_code}\n' http://$NEW_IP/health

 Depois, no Cloudflare (zona intsoft.com.br), aponte os registros A de
 "@" e "www" para $NEW_IP (nuvem cinza até o certificado sair) e emita o SSL:
   ssh -i $DEPLOY_KEY ubuntu@$NEW_IP \\
     "curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/$BRANCH/deploy/deploy_site.sh | sudo BRANCH=$BRANCH DOMAINS='$DOMAINS' EMAIL=seu@email bash"

 A VM ghost-blog continua intocada com o Ghost.

 ---- Conectar o GitHub (e o Claude, pelo workflow Deploy) a esta VM ----
 Em github.com/hebertpaes/comenta > Settings > Secrets and variables > Actions:
   DEPLOY_HOST    = $NEW_IP
   DEPLOY_USER    = ubuntu
   DEPLOY_SSH_KEY = o conteúdo INTEIRO do arquivo abaixo (chave privada):
     cat $DEPLOY_KEY
 Ou, do seu Mac com o gh autenticado, copiando a chave do Cloud Shell:
   gh secret set DEPLOY_HOST --body $NEW_IP
   gh secret set DEPLOY_USER --body ubuntu
   gh secret set DEPLOY_SSH_KEY < comenta_deploy   # o arquivo privado copiado
 Feito isso, cada push na main publica sozinho, e "Actions > Deploy > Run
 workflow" publica qualquer ramo.
============================================================
TXT
