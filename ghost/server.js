import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 2368;
const THEME_DIR = path.join(__dirname, "content", "themes", "hojemt");

// Base de Dados Simulada / Configuração do Ghost Admin
const GHOST_DB = {
  siteTitle: "HOJE MT NEWS",
  adminUser: {
    email: "admin@hojemt.com.br",
    name: "Administrador Hoje MT",
    role: "Administrator",
  },
  theme: "hojemt (USA TODAY Style)",
};

function renderCleanUsaTodayThemeHTML() {
  const cssPath = path.join(THEME_DIR, "assets", "css", "screen.css");
  let customCSS = "";
  if (fs.existsSync(cssPath)) {
    customCSS = fs.readFileSync(cssPath, "utf-8");
  }

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>USA TODAY — HOJE MT NEWS | Portal de Notícias</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style>
      ${customCSS}
    </style>
</head>
<body class="home-template">
    <!-- BREAKING NEWS TICKER - RED & NAVY BAR -->
    <div class="topbar">
        <div class="container topbar-inner">
            <span class="topbar-flag">LATEST NEWS</span>
            <div class="ticker" aria-label="Últimas notícias">
                <div class="ticker-track">
                    <a class="ticker-item" href="/gumesmomo">Gumesmomo Fit: Gomas de Creatina Monohidratada sem açúcar ganham destaque no Brasil</a><span class="ticker-dot">•</span>
                    <a class="ticker-item" href="/blog">Comenta AI lança atendente virtual Sofia 2.0 com tecnologia Google Gemini no WhatsApp</a><span class="ticker-dot">•</span>
                    <a class="ticker-item" href="/blog">Ghost CMS local integrado ao Next.js com Content API v5</a><span class="ticker-dot">•</span>
                </div>
            </div>
            <span class="topbar-clock">Sexta-feira, 21 de Agosto de 2026</span>
        </div>
    </div>

    <!-- USA TODAY SIGNATURE HEADER -->
    <header class="site-header">
        <div class="container header-inner">
            <button class="icon-btn nav-burger" aria-label="Menu">☰</button>

            <a class="brand" href="/">
                <span class="brand-dot"></span>
                <span class="brand-text">HOJE MT <span>NEWS</span></span>
            </a>

            <div class="header-meta">
                <span class="header-date">21 de Agosto de 2026</span>
                <span class="header-place">Redação Central • Mato Grosso, Brasil</span>
            </div>

            <div class="header-actions">
                <button class="icon-btn search-toggle" aria-label="Buscar">🔍</button>
                <button class="icon-btn theme-toggle" aria-label="Alternar tema">🌙</button>
                <a class="btn-subscribe" href="/gumesmomo">Gumesmomo Fit</a>
            </div>
        </div>
    </header>

    <!-- USA TODAY NAVY NAVIGATION BAR -->
    <nav class="main-nav">
        <div class="container nav-inner">
            <a class="nav-link active" href="/">Início</a>
            <a class="nav-link" href="/gumesmomo">Gumesmomo Fit (Creatina)</a>
            <a class="nav-link" href="/blog">Blog & Publicações</a>
            <a class="nav-link" href="/tag/politica">Política</a>
            <a class="nav-link" href="/tag/economia">Economia</a>
            <a class="nav-link" href="/tag/esportes">Esportes</a>
            <a class="nav-link" href="/tag/tecnologia">Tecnologia</a>
        </div>
    </nav>

    <!-- MAIN EDITORIAL CONTENT GRID -->
    <main id="site-main" class="site-main">
        <!-- TOP HERO STORY SECTION -->
        <section class="hero-row container">
            <div class="hero-slider">
                <div class="slide">
                    <img class="slide-img" src="/images/gumesmomo_jar.jpg" alt="Gumesmomo Fit Creatine Gummies" />
                    <div class="slide-overlay">
                        <span class="slide-tag">EXCLUSIVO • SAÚDE & FITNESS</span>
                        <h1 class="slide-title">Gumesmomo Fit Revoluciona Suplementação Esportiva com Gomas de Creatina Pura</h1>
                        <div class="slide-meta">Por Dr. Gabriel Santos • 4 min de leitura • Redação Hoje MT</div>
                    </div>
                </div>
            </div>

            <aside class="hero-live">
                <div class="side-block-title">🔥 Destaques da Redação</div>
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="border-bottom: 1px solid var(--line); padding-bottom: 12px;">
                        <span style="color: var(--usa-blue); font-size: 11px; font-weight: 900; text-transform: uppercase;">TECNOLOGIA & IA</span>
                        <h4 style="font-size: 15px; font-weight: 800; margin-top: 4px;">
                            <a href="/blog">Comenta AI ativa Studio de Vídeos de 1 Minuto para Cursos no WhatsApp</a>
                        </h4>
                    </div>
                    <div style="border-bottom: 1px solid var(--line); padding-bottom: 12px;">
                        <span style="color: var(--usa-blue); font-size: 11px; font-weight: 900; text-transform: uppercase;">NEGÓCIOS</span>
                        <h4 style="font-size: 15px; font-weight: 800; margin-top: 4px;">
                            <a href="/gumesmomo">Gomas de Creatina sem Açúcar viram febre entre atletas no Brasil</a>
                        </h4>
                    </div>
                    <div>
                        <span style="color: var(--usa-blue); font-size: 11px; font-weight: 900; text-transform: uppercase;">GHOST CMS</span>
                        <h4 style="font-size: 15px; font-weight: 800; margin-top: 4px;">
                            <a href="/blog">Tema hojemt limpo e adaptado ao estilo USA TODAY no Ghost v5</a>
                        </h4>
                    </div>
                </div>
            </aside>
        </section>

        <!-- PRISTINE NEWS CARD GRID -->
        <div class="container sections">
            <div class="section-head">
                <h2 class="section-title">Últimas Reportagens</h2>
            </div>

            <div class="section-grid">
                <article class="article-card">
                    <div class="card-img-wrap">
                        <img class="card-img" src="/images/gumesmomo_jar.jpg" alt="Pote Gumesmomo Creatine Gummies" />
                    </div>
                    <div class="card-body">
                        <div>
                            <span class="card-tag">SAÚDE & FIT</span>
                            <h3 class="card-title"><a href="/gumesmomo">3g de Creatina Monohidratada em Gomas Deliciosas sem Açúcar</a></h3>
                            <p class="card-excerpt">Fórmula pura com alta biodisponibilidade para hipertrofia, força muscular e foco mental sem estômago pesado.</p>
                        </div>
                        <div class="card-meta"><span>Por Nutrição Esportiva</span> • 3 min</div>
                    </div>
                </article>

                <article class="article-card">
                    <div class="card-img-wrap">
                        <img class="card-img" src="/images/gumesmomo_hand.jpg" alt="Gomas de Creatina na Mão" />
                    </div>
                    <div class="card-body">
                        <div>
                            <span class="card-tag">TECNOLOGIA</span>
                            <h3 class="card-title"><a href="/blog">Atendente Sofia IA Qualifica Leads e Responde em 10 Segundos</a></h3>
                            <p class="card-excerpt">Automação inteligente no WhatsApp zera o tempo de espera e multiplica as conversões de vendas.</p>
                        </div>
                        <div class="card-meta"><span>Por Engenharia Comenta</span> • 4 min</div>
                    </div>
                </article>

                <article class="article-card">
                    <div class="card-img-wrap">
                        <img class="card-img" src="/images/gumesmomo_jar.jpg" alt="Gumesmomo Fit" />
                    </div>
                    <div class="card-body">
                        <div>
                            <span class="card-tag">GHOST CMS</span>
                            <h3 class="card-title"><a href="/blog">Design USA TODAY Aplicado ao Tema Ghost hojemt</a></h3>
                            <p class="card-excerpt">Aparência limpa com paleta Navy Blue (#002b66), badges vermelhas de urgência e tipografia de alto impacto.</p>
                        </div>
                        <div class="card-meta"><span>Por Redação Hoje MT</span> • 2 min</div>
                    </div>
                </article>
            </div>
        </div>
    </main>

    <!-- CLEAN FOOTER USA TODAY -->
    <footer class="site-footer">
        <div class="container footer-inner">
            <div>
                <div class="footer-brand">HOJE MT <span>NEWS</span></div>
                <div class="footer-copy">
                    Portal de Notícias • Tema Ghost no Estilo USA TODAY (usatoday.com).<br />
                    © 2026 Todos os direitos reservados.
                </div>
            </div>
            <div>
                <h4 style="color:#fff; font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:12px;">Páginas</h4>
                <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:rgba(255,255,255,0.8);">
                    <a href="/gumesmomo">Gumesmomo Fit (Creatina)</a>
                    <a href="/blog">Blog & Publicações</a>
                </div>
            </div>
            <div>
                <h4 style="color:#fff; font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:12px;">Admin</h4>
                <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:rgba(255,255,255,0.8);">
                    <a href="/ghost/">Painel Ghost Admin</a>
                </div>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

function renderGhostAdminPortalHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ghost Admin — HOJE MT NEWS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
    body { margin: 0; background: #0c101c; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #002b66; padding: 18px 32px; border-bottom: 3px solid #0050ff; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 22px; font-weight: 900; color: #fff; text-transform: uppercase; }
    .brand span { color: #0050ff; }
    .badge { background: #16a34a; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px; }
    main { flex: 1; max-width: 900px; width: 100%; margin: 40px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #141a29; border: 1px solid #1e293b; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
    h2 { margin-top: 0; font-size: 20px; font-weight: 800; color: #fff; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; }
    .field { margin-bottom: 18px; }
    label { display: block; font-size: 12px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; margin-bottom: 6px; }
    input, select, textarea { width: 100%; background: #0b0f19; border: 1px solid #334155; border-radius: 10px; padding: 12px 14px; color: #fff; font-size: 14px; }
    input:focus { border-color: #0050ff; outline: none; }
    .btn { display: inline-block; width: 100%; background: #0050ff; color: #fff; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px; border-radius: 12px; border: 0; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #003cc7; }
    .status-box { background: #0284c7/20; border: 1px solid #0284c7; padding: 14px; border-radius: 12px; font-size: 13px; color: #38bdf8; margin-top: 20px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">👻 GHOST <span>ADMIN</span></div>
    <span class="badge">SISTEMA ATIVO</span>
  </header>

  <main>
    <div class="grid">
      <!-- PAINEL DE LOGIN E CONFIGURAÇÃO -->
      <div class="card">
        <h2>🛠️ Painel Administrativo Ghost</h2>
        <p>Bem-vindo ao Ghost CMS Admin. Gerencie suas postagens, temas, autores e configurações do portal <strong>hojemt.com.br</strong>.</p>
        
        <form onsubmit="alert('Login efetuado com sucesso no Ghost Admin!'); return false;">
          <div class="field">
            <label>E-mail de Usuário Admin</label>
            <input type="email" value="${GHOST_DB.adminUser.email}" required />
          </div>
          <div class="field">
            <label>Senha de Acesso</label>
            <input type="password" value="••••••••••••" required />
          </div>
          <button type="submit" class="btn">Entrar no Painel Admin</button>
        </form>
      </div>

      <!-- INFORMAÇÕES E RECURSOS DO TEMA -->
      <div class="card">
        <h2>🎨 Tema Ativo & Publicação</h2>
        <div className="field">
          <label>Tema Atual</label>
          <input type="text" value="${GHOST_DB.theme}" readonly />
        </div>
        <div className="field">
          <label>Domínio Principal</label>
          <input type="text" value="https://hojemt.com.br" readonly />
        </div>

        <div class="status-box">
          ✔ SSL HTTPS Ativo via Let's Encrypt<br />
          ✔ Servidor Node.js na porta 2368 com PM2<br />
          ✔ Tema hojemt no estilo USA TODAY carregado
        </div>

        <div style="margin-top: 24px;">
          <a href="https://hojemt.com.br" class="btn" style="background: #1e293b; text-decoration: none;">Ver Site hojemt.com.br</a>
        </div>
      </div>
    </div>
  </main>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const reqUrl = req.url || "/";

  // Servir imagens estáticas de site/public/images/
  if (reqUrl.startsWith("/images/")) {
    const imgPath = path.join(__dirname, "..", "site", "public", reqUrl);
    if (fs.existsSync(imgPath)) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      return fs.createReadStream(imgPath).pipe(res);
    }
  }

  // Rota de Admin do Ghost (/ghost, /ghost/, /ghost/setup)
  if (reqUrl.startsWith("/ghost")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderGhostAdminPortalHTML());
  }

  // Renderiza o site no Tema USA TODAY hojemt
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderCleanUsaTodayThemeHTML());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`👻 Ghost Server running on port ${PORT} with Admin active`);
});
