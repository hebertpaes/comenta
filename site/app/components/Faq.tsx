import React from "react";

/**
 * Perguntas frequentes.
 *
 * Usa `<details>` nativo em vez de estado em React: o accordion funciona sem
 * JavaScript, o teclado e o leitor de tela já sabem operá-lo, e o conteúdo
 * continua no HTML — que é o que o Google indexa. Um accordion controlado por
 * `useState` esconderia as respostas de quem chega pela busca.
 *
 * As respostas descrevem o que a plataforma faz HOJE. Canal marcado como "em
 * breve" na home continua "em breve" aqui.
 */

const PERGUNTAS: { p: string; r: React.ReactNode }[] = [
  {
    p: "Preciso de um número novo para conectar o WhatsApp?",
    r: (
      <>
        Não. Você conecta o número que já usa lendo um QR Code, do mesmo jeito que o WhatsApp Web.
        Dá para ligar <strong>vários números ao mesmo tempo</strong> — cada um vira uma conexão, e
        as mensagens de todos caem na mesma caixa de entrada.
      </>
    ),
  },
  {
    p: "Meu número pode ser bloqueado se eu disparar campanhas?",
    r: (
      <>
        Pode, se você disparar rápido demais — e é exatamente o que o Comenta evita. As campanhas
        enviam com intervalo sorteado entre uma mensagem e outra, em lotes com descanso, com teto
        diário opcional e ordem embaralhada. Dá para limitar ao horário comercial: fora dele a
        campanha pausa sozinha e retoma na abertura seguinte. Veja em{" "}
        <a href="/recursos/campanhas" className="text-fuchsia-600 hover:underline">
          campanhas
        </a>
        .
      </>
    ),
  },
  {
    p: "O que a IA faz exatamente?",
    r: (
      <>
        Três coisas no atendimento do dia a dia: <strong>classifica</strong> cada conversa nova
        (assunto, urgência, sentimento), <strong>resume</strong> históricos longos para quem assume
        o atendimento entender na hora, e <strong>sugere</strong> a resposta para você revisar antes
        de enviar. Há ainda o robô de autoatendimento, que responde sozinho e passa para uma pessoa
        quando o caso pede.
      </>
    ),
  },
  {
    p: "A IA responde no lugar da minha equipe sem eu querer?",
    r: (
      <>
        Não. A sugestão de resposta só é enviada quando alguém clica. O robô de autoatendimento é
        uma automação que <strong>você liga</strong>, escolhendo em quais filas ele atua — e ele
        entrega a conversa para uma pessoa assim que o cliente pede um atendente ou o assunto sai do
        que ele sabe responder.
      </>
    ),
  },
  {
    p: "Preciso de chave da Anthropic para usar a plataforma?",
    r: (
      <>
        Só para os recursos de IA. Sem a chave, todo o resto — canais, caixa de entrada, filas,
        kanban, campanhas, automações que não usam IA — funciona normalmente. O painel avisa quando
        a IA está indisponível em vez de falhar em silêncio.
      </>
    ),
  },
  {
    p: "Como funciona o Instagram e o Messenger?",
    r: (
      <>
        Os dois passam pela página do Facebook à qual a conta está ligada: você cola no painel o ID
        e o token da página, e as mensagens começam a chegar na mesma caixa de entrada. A conta do
        Instagram precisa ser <strong>profissional</strong> (comercial ou de criador) e estar
        vinculada a uma página.
      </>
    ),
  },
  {
    p: "Dá para conectar com o meu sistema?",
    r: (
      <>
        Sim. Há uma API REST com chaves por empresa e webhooks assinados (HMAC) com fila de
        retentativa — seu sistema é avisado quando chega mensagem, abre conversa ou muda o status.
        Os detalhes estão na{" "}
        <a href="/docs" className="text-fuchsia-600 hover:underline">
          documentação
        </a>
        .
      </>
    ),
  },
  {
    p: "E o Telegram e o e-mail?",
    r: (
      <>
        Aparecem no painel, mas ainda <strong>não entregam mensagem</strong> — o encaixe está pronto
        e a entrega vem a seguir. Preferimos dizer isso agora a você descobrir no primeiro dia de
        uso.
      </>
    ),
  },
];

export default function Faq() {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
      {PERGUNTAS.map((item) => (
        <details
          key={item.p}
          className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
            {item.p}
            <span className="flex-none text-fuchsia-500 transition-transform group-open:rotate-45">
              ＋
            </span>
          </summary>
          <div className="mt-3 text-slate-600">{item.r}</div>
        </details>
      ))}
    </div>
  );
}
