/**
 * HOJE MT NEWS — Script Principal (USA TODAY Design System)
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Data em Português Brasileiro no Topbar
  const topDate = document.getElementById("topDate");
  if (topDate) {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const dateStr = now.toLocaleDateString("pt-BR", options);
    topDate.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  // 2. Alternância de Modo Escuro / Claro
  const themeToggle = document.getElementById("themeToggle");
  const html = document.documentElement;
  const savedTheme = localStorage.getItem("hojemt_theme") || "light";
  html.setAttribute("data-theme", savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = html.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      html.setAttribute("data-theme", next);
      localStorage.setItem("hojemt_theme", next);
    });
  }

  // 3. Menu Hambúrguer & Drawer Mobile
  const navBurger = document.getElementById("navBurger");
  const mobileDrawer = document.getElementById("mobileDrawer");
  const drawerClose = document.getElementById("drawerClose");
  const drawerBackdrop = document.getElementById("drawerBackdrop");

  const openDrawer = () => {
    if (!mobileDrawer) return;
    mobileDrawer.classList.add("open");
    mobileDrawer.setAttribute("aria-hidden", "false");
    if (navBurger) {
      navBurger.classList.add("open");
      navBurger.setAttribute("aria-expanded", "true");
    }
    document.body.classList.add("drawer-active");
  };

  const closeDrawer = () => {
    if (!mobileDrawer) return;
    mobileDrawer.classList.remove("open");
    mobileDrawer.setAttribute("aria-hidden", "true");
    if (navBurger) {
      navBurger.classList.remove("open");
      navBurger.setAttribute("aria-expanded", "false");
    }
    document.body.classList.remove("drawer-active");
  };

  if (navBurger) {
    navBurger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = mobileDrawer && mobileDrawer.classList.contains("open");
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  if (drawerClose) {
    drawerClose.addEventListener("click", closeDrawer);
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", closeDrawer);
  }

  // Fechar no Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileDrawer && mobileDrawer.classList.contains("open")) {
      closeDrawer();
    }
  });

  // 4. Gaveta de Busca no Header
  const searchToggle = document.getElementById("searchToggle");
  const searchDrawer = document.getElementById("searchDrawer");
  const searchInput = document.getElementById("searchInput");
  if (searchToggle && searchDrawer) {
    searchToggle.addEventListener("click", () => {
      const isHidden = searchDrawer.hasAttribute("hidden");
      if (isHidden) {
        searchDrawer.removeAttribute("hidden");
        if (searchInput) searchInput.focus();
      } else {
        searchDrawer.setAttribute("hidden", "");
      }
    });
  }

  // 5. Hero Slider USA TODAY
  const heroSlider = document.querySelector(".usat-hero-slider");
  if (heroSlider) {
    const slides = heroSlider.querySelectorAll(".usat-slide");
    const dots = heroSlider.querySelectorAll(".usat-slider-dot");
    const prevBtn = heroSlider.querySelector(".usat-slider-arrow.prev");
    const nextBtn = heroSlider.querySelector(".usat-slider-arrow.next");
    const pauseBtn = heroSlider.querySelector(".usat-slider-pause");
    let currentIndex = 0;
    let autoplayTimer = null;
    let isPaused = false;
    const interval = parseInt(heroSlider.getAttribute("data-autoplay") || "6000", 10);

    const showSlide = (idx) => {
      if (!slides.length) return;
      currentIndex = (idx + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("active", i === currentIndex));
      dots.forEach((d, i) => d.classList.toggle("active", i === currentIndex));
    };

    const startAutoplay = () => {
      if (autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = setInterval(() => {
        if (!isPaused) showSlide(currentIndex + 1);
      }, interval);
    };

    if (prevBtn) prevBtn.addEventListener("click", () => { showSlide(currentIndex - 1); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { showSlide(currentIndex + 1); startAutoplay(); });
    dots.forEach((dot, idx) => dot.addEventListener("click", () => { showSlide(idx); startAutoplay(); }));

    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? "▶" : "⏸";
        pauseBtn.setAttribute("aria-label", isPaused ? "Retomar" : "Pausar");
      });
    }

    startAutoplay();
  }

  // 6. Copiar Link do Post
  const initCopyButtons = () => {
    const copyBtns = document.querySelectorAll(".js-copy-url");
    copyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-url") || window.location.href;
        navigator.clipboard.writeText(url).then(() => {
          const orig = btn.textContent;
          btn.textContent = "✓ Copiado!";
          setTimeout(() => { btn.textContent = orig; }, 2500);
        });
      });
    });
  };
  initCopyButtons();

  // 7. RESOLVEDOR AUTOMÁTICO DE MATÉRIAS NATIVAS (SEM PRECISAR DE IMPORTAÇÃO .JSON MANUAL)
  const errorWrap = document.getElementById("errorWrap");
  if (errorWrap && window.HOJEMT_ARTICLES) {
    let cleanSlug = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (cleanSlug.startsWith("p/")) {
      cleanSlug = cleanSlug.substring(2);
    }

    const article = window.HOJEMT_ARTICLES[cleanSlug];
    if (article) {
      document.title = `${article.title} — Hoje MT`;
      const siteMain = document.getElementById("site-main");
      if (siteMain) {
        siteMain.innerHTML = `
          <div class="container usat-article-wrap">
              <article class="usat-article">
                  <header class="usat-article-head">
                      <span class="usat-kicker-lg">${article.tag || 'CUIABÁ & MATO GROSSO'}</span>
                      <h1 class="usat-article-title">${article.title}</h1>
                      ${article.excerpt ? `<p class="usat-article-sub">${article.excerpt}</p>` : ''}
                      
                      <div class="usat-byline">
                          <span class="byline-name">Por <strong>Redação Hoje MT / Assessoria</strong></span>
                          <span class="byline-dot">•</span>
                          <time class="byline-time">${article.date || 'Hoje'}</time>
                          <span class="byline-dot">•</span>
                          <span class="byline-rt">⏱️ 3 min de leitura</span>
                      </div>

                      <div class="usat-article-share">
                          <span class="share-label">Compartilhe:</span>
                          <div class="share-buttons">
                              <a class="share-btn share-wa" href="https://wa.me/?text=${encodeURIComponent(article.title + ' ' + window.location.href)}" target="_blank" rel="noopener">WhatsApp</a>
                              <a class="share-btn share-x" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}" target="_blank" rel="noopener">𝕏 Twitter</a>
                              <a class="share-btn share-fb" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" rel="noopener">Facebook</a>
                              <button class="share-btn share-copy js-copy-url" data-url="${window.location.href}">Copiar link</button>
                          </div>
                      </div>
                  </header>

                  <figure class="usat-article-hero">
                      <img src="${article.image}" alt="${article.title}" />
                      <figcaption class="usat-hero-caption">${article.caption || 'Foto: Assessoria / Prefeitura de Cuiabá'}</figcaption>
                  </figure>

                  <div class="gh-content usat-article-content">
                      ${article.html}
                  </div>

                  <section class="usat-related-section">
                      <div class="usat-section-head">
                          <div class="usat-section-title-wrap">
                              <span class="usat-section-pill"></span>
                              <h2 class="usat-section-title">Mais Notícias em Cuiabá</h2>
                          </div>
                      </div>
                      <div class="usat-section-grid" style="grid-template-columns: repeat(2, 1fr);">
                          <article class="usat-card">
                              <div class="usat-card-body">
                                  <span class="usat-kicker">CUIABÁ</span>
                                  <h3 class="usat-card-title"><a href="/obra-viaduto-imigrantes-altera-trafego-palmiro-paes-90-dias/">Obra de viaduto na Imigrantes altera tráfego na Palmiro Paes por 90 dias</a></h3>
                              </div>
                          </article>
                          <article class="usat-card">
                              <div class="usat-card-body">
                                  <span class="usat-kicker">ECONOMIA</span>
                                  <h3 class="usat-card-title"><a href="/cuiaba-prev-cresce-mais-de-80-milhoes-primeiro-semestre-2026/">Cuiabá-Prev cresce mais de R$ 80 milhões no primeiro semestre de 2026</a></h3>
                              </div>
                          </article>
                      </div>
                  </section>
              </article>

              <aside class="usat-article-rail">
                  <div class="usat-rail-box">
                      <div class="usat-rail-header">
                          <h2 class="usat-rail-title"><span class="usat-dot-accent"></span> Mais Lidas</h2>
                          <span class="usat-rail-badge">TRENDING</span>
                      </div>
                      <ol class="usat-most-read-list">
                          <li class="usat-ranked-item">
                              <span class="rank-number">1</span>
                              <div class="rank-content"><a class="rank-title" href="/obra-viaduto-imigrantes-altera-trafego-palmiro-paes-90-dias/">Obra de viaduto na Imigrantes altera tráfego na Palmiro Paes por 90 dias</a></div>
                          </li>
                          <li class="usat-ranked-item">
                              <span class="rank-number">2</span>
                              <div class="rank-content"><a class="rank-title" href="/cuiaba-prev-cresce-mais-de-80-milhoes-primeiro-semestre-2026/">Cuiabá-Prev cresce mais de R$ 80 milhões no primeiro semestre de 2026</a></div>
                          </li>
                          <li class="usat-ranked-item">
                              <span class="rank-number">3</span>
                              <div class="rank-content"><a class="rank-title" href="/escola-aguacu-avanca-1-8-ponto-ideb-ganha-quadra-poliesportiva/">Escola de Aguaçu avança 1,8 ponto no Ideb e ganha quadra poliesportiva</a></div>
                          </li>
                      </ol>
                  </div>
              </aside>
          </div>
        `;
        initCopyButtons();
      }
    }
  }
});
