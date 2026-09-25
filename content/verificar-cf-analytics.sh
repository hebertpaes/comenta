#!/usr/bin/env bash
# Confere se o Cloudflare Web Analytics está sendo injetado nas páginas do HOJE MT.
# Uso: bash content/verificar-cf-analytics.sh [url ...]
set -u

urls=("$@")
if [ ${#urls[@]} -eq 0 ]; then
  urls=(
    "https://hojemt.com.br/"
    "https://hojemt.com.br/apuracao-2026/"
    "https://hojemt.com.br/privacidade/"
  )
  # acrescenta a matéria mais recente do RSS, se houver
  ultima=$(curl -s --max-time 20 https://hojemt.com.br/rss/ | grep -oE '<link>https://hojemt\.com\.br/[^<]+</link>' | sed -n 2p | sed -E 's#</?link>##g')
  [ -n "${ultima:-}" ] && urls+=("$ultima")
fi

ok=0; total=0
for u in "${urls[@]}"; do
  total=$((total + 1))
  html=$(curl -s --max-time 25 -A 'Mozilla/5.0 (verificador HOJE MT)' "$u")
  if printf '%s' "$html" | grep -q 'static.cloudflareinsights.com/beacon.min.js'; then
    echo "OK         $u"
    ok=$((ok + 1))
  else
    echo "SEM SCRIPT $u"
  fi
done

echo "---"
if [ "$ok" -eq "$total" ]; then
  echo "Cloudflare Web Analytics ativo em todas as $total páginas conferidas."
elif [ "$ok" -eq 0 ]; then
  echo "Ainda não ativo: nenhuma das $total páginas tem o script. Ligue em Web Analytics no painel da Cloudflare."
  exit 1
else
  echo "Parcial: $ok de $total páginas com o script."
  exit 1
fi
