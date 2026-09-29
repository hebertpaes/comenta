#!/usr/bin/env bash
# Instala o gancho pre-commit que roda scripts/verificar-segredos.py no que vai
# entrar em cada commit (protocolo de segurança, SECURITY.md). Uma vez por clone.
set -euo pipefail
raiz="$(git rev-parse --show-toplevel)"
gancho="$raiz/.git/hooks/pre-commit"
cat > "$gancho" <<'GANCHO'
#!/usr/bin/env bash
# pre-commit: barra segredos (scripts/verificar-segredos.py)
git diff --cached -U0 --no-color | python3 "$(git rev-parse --show-toplevel)/scripts/verificar-segredos.py"
GANCHO
chmod +x "$gancho"
echo "gancho instalado em $gancho"
