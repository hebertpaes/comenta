#!/usr/bin/env bash
# =============================================================
# backup-redacao.sh — backup do que a redação produz
# =============================================================
# Gera em backups/ (fora do git):
#   redacao-<data>.tar.gz  pautas, cards publicados, kit da redação (content/),
#                          tema do Ghost e scripts de deploy
#   repo-<data>.bundle     o repositório inteiro (todos os ramos) num arquivo só;
#                          restaura com: git clone repo-<data>.bundle comenta
# Depois envia o ramo atual ao GitHub e, se RCLONE_REMOTE estiver definido
# (ex.: "gdrive:Backups/HojeMT"), copia os dois arquivos para o Google Drive.
#
# Uso:  deploy/backup-redacao.sh [--sem-push] [--sem-drive]
#       BACKUP_DIR=/outro/lugar RCLONE_REMOTE=gdrive:Backups/HojeMT deploy/backup-redacao.sh
# Configurar o Drive uma vez:  rclone config  (tipo "drive")
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"
DATA="$(date +%Y%m%d-%H%M)"
DEST="${BACKUP_DIR:-$RAIZ/backups}"
mkdir -p "$DEST"

PUSH=1; DRIVE=1
for a in "$@"; do
  case "$a" in
    --sem-push) PUSH=0 ;;
    --sem-drive) DRIVE=0 ;;
    *) echo "opção desconhecida: $a" >&2; exit 1 ;;
  esac
done

echo "1/4 tar.gz da redação"
ITENS=()
for p in content/pautas content/lib content/assets content/README.md content/package.json \
         content/publish.mjs content/ilustrar.mjs content/imagens.mjs content/card.mjs content/instagram.mjs \
         ghost/content/themes/hojemt deploy; do
  [ -e "$p" ] && ITENS+=("$p")
done
tar -czf "$DEST/redacao-$DATA.tar.gz" --exclude='node_modules' --exclude='*.bundle' "${ITENS[@]}"

echo "2/4 bundle do repositório (todos os ramos)"
git bundle create "$DEST/repo-$DATA.bundle" --all >/dev/null 2>&1

if [ "$PUSH" = 1 ]; then
  RAMO="$(git rev-parse --abbrev-ref HEAD)"
  echo "3/4 GitHub: push do ramo $RAMO"
  git push -u origin "$RAMO"
else
  echo "3/4 GitHub: pulado (--sem-push)"
fi

if [ "$DRIVE" = 1 ] && [ -n "${RCLONE_REMOTE:-}" ]; then
  if command -v rclone >/dev/null; then
    echo "4/4 Google Drive: rclone copy → $RCLONE_REMOTE"
    rclone copy "$DEST" "$RCLONE_REMOTE" --include "*-$DATA.*"
  else
    echo "4/4 Google Drive: rclone não instalado (apt install rclone; rclone config)" >&2
  fi
else
  echo "4/4 Google Drive: pulado (defina RCLONE_REMOTE=gdrive:Pasta para enviar)"
fi

ls -lh "$DEST/redacao-$DATA.tar.gz" "$DEST/repo-$DATA.bundle"
