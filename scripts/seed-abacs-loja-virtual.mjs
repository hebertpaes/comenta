import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

const LOJA_VIRTUAL_COURSES = [
  { title: "Administrativo Completo", description: "Formação completa em rotinas administrativas, atendimento, faturamento e gestão comercial.", emoji: "💼", price: 99.00 },
  { title: "Curso Preparatório ENEM", description: "Preparatório intensivo para o Exame Nacional do Ensino Médio com redação e simulados.", emoji: "🎓", price: 99.00 },
  { title: "Criação de Game", description: "Desenvolvimento de jogos 2D e 3D do zero usando engines modernas.", emoji: "🎮", price: 99.00 },
  { title: "Pacote Office Pro", description: "Dominando Word, Excel Avançado, PowerPoint e ferramentas corporativas.", emoji: "📊", price: 99.00 },
  { title: "Design Gráfico", description: "Criação de marcas, peças publicitárias, Photoshop e Illustrator profissional.", emoji: "🎨", price: 99.00 },
  { title: "Marketing Digital", description: "Tráfego pago, SEO, mídias sociais, copy e estratégias de vendas online.", emoji: "🚀", price: 99.00 },
  { title: "Curso Hardware", description: "Montagem, manutenção, formatação de computadores e redes de computadores.", emoji: "💻", price: 99.00 },
  { title: "Eletricista com NR-10", description: "Capacitação em instalações elétricas residenciais e industriais com norma de segurança NR-10.", emoji: "⚡", price: 99.00 },
  { title: "Operador de Caixa", description: "Formação profissionalizante em operação de caixa, sangria, Pix e atendimento ao cliente.", emoji: "💳", price: 99.00 },
  { title: "Barbeiro Profissional", description: "Técnicas modernas de corte masculino, barba, degradê e atendimento na barbearia.", emoji: "💈", price: 99.90 },
  { title: "Ponte Rolante", description: "Operação segura de pontes rolantes e movimentação de cargas industriais.", emoji: "🏗️", price: 99.90 },
  { title: "Criação de App Android e iOS", description: "Desenvolvimento de aplicativos mobile nativos e híbridos para smartphones.", emoji: "📱", price: 99.90 },
  { title: "Energia Solar", description: "Dimensionamento e instalação de sistemas fotovoltaicos conectadas à rede.", emoji: "☀️", price: 99.90 },
  { title: "JavaScript", description: "Programação moderna em JS ES6+, manipulação de DOM e lógica de programação.", emoji: "🌐", price: 69.90 },
  { title: "Interactive English", description: "Curso interativo de inglês para conversação e ambiente de trabalho.", emoji: "🗣️", price: 99.90 },
  { title: "Dropshipping", description: "Como criar lojas virtuais sem estoque e vender produtos nacionais e internacionais.", emoji: "📦", price: 69.90 },
  { title: "Canva", description: "Criação de artes para redes sociais, apresentações e materiais gráficos rapidamente.", emoji: "✨", price: 69.90 }
];

async function main() {
  const sql = postgres(DATABASE_URL);
  console.log("=========================================================");
  console.log(" 🛒 SINCRONIZANDO CURSOS DA LOJA VIRTUAL ABACS NO COMENTA");
  console.log("=========================================================");

  try {
    const comp = await sql`SELECT id, name FROM companies LIMIT 1;`;
    if (!comp.length) {
      console.log("❌ Nenhuma empresa encontrada.");
      await sql.end();
      return;
    }
    const companyId = comp[0].id;
    console.log(`✓ Empresa ativa: "${comp[0].name}" (${companyId})`);

    let count = 0;
    for (const c of LOJA_VIRTUAL_COURSES) {
      const existing = await sql`SELECT id FROM courses WHERE title = ${c.title} AND company_id = ${companyId};`;
      if (!existing.length) {
        const [inserted] = await sql`
          INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
          VALUES (${companyId}, ${c.title}, ${c.description}, ${c.emoji}, 'iniciante', true, ${count + 1}, NOW())
          RETURNING id;
        `;
        // Insere aula de exemplo
        await sql`
          INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
          VALUES (${inserted.id}, 'Aula 1: Introdução ao ' || ${c.title}, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Boas-vindas e apresentação do curso.', 20, 1, NOW());
        `;
        count++;
        console.log(` + Cadastrado: "${c.title}" (${c.price})`);
      } else {
        console.log(` - Já existe: "${c.title}"`);
      }
    }

    console.log("=========================================================");
    console.log(`🎉 SUCESSO! ${count} novos cursos da ABACS Loja Virtual cadastrados!`);
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await sql.end();
  }
}

main();
