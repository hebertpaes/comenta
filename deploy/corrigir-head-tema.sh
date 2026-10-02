#!/usr/bin/env bash
# Corrige a prévia do WhatsApp no hojemt.com.br movendo o modal de vídeo
# (div#hmt-vm + script) do <head> para o fim do <body> do tema.
#
# Por quê: pelo padrão HTML, um <div> dentro do <head> encerra o head; o
# leitor estrito do WhatsApp passa a tratar as tags og:* como corpo e monta a
# prévia só com o título (sem descrição e sem imagem). Conferido de novo no
# ar em 02/10/2026: o <div id="hmt-vm"> está no byte ~1000 do HTML, antes de
# todas as tags og.
#
# Rodar NO SERVIDOR, com o usuário que administra o Ghost (o mesmo que usa o
# ghost-cli; ele precisa de sudo). Um comando só:
#   curl -fsSL https://raw.githubusercontent.com/hebertpaes/comenta/claude/exciting-thompson-4rhut2/deploy/corrigir-head-tema.sh | bash
# Opções: GHOST_DIR=/var/www/outro bash corrigir-head-tema.sh
#         TEMA=/caminho/do/tema bash corrigir-head-tema.sh   (só esse tema)
set -euo pipefail

# 1. instalação do Ghost
GHOST_DIR="${GHOST_DIR:-}"
if [ -z "$GHOST_DIR" ]; then
  for d in /var/www/hojemt /var/www/*; do
    if [ -f "$d/config.production.json" ] && [ -d "$d/content/themes" ]; then GHOST_DIR="$d"; break; fi
  done
fi
[ -n "$GHOST_DIR" ] || { echo "não achei a instalação do Ghost em /var/www (use GHOST_DIR=/caminho)"; exit 1; }
echo "Ghost em: $GHOST_DIR"

# 2. temas com o modal dentro do <head>
if [ -n "${TEMA:-}" ]; then TEMAS=("$TEMA"); else TEMAS=("$GHOST_DIR"/content/themes/*/); fi
corrigidos=0
for t in "${TEMAS[@]}"; do
  t="${t%/}"
  f="$t/default.hbs"
  [ -f "$f" ] || continue
  tmp="$(mktemp)"
  if node - "$f" "$tmp" <<'JS'
const fs = require("fs");
const [arq, saida] = process.argv.slice(2);
let s = fs.readFileSync(arq, "utf8");
const head = s.indexOf("</head>");
const i = s.indexOf('<div id="hmt-vm"');
if (i < 0 || head < 0 || i > head) process.exit(3); // nada a fazer neste tema
const j = s.indexOf("</script>", i);
if (j < 0) { console.error("fim do script do modal não encontrado em " + arq); process.exit(4); }
const bloco = s.slice(i, j + "</script>".length);
s = s.slice(0, i).replace(/[ \t]+$/, "") + s.slice(j + "</script>".length);
if (s.includes("{{ghost_foot}}")) s = s.replace("{{ghost_foot}}", bloco + "\n    {{ghost_foot}}");
else s = s.replace("</body>", bloco + "\n</body>");
fs.writeFileSync(saida, s);
JS
  then
    SUDO=""; [ -w "$f" ] || SUDO="sudo"
    $SUDO cp "$f" "$f.bak-$(date +%Y%m%d%H%M%S)"
    $SUDO cp "$tmp" "$f"   # cp sobre o arquivo existente mantém dono e permissões
    echo "corrigido: $f (cópia de segurança ao lado, .bak-*)"
    corrigidos=$((corrigidos + 1))
  else
    rc=$?
    [ "$rc" = 3 ] && echo "ok, sem modal no <head>: $f" || { rm -f "$tmp"; exit "$rc"; }
  fi
  rm -f "$tmp"
done

if [ "$corrigidos" = 0 ]; then
  echo "nenhum tema precisava de correção; nada reiniciado."
  exit 0
fi

# 3. reinicia o Ghost para recarregar o tema
cd "$GHOST_DIR"
if command -v ghost >/dev/null 2>&1 && [ "$(id -u)" != 0 ]; then
  ghost restart
else
  sudo systemctl restart 'ghost_*'
fi
echo "pronto. Teste: curl -s https://hojemt.com.br/ | head -c 1500  (não deve haver <div antes das tags og:)"
