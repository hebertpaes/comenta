import type { Metadata } from "next";
import React from "react";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";

/**
 * Documentação pública.
 *
 * Escrita a partir das rotas que existem em saas/api/src/modules — não de um
 * roteiro do que a API deveria ter. Rota citada aqui é rota que responde; se
 * uma sumir do código, some daqui também.
 */

export const metadata: Metadata = {
  title: "Documentação — Comenta",
  description:
    "Primeiros passos, conexão de canais, campanhas, automações, API REST e webhooks do Comenta.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.comenta.com.br";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

const SUMARIO = [
  { href: "#comecar", label: "Primeiros passos" },
  { href: "#canais", label: "Conectar canais" },
  { href: "#atendimento", label: "Atender" },
  { href: "#campanhas", label: "Campanhas" },
  { href: "#automacoes", label: "Automações e IA" },
  { href: "#api", label: "API REST" },
  { href: "#webhooks", label: "Webhooks" },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-5 text-sm leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

function Secao({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-slate-200 pt-12">
      <h2 className="text-2xl font-extrabold sm:text-3xl">{titulo}</h2>
      <div className="mt-5 space-y-4 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function Rota({ metodo, caminho, desc }: { metodo: string; caminho: string; desc: string }) {
  const cor =
    metodo === "GET"
      ? "bg-sky-100 text-sky-700"
      : metodo === "DELETE"
        ? "bg-rose-100 text-rose-700"
        : metodo === "PATCH"
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700";
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3 align-top">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${cor}`}>{metodo}</span>
      </td>
      <td className="py-2 pr-4 align-top font-mono text-sm text-slate-800">{caminho}</td>
      <td className="py-2 align-top text-sm text-slate-600">{desc}</td>
    </tr>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <SiteNav />

      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Documentação</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Do primeiro login à integração por API. Tudo aqui descreve o que a plataforma faz hoje.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl gap-12 px-4 py-14">
        {/* Sumário lateral */}
        <aside className="hidden w-56 flex-none lg:block">
          <nav className="sticky top-24 space-y-1 text-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Nesta página
            </div>
            {SUMARIO.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="block rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-14">
          <Secao id="comecar" titulo="Primeiros passos">
            <p>
              Crie a conta em{" "}
              <a href={APP_URL} className="text-fuchsia-600 hover:underline">
                {APP_URL.replace(/^https?:\/\//, "")}
              </a>
              . O primeiro cadastro cria a <strong>empresa</strong> e o primeiro usuário, já como
              administrador. Administrador configura canais, filas, automações e equipe; atendente
              só atende.
            </p>
            <ol className="ml-5 list-decimal space-y-2">
              <li>Crie a empresa e o usuário administrador.</li>
              <li>
                Conecte um canal em <strong>Conexões</strong> — o WhatsApp é o caminho mais curto.
              </li>
              <li>
                Crie as filas em <strong>Filas</strong> (vendas, suporte, financeiro) e distribua a
                equipe.
              </li>
              <li>
                Convide os atendentes em <strong>Equipe</strong>.
              </li>
            </ol>
          </Secao>

          <Secao id="canais" titulo="Conectar canais">
            <h3 className="pt-2 text-lg font-bold text-slate-900">WhatsApp</h3>
            <p>
              Em <strong>Conexões → WhatsApp</strong>, crie a conexão e leia o QR Code com o celular
              (WhatsApp → Aparelhos conectados). A sessão fica salva: reiniciar o servidor não
              obriga a parear de novo. Uma empresa pode ter vários números ao mesmo tempo, cada um
              com sua conexão.
            </p>
            <p>
              Depois de parear, use <strong>Sincronizar contatos</strong> para importar a agenda do
              aparelho. Nomes que alguém digitou na plataforma não são sobrescritos — só o genérico
              (“Contato 5511…”) é corrigido.
            </p>

            <h3 className="pt-4 text-lg font-bold text-slate-900">Instagram Direct e Messenger</h3>
            <p>
              Os dois passam pela <strong>página do Facebook</strong> à qual a conta está ligada. No
              painel da Meta, gere o token da página; no Comenta, cole o ID e o token da página (e,
              no Instagram, o ID da conta). A conta do Instagram precisa ser profissional —
              comercial ou de criador — e estar vinculada à página.
            </p>
            <p>
              O webhook da Meta é verificado por assinatura: o Comenta confere o HMAC de cada
              entrega antes de aceitar a mensagem.
            </p>

            <h3 className="pt-4 text-lg font-bold text-slate-900">Chat do site</h3>
            <p>
              O widget já vem ativo. Copie o trecho em <strong>Configurações → Widget</strong> e
              cole no seu site — as conversas entram na mesma caixa de entrada.
            </p>

            <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Telegram e e-mail:</strong> aparecem no painel, mas ainda não entregam
              mensagem. O encaixe está pronto; a entrega vem a seguir.
            </p>
          </Secao>

          <Secao id="atendimento" titulo="Atender">
            <p>
              Toda mensagem que chega vira uma <strong>conversa</strong>, ligada a um contato e a
              uma fila. O atendente assume, responde e resolve. O kanban mostra as mesmas conversas
              em colunas — arrastar entre elas muda o status.
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Respostas rápidas:</strong> atalhos para o texto que a equipe repete o dia
                inteiro.
              </li>
              <li>
                <strong>Tags:</strong> marcam o assunto e depois viram público de campanha.
              </li>
              <li>
                <strong>Notas internas:</strong> recados que só a equipe vê — o cliente nunca
                enxerga.
              </li>
              <li>
                <strong>Avaliação:</strong> ao resolver, o cliente recebe a pesquisa e a nota volta
                para o painel.
              </li>
            </ul>
          </Secao>

          <Secao id="campanhas" titulo="Campanhas">
            <p>
              Em <strong>Campanhas</strong>, escolha o público (toda a base com telefone ou uma
              tag), escreva a mensagem, opcionalmente anexe uma imagem ou arquivo e defina o ritmo
              do envio. Use <code className="rounded bg-slate-100 px-1.5 py-0.5">{"{nome}"}</code>{" "}
              para personalizar com o nome do contato.
            </p>
            <p>
              O painel de <strong>ritmo do envio</strong> é o que protege o número. Os padrões são
              conservadores de propósito:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>intervalo sorteado entre 5 e 15 segundos por mensagem;</li>
              <li>lotes de 30 mensagens com 3 minutos de descanso;</li>
              <li>ordem dos destinatários embaralhada;</li>
              <li>teto diário opcional e janela de horário comercial opcional.</li>
            </ul>
            <p>
              Ao bater o limite diário ou sair do horário comercial, a campanha se reagenda sozinha
              e retoma de onde parou — nenhum destinatário é enviado duas vezes.
            </p>
          </Secao>

          <Secao id="automacoes" titulo="Automações e IA">
            <p>
              Automações são regras que você liga em <strong>Automações</strong>. As mais usadas:
              aviso fora do horário comercial, distribuição por fila e o robô de autoatendimento com
              IA.
            </p>
            <p>
              O robô responde com o histórico recente da conversa como contexto e{" "}
              <strong>entrega para uma pessoa</strong> quando o cliente pede um atendente — isso
              funciona mesmo sem chave de IA configurada, porque é comparação de texto, não modelo.
            </p>
            <p>
              A IA da Anthropic (Claude) cobre ainda classificação, resumo e sugestão de resposta. A
              sugestão nunca é enviada sozinha: sai quando o atendente clica. Sem a chave, o resto
              da plataforma funciona normalmente e o painel avisa que a IA está indisponível.
            </p>
          </Secao>

          <Secao id="api" titulo="API REST">
            <p>
              Base: <code className="rounded bg-slate-100 px-1.5 py-0.5">{API_URL}</code>. Há duas
              formas de autenticar:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Chave de API</strong> (integrações): cabeçalho{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5">X-API-Key</code>. Crie em{" "}
                <strong>Configurações → Chaves de API</strong>. A chave aparece uma única vez.
              </li>
              <li>
                <strong>Token JWT</strong> (o que o painel usa): cabeçalho{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5">
                  Authorization: Bearer &lt;token&gt;
                </code>
                , obtido no login e renovável em{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5">/auth/refresh</code>.
              </li>
            </ul>

            <Code>{`curl -X POST ${API_URL}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"voce@empresa.com.br","password":"sua-senha"}'

# Com chave de API, sem login:
curl ${API_URL}/conversations \\
  -H "X-API-Key: $COMENTA_API_KEY"`}</Code>

            <p className="pt-4">Um recorte das rotas mais usadas:</p>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full">
                <tbody>
                  <Rota metodo="POST" caminho="/auth/signup" desc="Cria empresa e administrador" />
                  <Rota metodo="POST" caminho="/auth/login" desc="Autentica e devolve os tokens" />
                  <Rota metodo="GET" caminho="/auth/me" desc="Dados do usuário autenticado" />
                  <Rota metodo="GET" caminho="/contacts" desc="Lista contatos (paginado)" />
                  <Rota metodo="POST" caminho="/contacts" desc="Cria contato" />
                  <Rota metodo="GET" caminho="/conversations" desc="Lista conversas" />
                  <Rota
                    metodo="GET"
                    caminho="/conversations/:id"
                    desc="Conversa com contato, mensagens e tags"
                  />
                  <Rota
                    metodo="PATCH"
                    caminho="/conversations/:id"
                    desc="Muda status, fila ou responsável"
                  />
                  <Rota metodo="GET" caminho="/channels" desc="Conexões e catálogo de canais" />
                  <Rota
                    metodo="POST"
                    caminho="/channels/:id/connect"
                    desc="Inicia a conexão (QR no WhatsApp)"
                  />
                  <Rota
                    metodo="POST"
                    caminho="/channels/:id/sync-contacts"
                    desc="Importa a agenda do aparelho"
                  />
                  <Rota metodo="GET" caminho="/campaigns" desc="Campanhas e público disponível" />
                  <Rota metodo="POST" caminho="/campaigns" desc="Cria campanha" />
                  <Rota metodo="POST" caminho="/campaigns/:id/send" desc="Dispara agora" />
                  <Rota metodo="POST" caminho="/campaigns/:id/cancel" desc="Cancela o disparo" />
                  <Rota metodo="GET" caminho="/dashboard/metrics" desc="Métricas do painel" />
                  <Rota metodo="GET" caminho="/webhooks" desc="Webhooks cadastrados" />
                </tbody>
              </table>
            </div>

            <p className="pt-4">
              Erros vêm com o status HTTP correto e um corpo{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">{'{ "error": "..." }'}</code>. As
              listas grandes são paginadas em{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">{"{ data, meta }"}</code>.
            </p>
          </Secao>

          <Secao id="webhooks" titulo="Webhooks">
            <p>
              Cadastre a URL do seu sistema em <strong>Configurações → Webhooks</strong> e escolha
              os eventos. Hoje são três:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <code className="rounded bg-slate-100 px-1.5 py-0.5">conversation.created</code>
              </li>
              <li>
                <code className="rounded bg-slate-100 px-1.5 py-0.5">message.created</code>
              </li>
              <li>
                <code className="rounded bg-slate-100 px-1.5 py-0.5">conversation.updated</code>
              </li>
            </ul>
            <p>
              Cada entrega leva o cabeçalho{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">X-Comenta-Signature</code> no
              formato{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">sha256=&lt;hmac&gt;</code>,
              calculado sobre o corpo cru com o segredo do webhook. Confira a assinatura antes de
              confiar no conteúdo — é o que impede alguém de forjar uma entrega:
            </p>

            <Code>{`import crypto from "node:crypto";

app.post("/comenta", express.raw({ type: "application/json" }), (req, res) => {
  const esperado =
    "sha256=" +
    crypto.createHmac("sha256", process.env.COMENTA_WEBHOOK_SECRET)
      .update(req.body)          // o corpo CRU, não o JSON reserializado
      .digest("hex");

  const recebido = req.header("X-Comenta-Signature") ?? "";
  const ok =
    esperado.length === recebido.length &&
    crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));

  if (!ok) return res.sendStatus(401);

  const evento = JSON.parse(req.body.toString());
  // ... trate o evento
  res.sendStatus(200);
});`}</Code>

            <p className="pt-2">
              Entregas que falham entram numa fila de retentativa — seu servidor pode ficar fora do
              ar por um tempo sem você perder evento. O histórico de cada entrega, com status e
              resposta, fica no painel.
            </p>
          </Secao>

          <div className="rounded-3xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 p-8 text-white">
            <h2 className="text-xl font-extrabold">Ficou faltando alguma coisa?</h2>
            <p className="mt-2 text-white/90">
              Se a resposta não está aqui, fale com a gente — e a documentação melhora junto.
            </p>
            <a
              href="/contato"
              className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 font-semibold text-fuchsia-700 transition hover:opacity-90"
            >
              Falar com a gente
            </a>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
