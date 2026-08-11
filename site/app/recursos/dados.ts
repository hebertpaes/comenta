/**
 * Conteúdo das páginas de recurso (/recursos/[slug]).
 *
 * Cada item descreve algo que a plataforma entrega HOJE — mesma regra dos cards
 * da home. Quando um detalhe ainda não existe, ele fica em `emBreve`, separado
 * do resto, em vez de misturado com o que já funciona.
 */

export type Recurso = {
  slug: string;
  icone: string;
  titulo: string;
  chamada: string;
  /** Resumo de uma linha, usado na lista e na meta description. */
  resumo: string;
  gradiente: string;
  /** Blocos "o que é / como funciona". */
  blocos: { titulo: string; texto: string }[];
  /** Itens curtos verificáveis no produto. */
  destaques: string[];
  emBreve?: string[];
};

export const RECURSOS: Recurso[] = [
  {
    slug: "whatsapp",
    icone: "🟢",
    titulo: "WhatsApp",
    chamada: "Vários números, uma caixa de entrada",
    resumo:
      "Conecte por QR Code os números que você já usa e atenda todos no mesmo lugar, com a equipe inteira.",
    gradiente: "from-emerald-500 to-teal-600",
    blocos: [
      {
        titulo: "Conecta em um minuto",
        texto:
          "Você lê um QR Code no painel, igual ao WhatsApp Web, e pronto. Não precisa de número novo, de aprovação da Meta nem de migrar contato. Cada número conectado vira uma conexão independente — a empresa pode ter quantos quiser ao mesmo tempo.",
      },
      {
        titulo: "A equipe toda atende junto",
        texto:
          "Um número de WhatsApp só abre em um celular por vez. No Comenta, a mesma conexão serve toda a equipe: as conversas entram em filas por departamento, cada atendente assume a sua, e ninguém precisa passar o aparelho de mão em mão.",
      },
      {
        titulo: "A agenda vem junto",
        texto:
          "Ao parear o número, o Comenta importa a agenda do aparelho — com o nome que você já usa para cada pessoa. Nomes digitados na plataforma nunca são sobrescritos pela sincronização: só o genérico (“Contato 5511…”) é corrigido.",
      },
    ],
    destaques: [
      "Conexão por QR Code, sem número novo",
      "Vários números simultâneos por empresa",
      "Sessão restaurada sozinha depois de reiniciar",
      "Importação da agenda do aparelho",
      "Cada mensagem enviada fica registrada na conversa",
    ],
  },
  {
    slug: "instagram",
    icone: "📸",
    titulo: "Instagram e Messenger",
    chamada: "O Direct e o Messenger na mesma fila do WhatsApp",
    resumo:
      "Mensagens do Instagram Direct e do Facebook Messenger caem na mesma caixa de entrada, com as mesmas filas, tags e automações.",
    gradiente: "from-fuchsia-500 to-purple-600",
    blocos: [
      {
        titulo: "Um canal, não um aplicativo à parte",
        texto:
          "O Direct costuma ser o canal mais esquecido: fica no celular de alguém, sem histórico e sem responsável. Aqui ele é uma fila como qualquer outra — a mesma tela, as mesmas tags, o mesmo kanban e as mesmas respostas rápidas que a equipe já usa no WhatsApp.",
      },
      {
        titulo: "Como conectar",
        texto:
          "Os dois canais passam pela página do Facebook à qual a conta está ligada. Você cola no painel o ID e o token da página; o Comenta assina o webhook da Meta e as mensagens começam a chegar. A conta do Instagram precisa ser profissional (comercial ou de criador).",
      },
      {
        titulo: "Automação vale aqui também",
        texto:
          "Toda automação que funciona no WhatsApp funciona no Direct: resposta automática fora do horário, distribuição por fila, etiqueta por assunto e o robô de autoatendimento com IA. Quem manda “qual o preço?” à meia-noite recebe resposta à meia-noite.",
      },
    ],
    destaques: [
      "Instagram Direct com entrega real, não só encaixe",
      "Facebook Messenger na mesma caixa",
      "Webhook da Meta com assinatura verificada",
      "Mesmas filas, tags, kanban e automações do WhatsApp",
      "O contato é reconhecido quando volta a escrever",
    ],
  },
  {
    slug: "campanhas",
    icone: "📣",
    titulo: "Campanhas e disparos em massa",
    chamada: "Disparo em massa sem queimar o número",
    resumo:
      "Envie para toda a base ou para uma tag, com ritmo humano: intervalo sorteado, lotes com descanso, teto diário e horário comercial.",
    gradiente: "from-pink-500 to-rose-600",
    blocos: [
      {
        titulo: "O problema do disparo em massa",
        texto:
          "Mandar a mesma mensagem para mil pessoas em dez minutos é a receita mais rápida para o WhatsApp bloquear o número — e, quando bloqueia, você perde o canal inteiro, não só a campanha. A diferença entre um disparo que funciona e um que derruba a operação é o ritmo.",
      },
      {
        titulo: "Ritmo que imita gente",
        texto:
          "Cada envio espera um tempo sorteado entre um mínimo e um máximo que você define (o padrão é 5 a 15 segundos). A cada lote — 30 mensagens, por padrão — a campanha descansa alguns minutos. A ordem dos destinatários é embaralhada, então dois disparos nunca seguem a mesma sequência.",
      },
      {
        titulo: "Limites que respeitam o relógio",
        texto:
          "Dá para pôr um teto de mensagens por dia e restringir ao horário comercial. Ao bater o limite ou passar do expediente, a campanha não falha: ela pausa sozinha, se reagenda e retoma de onde parou na próxima abertura — sem ninguém precisar acompanhar.",
      },
      {
        titulo: "Mensagem que parece escrita para a pessoa",
        texto:
          "Use {nome} no texto e cada contato recebe o próprio nome. Dá para anexar imagem ou arquivo, com a mensagem virando legenda. E todo envio fica registrado na conversa do contato — quando a pessoa responde, o atendente vê o que foi mandado.",
      },
    ],
    destaques: [
      "Público por tag ou toda a base com telefone",
      "Intervalo aleatório entre mensagens",
      "Lotes com pausa e ordem embaralhada",
      "Teto diário e janela de horário comercial",
      "Imagem ou arquivo com legenda",
      "Agendamento com data e hora",
      "Progresso ao vivo, com cancelamento no meio",
    ],
  },
  {
    slug: "robos-ia",
    icone: "🤖",
    titulo: "Robôs de autoatendimento com IA",
    chamada: "Responde sozinho — e sabe a hora de chamar uma pessoa",
    resumo:
      "Um robô com a IA da Anthropic responde as dúvidas repetidas e entrega a conversa para a equipe no momento em que o caso pede.",
    gradiente: "from-violet-500 to-indigo-600",
    blocos: [
      {
        titulo: "Não é uma árvore de menu",
        texto:
          "Nada de “digite 1 para vendas”. O robô lê o que a pessoa escreveu, junto com o histórico recente da conversa, e responde em português normal — com o contexto do seu negócio que você configurou.",
      },
      {
        titulo: "O handoff é o que importa",
        texto:
          "Robô bom é o que sabe desistir. Quando o cliente pede um atendente — em qualquer forma de dizer — a conversa vai imediatamente para a fila humana, mesmo que a IA esteja indisponível naquele momento. O mesmo vale quando o assunto sai do que ele foi instruído a responder.",
      },
      {
        titulo: "Você continua no controle",
        texto:
          "O robô é uma automação que você liga, escolhendo em quais filas atua e em que horário. Tudo que ele responde fica na conversa, visível para a equipe. E a sugestão de resposta para o atendente é outra coisa: essa nunca é enviada sozinha — sai só quando alguém clica.",
      },
    ],
    destaques: [
      "Resposta com o histórico da conversa como contexto",
      "Passagem para humano no pedido do cliente",
      "Ativo por fila e por horário",
      "Classificação, resumo e sugestão de resposta",
      "Modelos configuráveis (Haiku para volume, Sonnet para redação)",
      "Sem chave de IA, o resto da plataforma segue funcionando",
    ],
  },
  {
    slug: "marketing",
    icone: "🎯",
    titulo: "Marketing e relacionamento",
    chamada: "Da primeira mensagem à avaliação depois da venda",
    resumo:
      "Widget no site, base segmentada por tags, campanhas segmentadas e pesquisa de satisfação — o ciclo inteiro no mesmo lugar.",
    gradiente: "from-amber-500 to-orange-600",
    blocos: [
      {
        titulo: "Capte no seu site",
        texto:
          "O widget de chat é uma linha de código no seu site. Quem está lendo sua página fala com você ali mesmo, e a conversa entra na mesma caixa de entrada — sem formulário que vira e-mail que ninguém lê.",
      },
      {
        titulo: "Segmente com tags",
        texto:
          "Marque contatos por interesse, origem ou estágio. As tags viram público de campanha: em vez de disparar para a base inteira, você fala com quem faz sentido — o que melhora a resposta e reduz o risco de bloqueio.",
      },
      {
        titulo: "Meça o que aconteceu depois",
        texto:
          "Ao resolver a conversa, o cliente recebe a pesquisa de satisfação e a nota volta sozinha para o painel. Junto com as métricas de tempo de resposta e volume por canal, é o que mostra se a operação melhorou ou só ficou mais movimentada.",
      },
    ],
    destaques: [
      "Widget de chat para colar no site",
      "Tags para segmentar a base",
      "Campanhas por segmento, com agendamento",
      "Pesquisa de satisfação automática ao resolver",
      "Métricas por canal, fila e atendente",
      "Importação de contatos por planilha",
    ],
  },
  {
    slug: "automacoes",
    icone: "⚙️",
    titulo: "Automações e integrações",
    chamada: "Regras que trabalham quando ninguém está olhando",
    resumo:
      "Resposta fora do horário, distribuição por fila, etiquetas automáticas, webhooks assinados e API REST.",
    gradiente: "from-sky-500 to-blue-600",
    blocos: [
      {
        titulo: "Regras no atendimento",
        texto:
          "Mensagem que chega fora do expediente recebe aviso na hora, em vez de silêncio até o dia seguinte. Conversa nova cai na fila certa. Assunto recorrente ganha etiqueta sem ninguém marcar. São regras que você liga no painel, não código.",
      },
      {
        titulo: "Seu sistema fica sabendo",
        texto:
          "Webhooks avisam seu CRM ou ERP quando chega mensagem, abre conversa ou muda o status. As entregas são assinadas com HMAC — seu servidor confere que veio mesmo do Comenta — e reentregues por uma fila quando o destino está fora do ar.",
      },
      {
        titulo: "API para o resto",
        texto:
          "Uma API REST com chaves por empresa cobre contatos, conversas, mensagens e campanhas. Dá para abrir conversa a partir do seu sistema, sincronizar a base ou disparar campanha por código.",
      },
    ],
    destaques: [
      "Resposta automática fora do horário",
      "Distribuição por fila e etiquetagem automática",
      "Webhooks com assinatura HMAC e retentativa em fila",
      "API REST com chave por empresa",
      "Eventos em tempo real por WebSocket",
      "Registro de auditoria das ações do painel",
    ],
  },
];

export const bySlug = (slug: string) => RECURSOS.find((r) => r.slug === slug);
