import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

const KNOWLEDGE_DATA = [
  {
    course: "Operador de Caixa (Curso ID 77)",
    price: "R$ 99,00 à vista (ou parcelado)",
    audience: "Pessoas que buscam o primeiro emprego no comércio, supermercados, lojas e farmácias.",
    syllabus: [
      "Módulo 1: Introdução à Operação de Caixa e Postura Profissional",
      "Módulo 2: Abertura, Sangria e Fechamento de Caixa",
      "Módulo 3: Formas de Pagamento: Cartão de Crédito/Débito, Pix, Dinheiro e Cheque",
      "Módulo 4: Prevenção a Fraudes e Notas Falsas",
      "Módulo 5: Atendimento ao Cliente e Resolução de Conflitos"
    ],
    faqs: [
      { q: "O certificado é reconhecido?", a: "Sim! O certificado é emitido pela Escola Avançada ABACS e tem validade nacional para currículo e horas complementares." },
      { q: "Como recebo o acesso?", a: "Após a aprovação do pagamento no Hotmart, o login no portal https://abacs.org.br/login.php e no WhatsApp é liberado imediatamente." }
    ]
  },
  {
    course: "Administrativo Completo",
    price: "R$ 99,00 à vista",
    audience: "Profissionais que desejam trabalhar em escritórios, recepção e gestão de empresas.",
    syllabus: [
      "Rotinas Administrativas e Organização de Documentos",
      "Noções de Contabilidade e Faturamento",
      "Atendimento Telefônico e Corporativo",
      "Redação Empresarial e E-mails Profissionais"
    ],
    faqs: [
      { q: "Precisa de experiência prévia?", a: "Não, o curso vai do básico ao avançado." }
    ]
  },
  {
    course: "Curso Preparatório ENEM",
    price: "R$ 99,00 à vista",
    audience: "Estudantes do Ensino Médio que pretendem obter nota máxima no ENEM e vestibulares.",
    syllabus: [
      "Redação Nota 1000: Estrutura, Repertório e Competências",
      "Matemática e Suas Tecnologias",
      "Ciências da Natureza (Física, Química e Biologia)",
      "Ciências Humanas e Linguagens"
    ],
    faqs: [
      { q: "Tem simulados inclusos?", a: "Sim, acompanha simulados corrigidos por modelo oficial." }
    ]
  },
  {
    course: "Criação de Game",
    price: "R$ 99,00 à vista",
    audience: "Jovens e entusiastas que querem criar seus próprios jogos 2D e 3D.",
    syllabus: [
      "Lógica de Programação para Games",
      "Design de Fases e Pixel Art",
      "Animações, Física e Colisões",
      "Publicação do Jogo na Steam e Mobile"
    ],
    faqs: [
      { q: "Precisa de computador potente?", a: "Não, as ferramentas ensinadas rodam em computadores básicos." }
    ]
  },
  {
    course: "Pacote Office Pro",
    price: "R$ 99,00 à vista",
    audience: "Todos os profissionais que precisam dominar Word, Excel e PowerPoint no trabalho.",
    syllabus: [
      "Microsoft Word: Formatação ABNT e Documentos Corporativos",
      "Microsoft Excel: Fórmulas PROCV, SE, Tabela Dinâmica e Gráficos",
      "Microsoft PowerPoint: Apresentações de Alto Impacto",
      "Produtividade e Atalhos Rápidos"
    ],
    faqs: [
      { q: "Ensina Excel Avançado?", a: "Sim, inclui fórmulas avançadas e automação de planilhas." }
    ]
  },
  {
    course: "Design Gráfico",
    price: "R$ 99,00 à vista",
    audience: "Pessoas interessadas em trabalhar como designers freelances ou em agências de marketing.",
    syllabus: [
      "Teoria das Cores, Tipografia e Composição Visual",
      "Adobe Photoshop: Tratamento de Fotos e Edição",
      "Adobe Illustrator: Vetorização e Criação de Logotipos",
      "Criação de Identidade Visual Completa"
    ],
    faqs: [
      { q: "Recebo os programas para treinar?", a: "O curso ensina como baixar as versões de teste e alternativas gratuitas." }
    ]
  },
  {
    course: "Marketing Digital",
    price: "R$ 99,00 à vista",
    audience: "Empreendedores e gestores de redes sociais que querem vender na internet.",
    syllabus: [
      "Estratégia de Conteúdo no Instagram e TikTok",
      "Tráfego Pago (Google Ads e Meta Ads)",
      "Copywriting e Técnicas de Persuasão",
      "Funis de Venda e Automação de E-mails"
    ],
    faqs: [
      { q: "Consigo vender produtos próprios?", a: "Sim, ensina a vender produtos físicos, digitais e serviços." }
    ]
  },
  {
    course: "Curso Hardware",
    price: "R$ 99,00 à vista",
    audience: "Técnicos de informática e quem deseja trabalhar com manutenção de computadores.",
    syllabus: [
      "Arquitetura de Processadores, Memórias e Placas-Mãe",
      "Montagem Completa do Computador Passo a Passo",
      "Formatação, Instalação do Windows e Linux",
      "Diagnóstico de Defeitos e Limpeza Preventiva"
    ],
    faqs: [
      { q: "Posso abrir minha própria assistência?", a: "Sim! O curso capacita você para prestar serviços autônomos." }
    ]
  },
  {
    course: "Eletricista com NR-10",
    price: "R$ 99,00 à vista",
    audience: "Pessoas que desejam atuar em instalações elétricas residenciais e prediais com segurança.",
    syllabus: [
      "Grandezas Elétricas: Tensão, Corrente e Potência",
      "Esquemas Elétricos e QDR (Quadro de Distribuição)",
      "Instalação de Tomadas, Interruptores e Disjuntores",
      "Segurança em Instalações com Norma NR-10"
    ],
    faqs: [
      { q: "O certificado tem NR-10 validado?", a: "Sim, cumpre todas as exigências técnicas da norma." }
    ]
  },
  {
    course: "Barbeiro Profissional",
    price: "R$ 99,90 à vista",
    audience: "Quem quer ingressar na profissão de barbeiro ou abrir sua própria barbearia.",
    syllabus: [
      "Cortes Modernos: Fade, Degradê, Pompadour e Social",
      "Design de Barba, Toalha Quente e Desenhados",
      "Biossegurança e Higienização de Lâminas",
      "Gestão Financeira para Barbearias"
    ],
    faqs: [
      { q: "Preciso ter kit de tesouras antes?", a: "Não, nas primeiras aulas você aprende quais ferramentas comprar com o melhor custo-benefício." }
    ]
  },
  {
    course: "Ponte Rolante",
    price: "R$ 99,90 à vista",
    audience: "Operadores industriais para movimentação de cargas pesadas em fábricas.",
    syllabus: [
      "Tipos e Componentes de Pontes Rolantes",
      "Inspeção Pré-Operacional e Cabos de Aço",
      "Sinalização Manual e Amarração de Cargas",
      "Prevenção de Acidentes Industriais"
    ],
    faqs: [
      { q: "Emite carteirinha de operador?", a: "Acompanha o certificado oficial homologado." }
    ]
  },
  {
    course: "Criação de App Android e iOS",
    price: "R$ 99,90 à vista",
    audience: "Programadores e entusiastas que desejam criar apps para smartphones.",
    syllabus: [
      "Interface de Usuário (UI/UX) Mobile",
      "Desenvolvimento de Aplicativos Híbridos",
      "Conexão com Banco de Dados e APIs",
      "Publicação na Google Play Store e Apple App Store"
    ],
    faqs: [
      { q: "Funciona para quem nunca programou?", a: "Sim, começa com conceitos básicos de lógica." }
    ]
  },
  {
    course: "Energia Solar",
    price: "R$ 99,90 à vista",
    audience: "Técnicos e engenheiros interessados no mercado de energia limpa.",
    syllabus: [
      "Princípio de Funcionamento de Painéis Fotovoltaicos",
      "Dimensionamento de Inversores e Baterias",
      "Instalação e Fixação no Telhado",
      "Homologação Junto à Concessionária de Energia"
    ],
    faqs: [
      { q: "O mercado de energia solar é promissor?", a: "É um dos setores com maior crescimento e contratação no Brasil." }
    ]
  },
  {
    course: "JavaScript",
    price: "R$ 69,90 à vista",
    audience: "Estudantes de tecnologia que desejam aprender a linguagem de programação mais popular da web.",
    syllabus: [
      "Variáveis, Funções e Estruturas de Repetição",
      "Manipulação de DOM e Eventos no Navegador",
      "Requisições HTTP com Fetch API e Async/Await",
      "Introdução ao Node.js"
    ],
    faqs: [
      { q: "Dá direito a suporte a dúvidas?", a: "Sim, suporte 24h com a assistente de IA no portal e WhatsApp." }
    ]
  },
  {
    course: "Interactive English",
    price: "R$ 99,90 à vista",
    audience: "Pessoas que querem destravar a conversação em inglês rápido.",
    syllabus: [
      "Inglês no Dia a Dia e Apresentação Pessoal",
      "Vocabulário para Entrevistas de Emprego",
      "Pronúncia Interativa e Escuta Ativa",
      "Expressões Idiomáticas Corporativas"
    ],
    faqs: [
      { q: "As aulas são em áudio e vídeo?", a: "Sim, videoaulas HD com áudios de nativos." }
    ]
  },
  {
    course: "Dropshipping",
    price: "R$ 69,90 à vista",
    audience: "Pessoas que querem montar um negócio online sem estoque inicial.",
    syllabus: [
      "Mineração de Produtos Vencedores",
      "Criação de Loja Virtual Profissional",
      "Fornecedores Nacionais e Internacionais",
      "Anúncios para Vendas Diárias"
    ],
    faqs: [
      { q: "Preciso de dinheiro para comprar estoque?", a: "Não! No dropshipping o cliente compra e o fornecedor envia direto." }
    ]
  },
  {
    course: "Canva",
    price: "R$ 69,90 à vista",
    audience: "Criadores de conteúdo e empreendedores que precisam de artes profissionais rapidamente.",
    syllabus: [
      "Ferramentas e Atalhos do Canva",
      "Criação de Banners, Posts e Stories Animados",
      "Edição de Vídeo Rápida no Canva",
      "Identidade de Marca e Paleta de Cores"
    ],
    faqs: [
      { q: "Funciona na versão gratuita do Canva?", a: "Sim, todas as aulas usam recursos do Canva Grátis." }
    ]
  }
];

async function main() {
  const sql = postgres(DATABASE_URL);
  console.log("=========================================================");
  console.log(" 🧠 GERANDO E INGERINDO CONHECIMENTO DOS 17 CURSOS ABACS");
  console.log("=========================================================");

  try {
    const comp = await sql`SELECT id, name, settings FROM companies LIMIT 1;`;
    if (!comp.length) {
      console.log("❌ Nenhuma empresa encontrada.");
      await sql.end();
      return;
    }
    const companyId = comp[0].id;

    // Monta base de conhecimento estruturada em Markdown
    let kbContent = `# BASE DE CONHECIMENTO OFICIAL DOS 17 CURSOS ESCOLA AVANÇADA ABACS\n\n`;
    kbContent += `Portal de Login do Aluno: https://abacs.org.br/login.php\n`;
    kbContent += `Loja Virtual Completa: https://abacs.org.br/loja_virtual/index.php\n`;
    kbContent += `Atendimento por IA Gemini: Ativo 24h via WhatsApp e Chat\n\n`;

    for (const item of KNOWLEDGE_DATA) {
      kbContent += `## 🎓 Curso: ${item.course}\n`;
      kbContent += `- **Preço**: ${item.price}\n`;
      kbContent += `- **Público-Alvo**: ${item.audience}\n`;
      kbContent += `- **Grade Curricular**:\n`;
      item.syllabus.forEach((s) => (kbContent += `  * ${s}\n`));
      kbContent += `- **Perguntas Frequentes (FAQ)**:\n`;
      item.faqs.forEach((f) => (kbContent += `  * P: ${f.q}\n    R: ${f.a}\n`));
      kbContent += `\n---------------------------------------------------------\n\n`;
    }

    const currentSettings = comp[0].settings || {};
    const updatedSettings = {
      ...currentSettings,
      widgetKnowledge: kbContent,
      aiSystemPrompt: `Você é a Sofia Gemini IA, assistente oficial da Escola Avançada ABACS e Comenta SaaS. Seu objetivo é ajudar alunos, tirar dúvidas sobre os 17 cursos da loja virtual (https://abacs.org.br/loja_virtual/index.php), apresentar preços, grades curriculares e direcionar para matricula em https://abacs.org.br/login.php. Seja sempre educada, prestativa e objetiva.`
    };

    await sql`
      UPDATE companies
      SET settings = ${sql.json(updatedSettings)}
      WHERE id = ${companyId};
    `;

    console.log("✓ Conhecimento dos 17 Cursos ingerido com sucesso!");
    console.log(`✓ Tamanho da Base de Conhecimento: ${kbContent.length} caracteres.`);
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro ao ingerir conhecimento:", err);
  } finally {
    await sql.end();
  }
}

main();
