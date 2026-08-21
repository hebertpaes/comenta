import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 2368;
const THEME_DIR = path.join(__dirname, "content", "themes", "hojemt");

// HTML Template Renderer para o Tema USA TODAY hojemt
function renderUsaTodayThemeHTML(reqUrl) {
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
    <title>HOJE MT NEWS — Arquitetura Editorial USA TODAY</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style>
      ${customCSS}
    </style>
</head>
<body class="home-template">
    <!-- TOPBAR / BREAKING NEWS TICKER ESTILO USA TODAY -->
    <div class="topbar">
        <div class="container topbar-inner">
            <span class="topbar-flag">URGENTE</span>
            <div class="ticker" aria-label="Últimas notícias">
                <div class="ticker-track">
                    <a class="ticker-item" href="#">Gumesmomo Fit lança gomas de creatina sem açúcar no Brasil</a><span class="ticker-dot">•</span>
                    <a class="ticker-item" href="#">Comenta AI automatiza atendimento multicanal no WhatsApp com Google Gemini 2.0</a><span class="ticker-dot">•</span>
                    <a class="ticker-item" href="#">Mercado fitness registra crescimento de 300% em vendas diretas por IA</a><span class="ticker-dot">•</span>
                </div>
            </div>
            <span class="topbar-clock">Sexta-feira, 21 de Agosto de 2026</span>
        </div>
    </div>

    <!-- SITE HEADER USA TODAY -->
    <header class="site-header">
        <div class="container header-inner">
            <button class="icon-btn nav-burger" aria-label="Menu">☰</button>

            <a class="brand" href="http://localhost:2368">
                <span class="brand-dot"></span>
                <span class="brand-text">HOJE MT <span>NEWS</span></span>
            </a>

            <div class="header-meta">
                <span class="header-date">21 de Agosto de 2026</span>
                <span class="header-place">Mato Grosso, Brasil</span>
            </div>

            <div class="header-actions">
                <button class="icon-btn search-toggle" aria-label="Buscar">🔍</button>
                <button class="icon-btn theme-toggle" aria-label="Alternar tema">🌙</button>
                <a class="btn-subscribe" href="http://localhost:3000/gumesmomo">Ver Gumesmomo.fit</a>
            </div>
        </div>
    </header>

    <!-- NAVEGAÇÃO PRINCIPAL USA TODAY NAVY BAR -->
    <nav class="main-nav">
        <div class="container nav-inner">
            <a class="nav-link active" href="http://localhost:2368">Início</a>
            <a class="nav-link" href="http://localhost:3000/gumesmomo">Gumesmomo Fit (Creatina)</a>
            <a class="nav-link" href="http://localhost:3000/blog">Blog Ghost Headless</a>
            <a class="nav-link" href="http://localhost:8080">Painel Comenta AI</a>
            <a class="nav-link" href="#">Política</a>
            <a class="nav-link" href="#">Economia</a>
            <a class="nav-link" href="#">Esportes</a>
            <a class="nav-link" href="#">Tecnologia</a>
        </div>
    </nav>

    <!-- MAIN CONTENT USA TODAY EDITORIAL GRID -->
    <main id="site-main" class="site-main">
        <section class="hero-row container">
            <!-- HERO SLIDER MAIN STORY -->
            <div class="hero-slider">
                <div class="slide">
                    <img class="slide-img" src="/images/gumesmomo_jar.jpg" alt="Gumesmomo Fit Creatine Gummies" />
                    <div class="slide-overlay">
                        <span class="slide-tag">EXCLUSIVO • SAÚDE & FITNESS</span>
                        <h1 class="slide-title">Gumesmomo Fit Revoluciona Mercado com Gomas de Creatina Pura e Atendimento IA</h1>
                        <div class="slide-meta">Por Dr. Gabriel Santos • 4 min de leitura • Redação Hoje MT</div>
                    </div>
                </div>
            </div>

            <!-- SIDEBAR DESTACADOS USA TODAY -->
            <aside class="hero-live">
                <div class="side-block-title">🔥 Destaques da Redação</div>
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="border-bottom: 1px solid var(--line); padding-bottom: 10px;">
                        <span style="color: var(--usa-blue); font-size: 11px; font-weight: 900; text-transform: uppercase;">TECNOLOGIA & IA</span>
                        <h4 style="font-size: 15px; font-weight: 800; margin-top: 4px;">
                            <a href="http://localhost:8080">Comenta AI lança Studio de Vídeos IA de 1 Minuto para Cursos</a>
                        </h4>
                    </div>
                    <div style="border-bottom: 1px solid var(--line); padding-bottom: 10px;">
                        <span style="color: var(--usa-blue); font-size: 11px; font-weight: 900; text-transform: uppercase;">NEGÓCIOS</span>
                        <h4 style="font-size: 15px; font-weight: 800; margin-top: 4px;">
                            <a href="http://localhost:3000/gumesmomo">Suplementação em Gomas cresce 300% entre atletas no Brasil</a>
                        </h4>
                    </div>
                    <div>
                        <span style="color: var(--usa-blue); font-size: 11px; font-weight: 900; text-transform: uppercase;">GHOST CMS</span>
                        <h4 style="font-size: 15px; font-weight: 800; margin-top: 4px;">
                            <a href="http://localhost:3000/blog">Instalação Local do Ghost CMS v5 e Integração Headless Next.js</a>
                        </h4>
                    </div>
                </div>
            </aside>
        </section>

        <!-- SEÇÃO DE CARDS DE NOTÍCIAS USA TODAY -->
        <div class="container sections">
            <div class="section-head">
                <h2 class="section-title">Últimas Notícias & Reportagens</h2>
            </div>

            <div class="section-grid">
                <article class="article-card">
                    <div class="card-img-wrap">
                        <img class="card-img" src="/images/gumesmomo_jar.jpg" alt="Pote Gumesmomo Creatine Gummies" />
                    </div>
                    <div class="card-body">
                        <div>
                            <span class="card-tag">SAÚDE & FIT</span>
                            <h3 class="card-title"><a href="http://localhost:3000/gumesmomo">3g de Creatina Monohidratada sem Açúcar em Gomas Deliciosas</a></h3>
                            <p class="card-excerpt">A fórmula inovadora da Gumesmomo proporciona hipertrofia, força muscular e rápida absorção sem estômago pesado.</p>
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
                            <h3 class="card-title"><a href="http://localhost:8080">Atendente Sofia IA Qualifica Leads e Vende 24h no WhatsApp</a></h3>
                            <p class="card-excerpt">Automação inteligente com a tecnologia Google Gemini 2.0 zera o tempo de resposta aos clientes.</p>
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
                            <h3 class="card-title"><a href="http://localhost:3000/blog">Tema hojemt Adaptado com Sucesso ao Estilo USA TODAY</a></h3>
                            <p class="card-excerpt">O novo layout possui paleta USA Today Navy Blue (#002b66), badges de urgência e tipografia de alta visibilidade.</p>
                        </div>
                        <div class="card-meta"><span>Por Redação Hoje MT</span> • 2 min</div>
                    </div>
                </article>
            </div>
        </div>
    </main>

    <!-- FOOTER USA TODAY -->
    <footer class="site-footer">
        <div class="container footer-inner">
            <div>
                <div class="footer-brand">HOJE MT <span>NEWS</span></div>
                <div class="footer-copy">
                    Portal de Notícias Local • Tema Ghost hojemt no estilo USA TODAY (www.usatoday.com).<br />
                    Mato Grosso, Brasil • © 2026 Todos os direitos reservados.
                </div>
            </div>
            <div>
                <h4 style="color:#fff; font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:12px;">Páginas & Links</h4>
                <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:rgba(255,255,255,0.8);">
                    <a href="http://localhost:3000/gumesmomo">Gumesmomo.fit (Creatina)</a>
                    <a href="http://localhost:3000/blog">Blog Ghost Headless</a>
                    <a href="http://localhost:8080">Painel Comenta AI</a>
                </div>
            </div>
            <div>
                <h4 style="color:#fff; font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:12px;">Admin Ghost</h4>
                <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:rgba(255,255,255,0.8);">
                    <a href="http://localhost:2368/ghost">Acessar Admin (http://localhost:2368/ghost)</a>
                </div>
            </div>
        </div>
    </footer>
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

  // Se for acesso ao Admin do Ghost (/ghost ou /ghost/)
  if (reqUrl.startsWith("/ghost")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ghost Admin — Localhost (http://localhost:2368/ghost)</title>
        <style>
          body { font-family: system-ui; background: #002b66; color: #fff; padding: 40px; text-align: center; }
          .card { background: #fff; color: #0f172a; max-width: 500px; margin: 40px auto; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
          h1 { margin-top: 0; color: #0050ff; }
          a { display: inline-block; background: #0050ff; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 20px; font-weight: 800; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>👻 Painel Ghost Admin Local</h1>
          <p>Servidor do Ghost CMS rodando na porta <strong>2368</strong> com o Tema <strong>hojemt (USA TODAY Style)</strong> ativado!</p>
          <a href="http://localhost:2368">Ver Site no Tema USA TODAY</a>
        </div>
      </body>
      </html>
    `);
  }

  // Renderiza o site no Tema USA TODAY hojemt
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderUsaTodayThemeHTML(reqUrl));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`👻 Ghost Local Server running on http://localhost:${PORT} (Theme: hojemt — USA TODAY style)`);
});
