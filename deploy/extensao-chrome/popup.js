import { GRUPOS, SERVICOS, urlDe } from "./servicos.js";

const lista = document.getElementById("lista");
const resumo = document.getElementById("resumo");
const campoLan = document.getElementById("lan");

const TIMEOUT_MS = 2500;

/**
 * Sonda um serviço. Qualquer resposta HTTP conta como "no ar" — inclusive 401,
 * 302 ou 404: significa que ALGO atendeu naquela porta, que é o que o hub
 * precisa saber. Só erro de rede (recusa de conexão) é "fora".
 *
 * `cache: "no-store"` evita que o Chrome sirva um 200 velho e mostre verde para
 * um container que já morreu.
 */
async function sondar(servico) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const inicio = performance.now();
  try {
    await fetch(urlDe(servico) + servico.sonda, {
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "manual",
    });
    return { estado: "no-ar", ms: Math.round(performance.now() - inicio) };
  } catch {
    return { estado: "fora", ms: null };
  } finally {
    clearTimeout(timer);
  }
}

function criarCartao(servico) {
  const btn = document.createElement("button");
  btn.className = "servico";
  btn.type = "button";
  btn.dataset.id = servico.id;

  const bolinha = document.createElement("span");
  bolinha.className = "bolinha";
  bolinha.dataset.estado = "checando";

  const info = document.createElement("span");
  info.className = "info";
  const nome = document.createElement("span");
  nome.className = "nome";
  nome.textContent = servico.nome;
  const desc = document.createElement("span");
  desc.className = "descricao";
  desc.textContent = servico.descricao;
  info.append(nome, desc);

  const porta = document.createElement("span");
  porta.className = "porta";
  porta.textContent = String(servico.porta);

  btn.append(bolinha, info, porta);
  btn.addEventListener("click", () => {
    chrome.tabs.create({ url: urlDe(servico) + (servico.abrirEm ?? "") });
  });
  return btn;
}

function montar() {
  lista.replaceChildren();
  for (const grupo of GRUPOS) {
    const doGrupo = SERVICOS.filter((s) => s.grupo === grupo.id);
    if (doGrupo.length === 0) continue;

    const h2 = document.createElement("h2");
    h2.textContent = grupo.titulo;
    lista.append(h2);

    for (const servico of doGrupo) {
      lista.append(criarCartao(servico));
      if (servico.lan) {
        const a = document.createElement("a");
        a.className = "lan-link";
        a.dataset.lanDe = servico.id;
        a.hidden = true;
        lista.append(a);
      }
    }
  }
}

async function verificar() {
  resumo.textContent = "Verificando serviços…";
  for (const el of lista.querySelectorAll(".bolinha")) {
    el.dataset.estado = "checando";
  }

  // Em paralelo: são 8 sondas de rede local, sequencial só somaria espera.
  const resultados = await Promise.all(
    SERVICOS.map(async (s) => ({ servico: s, ...(await sondar(s)) }))
  );

  for (const { servico, estado, ms } of resultados) {
    const cartao = lista.querySelector(`.servico[data-id="${servico.id}"]`);
    if (!cartao) continue;
    cartao.querySelector(".bolinha").dataset.estado = estado;
    cartao.querySelector(".porta").textContent =
      estado === "no-ar" ? `${ms} ms` : String(servico.porta);
    cartao.disabled = estado === "fora";
    cartao.title =
      estado === "no-ar"
        ? `Abrir ${urlDe(servico)}${servico.abrirEm ?? ""}`
        : servico.perfil === "tools"
          ? `Fora do ar. Suba com: docker compose --profile tools up -d ${servico.id}`
          : "Fora do ar.";
  }

  const noAr = resultados.filter((r) => r.estado === "no-ar").length;
  const fora = resultados.length - noAr;
  resumo.textContent =
    fora === 0
      ? `${noAr} de ${resultados.length} no ar — tudo certo.`
      : `${noAr} de ${resultados.length} no ar · ${fora} fora.`;
}

/** Mostra/esconde os links de LAN conforme o IP salvo. */
function aplicarLan(ip) {
  const valido = /^\d{1,3}(\.\d{1,3}){3}$/.test(ip.trim());
  for (const a of lista.querySelectorAll(".lan-link")) {
    const servico = SERVICOS.find((s) => s.id === a.dataset.lanDe);
    if (!servico) continue;
    a.hidden = !valido;
    if (valido) {
      const url = urlDe(servico, ip.trim());
      a.textContent = `📱 ${url}`;
      a.href = url;
      a.target = "_blank";
    }
  }
}

montar();
verificar();

document.getElementById("recarregar").addEventListener("click", verificar);

chrome.storage.local.get({ lanIp: "" }).then(({ lanIp }) => {
  campoLan.value = lanIp;
  aplicarLan(lanIp);
});

campoLan.addEventListener("input", () => {
  const ip = campoLan.value;
  aplicarLan(ip);
  chrome.storage.local.set({ lanIp: ip });
});

document.getElementById("limpar-lan").addEventListener("click", () => {
  campoLan.value = "";
  aplicarLan("");
  chrome.storage.local.set({ lanIp: "" });
});
