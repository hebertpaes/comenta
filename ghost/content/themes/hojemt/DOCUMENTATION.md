# Documentação Oficial — Tema Hoje MT para Ghost CMS
*Inspirado no Design System Internacional do USA TODAY com Identidade Visual em Verde Esmeralda e Foco no Jornalismo de Mato Grosso.*

---

## 📑 Índice Geral

1. [Visão Geral & Recursos Principais](#1-visão-geral--recursos-principais)
2. [Instalação e Ativação no Ghost Admin](#2-instalação-e-ativação-no-ghost-admin)
3. [Configurações Customizadas do Tema (Ghost Admin Settings)](#3-configurações-customizadas-do-tema-ghost-admin-settings)
4. [Estrutura de Menus e Navegação Responsiva](#4-estrutura-de-menus-e-navegação-responsiva)
5. [Criação e Gestão Editorial de Conteúdo](#5-criação-e-gestão-editorial-de-conteúdo)
6. [Templates Customizados de Post](#6-templates-customizados-de-post)
7. [Sistema de Banners e Publicidade Dinâmica](#7-sistema-de-banners-e-publicidade-dinâmica)
8. [Seção de Vídeos & Reportagens (Thumbnails com Overlay)](#8-seção-de-vídeos--reportagens-thumbnails-com-overlay)
9. [Modo Escuro (Dark Mode) e Identidade Visual](#9-modo-escuro-dark-mode-e-identidade-visual)
10. [Padrões Jornalísticos e SEO Automatizado](#10-padrões-jornalísticos-e-seo-automatizado)
11. [Arquitetura de Arquivos e Desenvolvimento](#11-arquitetura-de-arquivos-e-desenvolvimento)
12. [Perguntas Frequentes & Solução de Problemas (FAQ)](#12-perguntas-frequentes--solução-de-problemas-faq)

---

## 1. Visão Geral & Recursos Principais

O **Hoje MT** é um tema premium e de alta performance desenvolvido exclusivamente para o **Ghost CMS (v5.0+)**, adaptando a clareza e autoridade do portal **USA TODAY** para o ecossistema jornalístico brasileiro com predominância visual em **Verde Esmeralda** (`#00a859`) e **Verde Floresta** (`#062b1a`).

### 🚀 Principais Características:
- **Design Editorial Moderno**: Capa com manchete principal (Hero Split) e trilho de 6 notícias mais lidas (*Trending Ranked 1..6*) alinhadas simetricamente.
- **Grade em 3 Colunas Ágeis**: Blocos integrados de *Giro Rápido (Tempo Real)*, *Vídeos & Reportagens (com legendas em overlay cinematográfico)* e *Opinião & Análise (Colunistas com avatares)*.
- **Top Utility Bar Dinâmica**: Data em tempo real em português brasileiro, previsão do tempo para Cuiabá/MT, badge de edição digital e barra de notícias urgentes (*Breaking News Ticker*).
- **Menu Mobile Completo & Scroll Horizontal**: Menu lateral deslizante (*Drawer*) com busca, categorias e redes sociais, além de barra horizontal de editorias com rolagem suave no celular.
- **Sistema de Publicidade Nativo**: Suporte a rotação de anúncios pagos via tags internas (`#ad-leaderboard`, `#ad-sidebar`, etc.) e banner da casa responsivo de alta conversão.
- **Modo Claro / Escuro Inteligente**: Alternador com persistência local e troca automática de logos vetoriais.
- **Totalmente Compatível com o Editor Koenig**: Suporte completo a `.kg-width-wide`, `.kg-width-full`, galerias, bookmarks, áudio e vídeo cards.
- **Validação GScan 100%**: Zero erros ou avisos na verificação oficial do Ghost.

---

## 2. Instalação e Ativação no Ghost Admin

A instalação do tema pode ser feita diretamente pelo painel administrativo do Ghost sem necessidade de comandos de terminal:

### Passo a Passo:
1. Acesse o painel administrativo do seu Ghost: `https://seusite.com.br/ghost/` (ou `http://localhost:2368/ghost/`).
2. No menu lateral esquerdo, clique no ícone de engrenagem **Settings ⚙️**.
3. Navegue até **Design** (ou *Site design*).
4. No canto inferior esquerdo, clique em **Change theme** e em seguida no botão **Upload theme**.
5. Selecione o arquivo de distribuição:
   - `hojemt-usatoday.zip` (ou `3-hojemt.zip`).
6. Clique em **Activate now** para ativar o tema imediatamente.

> 💡 **Dica de Validação**: Caso queira verificar a integridade do código antes de subir, você pode rodar `npx gscan .` na pasta raiz do tema. O tema possui 100% de conformidade técnica.

---

## 3. Configurações Customizadas do Tema (Ghost Admin Settings)

O tema disponibiliza controles nativos na seção **Settings → Design → Site-wide / Theme settings**.

| Configuração | Tipo | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| **`cor_destaque`** | Cor | `#00a859` | Cor primária do portal (usada em botões, kickers, rankings e badges). |
| **`slides_home`** | Seleção | `5` | Quantidade de notícias rotativas no slider da manchete principal. |
| **`logo_dark`** | Imagem | *Vazio* | Logotipo para o modo escuro. Se vazio, utiliza o `logo-branco.svg` do tema. |
| **`whatsapp_redacao`** | Texto | `5565999900005` | Número de WhatsApp da redação (apenas dígitos) para contato e denúncias. |
| **`email_contato`** | Texto | `contato@hojemt.com.br` | E-mail de pauta exibido no rodapé institucional e no menu mobile. |
| **`chat_ativo`** | Booleano | `true` | Ativa o widget flutuante de atendimento e assistente inteligente. |
| **`banner_casa`** | Imagem | *Vazio* | Imagem customizada para o banner do topo quando não houver anúncio pago. |
| **`banner_link`** | Texto | *Vazio* | Link de destino do banner institucional. Se vazio, direciona para o WhatsApp. |
| **`face_url`** | Texto | `https://facebook.com` | Link para a página oficial no Facebook. |
| **`insta_url`** | Texto | `https://instagram.com` | Link para o perfil oficial no Instagram. |
| **`x_url`** | Texto | `https://twitter.com` | Link para a conta no X (antigo Twitter). |
| **`yt_url`** | Texto | `https://youtube.com` | Link para o canal no YouTube. |

---

## 4. Estrutura de Menus e Navegação Responsiva

### Navegação Principal (Primary Navigation)
Configurada em **Settings → Navigation**. O tema renderiza a barra superior em Verde Floresta (`#062b1a`) com indicador ativo:

- **Início**: `/`
- **Política**: `/tag/politica/`
- **Cidades & MT**: `/tag/cidades/`
- **Economia**: `/tag/economia/`
- **Agronegócio**: `/tag/agro/`
- **Polícia**: `/tag/policia/`
- **Esportes**: `/tag/esportes/`
- **Saúde & Fitness**: `/tag/saude/`
- **Cultura & Lazer**: `/tag/cultura/`
- **Opinião**: `/tag/opiniao/`
- **Vídeos**: `/tag/video/` *(Destaque com ícone ▶)*

### Menu Mobile Interativo (Drawer ☰)
Em telas menores de 992px:
1. O botão hambúrguer **☰** anima suavemente para **✕** no clique.
2. O painel lateral desliza da esquerda com efeito *backdrop blur*, trazendo campo de busca em tempo real, links de autenticação (*Entrar / Assinar*), lista completa de editorias com ícones e canais de contato.
3. A barra de categorias permanece acessível horizontalmente por rolagem táctil (*touch scroll*).

---

## 5. Criação e Gestão Editorial de Conteúdo

### Tag Primária (Primary Tag) e Kickers
A primeira tag atribuída ao post no Ghost Admin define o **Kicker** (etiqueta em caixa-alta verde) exibido acima do título em todos os cards e páginas de artigo:
- Se a primeira tag for `Política`, o card exibirá o kicker **POLÍTICA**.
- Se a primeira tag for `Tecnologia`, o badge do vídeo e o kicker exibirão **TECNOLOGIA**.

### Notícias em Destaque (Featured Posts)
Ao marcar a estrela ⭐ **Feature this post** no Ghost Admin:
- O post entra automaticamente no carrossel de manchetes da capa (`hero-slider.hbs`).
- O número de slides exibidos é controlado pela opção `@custom.slides_home`.

---

## 6. Templates Customizados de Post

Ao criar ou editar uma matéria no editor do Ghost, você pode selecionar um template específico no menu lateral de configurações do post (**Post settings ⚙️ → Template**):

1. **`Default` (ou `post.hbs`)**: Layout padrão USA TODAY com tipografia editorial (*Source Serif 4* e *Inter*), barra de compartilhamento social flutuante, foto de capa 16:9 com legenda e grid de matérias recomendadas.
2. **`Artigo Especial` (`custom-artigo.hbs`)**: Enquadramento expandido para grandes reportagens e matérias investigativas de fôlego.
3. **`Coluna de Opinião` (`custom-opiniao.hbs`)**: Destaque para o colunista, com foto circular do autor, biografia e formatação para citações e artigos analíticos.
4. **`Giro Rápido / Curtinha` (`custom-curtinha.hbs`)**: Layout compacto para notas de última hora, comunicados rápidos e flagrantes.

---

## 7. Sistema de Banners e Publicidade Dinâmica

O tema gerencia publicidade através de posts nativos com tags internas (*Internal Tags*, prefixadas com `#`):

```
🏷️ Tag Geral: #ad
🏷️ Zonas Disponíveis:
   • #ad-leaderboard  → Banner do Topo (970x120px ou 728x90px)
   • #ad-sidebar      → Banner da Barra Lateral (336x280px ou 300x250px)
   • #ad-inarticle    → Banner dentro do corpo do texto
   • #ad-video        → Banner na seção de vídeos
```

### Como cadastrar um anúncio patrocinado:
1. No Ghost Admin, crie um novo Post.
2. Defina o título do patrocinador (ex: *Banco do Brasil — Linha Safra 2026*).
3. Insira a arte do banner na **Feature image**.
4. No campo **Excerpt**, cole a URL de destino (ex: `https://patrocinador.com.br/promo`).
5. Adicione as tags: `#ad` e `#ad-leaderboard` (ou a zona desejada).
6. Publique o post.

> 🔄 **Rotação Automática**: Se houver mais de um banner na mesma zona, eles rotacionam a cada 5 segundos.  
> 📣 **Banner da Casa (Fallback)**: Quando não houver anúncios pagos, o tema exibe o banner institucional moderno com botão direto para o WhatsApp da redação.

---

## 8. Seção de Vídeos & Reportagens (Thumbnails com Overlay)

A seção **Vídeos & Reportagens** (`partials/videos.hbs`) foi projetada com proporção 16:9 e estética de streaming:

- **Badge de Categoria Dinâmica**: O selo no canto superior esquerdo exibe a editoria real do post (`POLÍTICA`, `TECNOLOGIA`, `AGRO`, `INFRAESTRUTURA`, etc.).
- **Play Central Luminoso**: Botão com brilho esmeralda e efeito translúcido que se expande ao passar o mouse.
- **Overlay de Alto Contraste**: Gradiente escuro no rodapé da miniatura que garante legibilidade absoluta do título e do tempo de leitura sobre qualquer fotografia.

---

## 9. Modo Escuro (Dark Mode) e Identidade Visual

### Alternância de Tema
O tema detecta a preferência do sistema operacional e permite a troca manual via botão ☀️/🌙 no cabeçalho:
- O estado é gravado no `localStorage` do navegador para manter a preferência do leitor.
- Cores de fundo mudam de `#ffffff` (claro) para `#09140e` / `#0f2419` (escuro sofisticado).

### Logotipo com Globo 3D Luminoso
O tema inclui logos vetoriais em SVG de alta resolução:
- **[logo.svg](file:///Users/hebertpaes/Downloads/PROJETO-HMT/hojemt/assets/img/logo.svg)**: Globo esférico com gradiente azul-para-verde, mapa do Brasil com **Mato Grosso em destaque dourado** e tipografia preta/verde para fundo claro.
- **[logo-branco.svg](file:///Users/hebertpaes/Downloads/PROJETO-HMT/hojemt/assets/img/logo-branco.svg)**: Versão com tipografia branca para o modo escuro.
- As regras de CSS garantem a exibição de apenas **uma logo por vez**.

---

## 10. Padrões Jornalísticos e SEO Automatizado

Para garantir excelência editorial e máxima pontuação no Google Notícias e motores de busca, o fluxo de publicação do Hoje MT segue métricas estritas:

| Elemento | Regra de Tamanho | Padrão Editorial |
| :--- | :--- | :--- |
| **Título** | **Até 76 caracteres** | Verbo de ação, claro, gramaticalmente correto em pt-BR. |
| **Subtítulo** | **50 a 55 caracteres** | Linha fina complementar com dados ou contexto inédito. |
| **Corpo do Artigo** | Completo / Pirâmide Invertida | Lead, desdobramentos, dados factuais e aspas de fontes. |
| **Resumo SEO** | **139 a 149 caracteres** | Meta description rica em palavras-chave para snippets. |
| **Créditos da Foto** | Obrigatório | Citação de autoria e órgão emissor (ex: *Foto: Secom-MT*). |

---

## 11. Arquitetura de Arquivos e Desenvolvimento

```text
PROJETO-HMT/
├── hojemt/                     # Pasta-fonte do tema Ghost
│   ├── assets/
│   │   ├── css/
│   │   │   └── screen.css      # Design system, variáveis e regras Koenig
│   │   ├── js/
│   │   │   ├── main.js         # Interações, dark mode, slider e drawer
│   │   │   └── articles-data.js # Catálogo de dados e resolvedor offline
│   │   └── img/
│   │       ├── logo.svg        # Logo tema claro
│   │       ├── logo-branco.svg # Logo tema escuro
│   │       └── banner-topo.svg # Banner institucional vetorial
│   ├── partials/               # Componentes reutilizáveis
│   │   ├── topbar.hbs          # Barra de utilidades e ticker urgente
│   │   ├── site-header.hbs     # Cabeçalho, logo e busca
│   │   ├── main-nav.hbs        # Navegação e menu mobile drawer
│   │   ├── hero-slider.hbs     # Manchete principal da capa
│   │   ├── most-read.hbs       # Ranking das mais lidas 1..6
│   │   ├── curtinhas.hbs       # Giro rápido em tempo real
│   │   ├── videos.hbs          # Cards expandidos com overlay
│   │   ├── article-card.hbs    # Card padrão de notícia
│   │   ├── section-block.hbs   # Grid de editorias
│   │   ├── ad.hbs              # Sistema de publicidade rotativa
│   │   └── site-footer.hbs     # Rodapé institucional em 4 colunas
│   ├── default.hbs             # Layout mestre (Head, Body e Scripts)
│   ├── home.hbs                # Estrutura completa da página inicial
│   ├── post.hbs                # Página individual de notícia
│   ├── page.hbs                # Página institucional (Sobre, Contato)
│   ├── tag.hbs                 # Arquivo de editoria / taxonomia
│   ├── author.hbs              # Página de perfil de colunista
│   ├── error.hbs               # Página 404 personalizada
│   └── package.json            # Metadados e configurações do Ghost
├── hojemt-usatoday.zip         # Pacote compilado pronto para upload
├── 3-hojemt.zip                # Pacote principal sincronizado
├── auto_publish_cuiaba.py      # Script de automação diária de notícias
└── importar-ghost-cuiaba.json  # Arquivo de importação universal
```

---

## 12. Perguntas Frequentes & Solução de Problemas (FAQ)

### P: O validador do Ghost (GScan) deu erro de classe `.kg-width-wide`?
**R**: Todas as classes do editor Koenig (`.kg-width-wide`, `.kg-width-full`, `.kg-gallery-card`, etc.) estão implementadas no arquivo `screen.css`. Certifique-se de fazer o upload do pacote atualizado `hojemt-usatoday.zip`.

### P: As imagens não estavam aparecendo ou ficavam cinzas?
**R**: A sobreposição antiga de fallback foi removida. As imagens originais agora são carregadas com `opacity: 1 !important` e visibilidade imediata sem depender do cursor do mouse.

### P: Ao clicar em uma matéria, apareceu erro 404?
**R**: No Ghost, links oficiais usam o formato `http://localhost:2368/{slug}/` (sem o prefixo `/p/`). Além disso, o arquivo `articles-data.js` do tema inclui um resolvedor de rotas que garante a exibição da matéria mesmo sem importação manual no banco de dados.

### P: Como alterar o número de notícias no slider da capa?
**R**: Vá em **Settings → Design → Theme settings** e altere o valor do campo **`slides_home`** (opções de 3 a 8).

---

*Hoje MT News Theme — Documentação gerada e mantida para Ghost CMS.*
