import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 2368;
const THEME_DIR = path.join(__dirname, "content", "themes", "hojemt");

// Clean Production USA TODAY Design System Renderer
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
                    <a href="/ghost">Painel Ghost Admin</a>
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
        <title>Ghost Admin — hojemt.com.br</title>
        <style>
          body { font-family: system-ui; background: #002b66; color: #fff; padding: 40px; text-align: center; }
          .card { background: #fff; color: #0f172a; max-width: 500px; margin: 40px auto; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
          h1 { margin-top: 0; color: #0050ff; }
          a { display: inline-block; background: #0050ff; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 20px; font-weight: 800; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>👻 Painel Ghost Admin</h1>
          <p>Servidor do Ghost CMS rodando no domínio <strong>hojemt.com.br</strong> com o Tema <strong>hojemt (USA TODAY Style)</strong> ativado!</p>
          <a href="https://hojemt.com.br">Ver Site Oficial hojemt.com.br</a>
        </div>
      </body>
      </html>
    `);
  }

  // Renderiza o site no Tema USA TODAY hojemt
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderCleanUsaTodayThemeHTML());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`👻 Ghost Server running on port ${PORT} (Clean USA TODAY theme active)`);
});
