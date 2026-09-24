#!/usr/bin/env bash
# Corrige a prévia do WhatsApp no hojemt.com.br movendo o modal de vídeo
# (div#hmt-vm + script) do <head> para o fim do <body> no tema ativo.
# Rodar NO SERVIDOR (usuário com acesso ao ghost-cli):
#   bash corrigir-head-tema.sh            (tema em /var/www/hojemt/content/themes/hojemt)
#   TEMA=/outro/caminho bash corrigir-head-tema.sh
set -euo pipefail
TEMA="${TEMA:-/var/www/hojemt/content/themes/hojemt}"
cd "$TEMA"
cp default.hbs "default.hbs.bak-$(date +%Y%m%d%H%M%S)"
node - <<'JS'
const fs = require("fs");
let s = fs.readFileSync("default.hbs", "utf8");
const head = s.indexOf("</head>");
const i = s.indexOf('<div id="hmt-vm"');
if (i < 0 || i > head) { console.log("modal não está no <head>; nada a fazer"); process.exit(0); }
const j = s.indexOf("</script>", i);
if (j < 0) throw new Error("fim do script do modal não encontrado");
const bloco = s.slice(i, j + "</script>".length);
s = s.slice(0, i).replace(/[ \t]+$/, "") + s.slice(j + "</script>".length);
if (s.includes("{{ghost_foot}}")) s = s.replace("{{ghost_foot}}", bloco + "\n    {{ghost_foot}}");
else s = s.replace("</body>", bloco + "\n</body>");
fs.writeFileSync("default.hbs", s);
console.log("modal movido do <head> para o <body>");
JS
cd /var/www/hojemt 2>/dev/null || cd "$(dirname "$(dirname "$(dirname "$TEMA")")")"
ghost restart
echo "pronto: teste em https://hojemt.com.br/ (view-source: og:image deve estar dentro do <head>, sem <div> antes)"
