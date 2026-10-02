#!/usr/bin/env bash
# Varredura de manchetes dos veículos de MT para o Radar Eleitoral (e monitores).
# Baixa as listagens, compara com content/pautas/radar/manchetes-vistas.json e imprime
# só as manchetes novas. Com --gravar, marca as novas como vistas (commite o JSON depois).
#   bash content/tools/radar-varredura.sh            # só mostra
#   bash content/tools/radar-varredura.sh --gravar   # mostra e grava
# Sites que respondem 403/anti-robô ficam de fora: não contornar (regra do projeto).
set -uo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
TMP="${HOJEMT_TMP:-/tmp/hojemt}"
N="$TMP/varredura-$(date -u +%Y%m%d%H%M)"
mkdir -p "$N"
declare -A U=(
  [folhamax]=https://www.folhamax.com/politica/
  [gazeta]=https://www.gazetadigital.com.br/editorias/politica-de-mt/
  [gazetael]=https://www.gazetadigital.com.br/editorias/eleicoes-2026/
  [hnt]=https://www.hnt.com.br/politica/
  [hntj]=https://www.hnt.com.br/justica/
  [midiajur]=https://www.midiajur.com.br/
  [midianews]=https://www.midianews.com.br/politica
  [odoc]=https://odocumento.com.br/
  [rdnews]=https://www.rdnews.com.br/eleicoes-2026/
  [rmt]=https://www.reportermt.com/politica/
  [vgn]=https://www.vgnoticias.com.br/
)
for k in "${!U[@]}"; do
  curl -sL --max-time 25 -A "Mozilla/5.0" "${U[$k]}" -o "$N/$k.html" &
done
wait
python3 "$AQUI/manchetes.py" "$N" "$@"
