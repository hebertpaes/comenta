/* =============================================================
 * links-internos.js — liga termos do texto a outras matérias do site
 * =============================================================
 * O template da matéria (partials/links-internos.hbs) imprime uma lista
 * escondida com as matérias relacionadas (mesmas tags): url, título e tags.
 * Este script procura no corpo da matéria a primeira ocorrência de cada termo
 * — frases do título das relacionadas e nomes de tags específicas — e a
 * transforma num link interno sublinhado. Regras:
 *   - só a primeira ocorrência de cada termo, uma matéria por termo;
 *   - no máximo MAX_LINKS por matéria, um por parágrafo;
 *   - nunca dentro de links, títulos, citações, figuras, código ou anúncios;
 *   - termos com menos de 5 letras e tags de seção (Política, Cidades…) ficam
 *     de fora, para não ligar palavra genérica a matéria aleatória.
 */
(function () {
  "use strict";

  var MAX_LINKS = 6;
  var MIN_TERMO = 5;
  var TAGS_GENERICAS = [
    "noticias",
    "noticia",
    "geral",
    "destaque",
    "destaques",
    "home",
    "curtas",
    "curtinhas",
    "curadoria automatica",
    "mato grosso",
    "brasil",
    "mundo",
    "cidades",
    "politica",
    "economia",
    "esportes",
    "esporte",
    "saude",
    "seguranca",
    "policia",
    "cultura",
    "opiniao",
    "agro",
    "agronegocio",
  ];
  var STOPWORDS =
    "a o e é de da do das dos em no na nos nas um uma uns umas por para com sem sob sobre que se ao aos à às ou mas como mais menos muito já não sim seu sua seus suas este esta esse essa isso isto ele ela eles elas entre até após antes depois contra desde pelo pela pelos pelas tem têm há foi ser são está estão vai vão diz dizem".split(
      " "
    );

  function normalizar(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escaparRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Regex que acha `termo` no texto ignorando acento e caixa (mapa por letra). */
  function regexTermo(termo) {
    var mapa = {
      a: "[aáàâãä]",
      e: "[eéèêë]",
      i: "[iíìîï]",
      o: "[oóòôõö]",
      u: "[uúùûü]",
      c: "[cç]",
      n: "[nñ]",
    };
    var corpo = normalizar(termo)
      .split("")
      .map(function (ch) {
        if (ch === " ") return "[\\s\\u00a0]+";
        return mapa[ch] || escaparRegex(ch);
      })
      .join("");
    return new RegExp("(^|[^\\p{L}\\p{N}])(" + corpo + ")(?![\\p{L}\\p{N}])", "iu");
  }

  /** Frases de 2 a 4 palavras do título, sem stopword nas pontas. */
  function frasesDoTitulo(titulo) {
    var palavras = normalizar(titulo)
      .split(" ")
      .filter(function (p) {
        return p.length > 1;
      });
    var frases = [];
    for (var tam = 4; tam >= 2; tam--) {
      for (var i = 0; i + tam <= palavras.length; i++) {
        var fatia = palavras.slice(i, i + tam);
        if (STOPWORDS.indexOf(fatia[0]) >= 0 || STOPWORDS.indexOf(fatia[fatia.length - 1]) >= 0) continue;
        var frase = fatia.join(" ");
        if (frase.length >= MIN_TERMO + 3 && TAGS_GENERICAS.indexOf(frase) < 0) frases.push(frase);
      }
    }
    return frases;
  }

  function lerRelacionadas() {
    var lista = document.getElementById("hmt-links-internos");
    if (!lista) return [];
    return Array.prototype.map.call(lista.querySelectorAll("[data-url]"), function (li) {
      return {
        url: li.getAttribute("data-url"),
        titulo: li.getAttribute("data-titulo") || "",
        tags: (li.getAttribute("data-tags") || "").split("|").filter(Boolean),
      };
    });
  }

  function candidatos(relacionadas, textoCorpo) {
    var normal = normalizar(textoCorpo);
    var termos = [];
    var urlsUsadas = {};
    // 1) frases do título (mais específicas primeiro: mais longas)
    relacionadas.forEach(function (r) {
      var frases = frasesDoTitulo(r.titulo).filter(function (f) {
        return normal.indexOf(f) >= 0;
      });
      if (frases.length && !urlsUsadas[r.url]) {
        urlsUsadas[r.url] = true;
        termos.push({ termo: frases[0], url: r.url, titulo: r.titulo, peso: frases[0].length + 100 });
      }
    });
    // 2) tags específicas → matéria relacionada mais recente com aquela tag
    var tagsVistas = {};
    relacionadas.forEach(function (r) {
      r.tags.forEach(function (tag) {
        var n = normalizar(tag);
        if (n.length < MIN_TERMO || TAGS_GENERICAS.indexOf(n) >= 0 || tagsVistas[n]) return;
        if (normal.indexOf(n) < 0 || urlsUsadas[r.url]) return;
        tagsVistas[n] = true;
        urlsUsadas[r.url] = true;
        termos.push({ termo: tag, url: r.url, titulo: r.titulo, peso: n.length });
      });
    });
    termos.sort(function (a, b) {
      return b.peso - a.peso;
    });
    return termos;
  }

  var PROIBIDOS = "a, h1, h2, h3, h4, h5, h6, blockquote, figure, figcaption, code, pre, .kg-card, .usat-ad, .ad, [data-hmt-anuncio]";

  function nosDeTexto(corpo) {
    var walker = document.createTreeWalker(corpo, NodeFilter.SHOW_TEXT, {
      acceptNode: function (no) {
        if (!no.nodeValue || !no.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var pai = no.parentElement;
        if (!pai || pai.closest(PROIBIDOS)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var nos = [];
    while (walker.nextNode()) nos.push(walker.currentNode);
    return nos;
  }

  function ligar(corpo, cand) {
    var re = regexTermo(cand.termo);
    var nos = nosDeTexto(corpo);
    for (var i = 0; i < nos.length; i++) {
      var no = nos[i];
      var paragrafo = no.parentElement.closest("p, li");
      if (paragrafo && paragrafo.hasAttribute("data-hmt-linkado")) continue;
      var m = re.exec(no.nodeValue);
      if (!m) continue;
      var inicio = m.index + m[1].length;
      var fim = inicio + m[2].length;
      var a = document.createElement("a");
      a.className = "hmt-link-interno";
      a.href = cand.url;
      a.title = "Leia também: " + cand.titulo;
      a.setAttribute("data-hmt-termo", cand.termo);
      var meio = no.splitText(inicio);
      meio.splitText(fim - inicio);
      a.appendChild(document.createTextNode(meio.nodeValue));
      meio.parentNode.replaceChild(a, meio);
      if (paragrafo) paragrafo.setAttribute("data-hmt-linkado", "1");
      return true;
    }
    return false;
  }

  function executar() {
    var corpo = document.querySelector(".usat-article-content");
    if (!corpo || corpo.hasAttribute("data-hmt-links-ok")) return;
    var relacionadas = lerRelacionadas();
    if (!relacionadas.length) return;
    var lista = candidatos(relacionadas, corpo.textContent);
    var feitos = 0;
    for (var i = 0; i < lista.length && feitos < MAX_LINKS; i++) {
      if (ligar(corpo, lista[i])) feitos++;
    }
    corpo.setAttribute("data-hmt-links-ok", String(feitos));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", executar);
  else executar();

  // exposto para teste
  window.hmtLinksInternos = { executar: executar, candidatos: candidatos, frasesDoTitulo: frasesDoTitulo, normalizar: normalizar };
})();
