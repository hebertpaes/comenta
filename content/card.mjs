#!/usr/bin/env node
// =============================================================
// card.mjs — gera o card 1080×1350 do Instagram a partir de um JSON
// =============================================================
//
//   node card.mjs --exemplo > minha-pauta.json     modelo para preencher
//   node card.mjs minha-pauta.json                 grava minha-pauta.jpg ao lado
//   node card.mjs minha-pauta.json --saida=saida/card.webp --formato=webp
//
// JSON:
// {
//   "chapeu": "Checagem - Empresas no Paraguai",
//   "manchete": "Paraguai: 3 de 4 dólares são capital local",
//   "sublinha": "Incentivos aprovaram US$ 448 mi até julho (+32%)…",
//   "fontes": "Viceministério de Indústria (Paraguai) • Bloomberg Línea",
//   "creditoFoto": "Foto: Diego3336/Flickr (CC BY 2.0)",
//   "fotos": ["fotos/ponte.jpg"]        // 0, 1 ou 2; jpg vira círculo sozinho
// }
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { gerarCard } from "./lib/card.mjs";
import { circulo } from "./lib/imagens.mjs";

const args = {};
const livres = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args[m[1]] = m[2] ?? true;
  else livres.push(a);
}

if (args.exemplo === true) {
  console.log(
    JSON.stringify(
      {
        chapeu: "Economia - Tarifaço dos EUA",
        manchete: "Tarifa de 25%: carne e café ficaram de fora",
        sublinha:
          "Ação da Seção 301, publicada em 15/07 e em vigor desde 22/07, após investigação sobre Pix, etanol e desmatamento. Mais de 1.600 códigos isentos.",
        fontes: "USTR • Federal Register • Al Jazeera/Reuters",
        creditoFoto: "",
        fotos: [],
      },
      null,
      2
    )
  );
  process.exit(0);
}

const entrada = livres[0];
if (!entrada) {
  console.log(
    "uso: card.mjs pauta.json [--saida=arquivo.jpg] [--formato=jpeg|webp|png] | --exemplo"
  );
  process.exit(1);
}

const dados = JSON.parse(await readFile(entrada, "utf8"));
const base = dirname(resolve(entrada));
const fotos = [];
for (const f of dados.fotos || []) {
  const caminho = resolve(base, typeof f === "string" ? f : f.arquivo);
  // PNG já redondo (saída de imagens.mjs --circulo) entra direto; o resto vira círculo
  fotos.push(
    /-circulo\.png$/i.test(caminho)
      ? caminho
      : await circulo(caminho, { focoY: Number(f.foco ?? 0.22) })
  );
}

const formato = String(
  args.formato || (args.saida ? extname(String(args.saida)).slice(1) : "jpeg") || "jpeg"
).replace(/^jpg$/, "jpeg");
const saida = String(
  args.saida || join(base, `${basename(entrada, ".json")}.${formato === "jpeg" ? "jpg" : formato}`)
);

const buf = await gerarCard({ ...dados, fotos }, { formato });
await writeFile(saida, buf);
console.log(`card: ${saida} (${Math.round(buf.length / 1024)} KB, ${fotos.length} retrato(s))`);
