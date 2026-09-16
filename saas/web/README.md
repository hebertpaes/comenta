# Painel (`@comenta/web`)

React 19 + Vite, servido estático pelo nginx do compose (`panel`, porta 8080) e
por `app.comenta.com.br` em produção.

```bash
npm run dev -w @comenta/web        # http://localhost:5173
npm run build -w @comenta/web      # dist/, que o container do painel monta
npm test -w @comenta/web
```

## Instalar como app

O painel é instalável — mesmo caminho do Chrome Remote Desktop e do Gmail: em
vez de baixar um `.dmg`, o próprio navegador cria o app. Ele ganha janela sem
barra de endereços, ícone no Dock/menu Iniciar, e aparece no ⌘+Tab como
qualquer outro programa.

**Chrome / Edge / Brave** — abra o painel e use qualquer um dos três:

1. o botão **⬇️ Instalar app**, no rodapé da barra lateral;
2. o ícone de instalar (monitor com seta) na direita da barra de endereços;
3. menu **⋮ → Transmitir, salvar e compartilhar → Instalar página como app**.

**Safari (macOS 14+)** — menu **Arquivo → Adicionar ao Dock**.

**iPhone / Android** — abra o painel no navegador e use **Compartilhar →
Adicionar à Tela de Início**.

Para desinstalar: abra o app, **⋮ → Desinstalar**, ou remova por
`chrome://apps`.

### Por que às vezes o botão não aparece

O Chrome só oferece a instalação quando quatro condições valem ao mesmo tempo:

| Condição                   | No projeto                                       |
| -------------------------- | ------------------------------------------------ |
| Manifesto com ícone ≥192px | `public/manifest.webmanifest` + `public/icones/` |
| Service worker com `fetch` | `public/sw.js`, registrado por `src/lib/pwa.ts`  |
| Origem segura              | `https://` **ou** `localhost` / `127.0.0.1`      |
| Ainda não instalado        | depois de instalar, o botão some                 |

Duas armadilhas comuns:

- **`npm run dev` não instala.** O registro do service worker é pulado em
  desenvolvimento de propósito — ele serviria do cache no meio do HMR. Para
  testar a instalação, rode o build:

  ```bash
  npm run build -w @comenta/web
  npm run preview -w @comenta/web   # http://localhost:4173
  ```

- **Pelo IP da LAN (`http://192.168.0.10:8080`, o caso do `local-mac.sh --lan`)
  também não instala** — `http://` só conta como origem segura em `localhost`.
  No iPhone, "Adicionar à Tela de Início" funciona mesmo assim: o Safari não
  exige service worker, só o `apple-touch-icon`.

### Offline

Sem rede, o app abre a casca do painel em vez do dinossauro do Chrome — o que
importa quando não existe barra de endereços para recarregar. Nada de dados é
cacheado: a API mora em outra origem e o service worker nem intercepta as
chamadas dela. Conversa velha servida do cache seria pior que erro de rede.

### Mexer no ícone

Edite `public/icone.svg` (e `public/icone-maskable.svg`, a variante que o
Android recorta) e regenere os PNGs — eles são versionados:

```bash
node saas/web/scripts/gerar-icones.mjs
```

Mudou `public/sw.js`? Suba a constante `VERSAO` no topo do arquivo. É a troca
de nome do cache que faz o `activate` descartar o build anterior.
