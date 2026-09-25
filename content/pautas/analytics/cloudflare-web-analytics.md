# Cloudflare Web Analytics no HOJE MT

Preparado em 25/09/2026.

## Por que

O Google Analytics do portal (`G-FKD65M01H9`) está com Consent Mode v2 e
tudo negado por padrão: só mede quem clica em **Aceitar** no aviso de cookies.
Nos últimos 28 dias (28/08 a 24/09) ele registrou 26 usuários ativos e 238
inícios de sessão, o que retrata só quem aceitou, não a audiência real. A
modelagem do Google para quem recusa só liga com volume alto (cerca de mil
usuários por dia), então não compensa aqui.

O Cloudflare Web Analytics conta todos os leitores sem cookies e sem pedir
consentimento, e o Google Analytics continua como está, para quem aceita.

## Situação conferida

- `hojemt.com.br` passa pelo proxy da Cloudflare (IPs da Cloudflare,
  `server: cloudflare`), então vale a **configuração automática**: a
  Cloudflare injeta o script em todas as páginas e os dados voltam por
  `https://hojemt.com.br/cdn-cgi/rum`, no próprio domínio.
- O site não envia cabeçalho `Content-Security-Policy`, então nada bloqueia o
  script.
- Nenhuma mudança no tema ou na injeção de código do Ghost é necessária.

## Como ligar (no painel da Cloudflare, conta do HOJE MT)

1. Abra <https://dash.cloudflare.com/?to=/:account/web-analytics/sites>
   (ou, na página inicial da conta, **Analytics & Logs → Web Analytics**).
2. Clique em **Add a site** e informe `hojemt.com.br`. Se o site já aparecer
   na lista, clique em **Manage site**.
3. Escolha a opção **Enable** (configuração automática). Não use a opção que
   exclui visitantes da União Europeia: o público é do Brasil e ela descartaria
   dados sem necessidade.
4. Não copie o trecho de JavaScript manual: com o proxy ligado ele não é
   necessário e duplicaria a contagem.

Os primeiros números aparecem em alguns minutos em **Web Analytics →
hojemt.com.br**.

## Como conferir se ligou

```bash
bash content/verificar-cf-analytics.sh
```

Ele abre a capa e algumas páginas do portal e mostra se o script
`static.cloudflareinsights.com/beacon.min.js` já está sendo injetado.

## O que ele mede e o que não mede

- Mede: visitas, páginas vistas, páginas mais lidas, de onde o leitor veio
  (Google, Instagram, WhatsApp, direto), país, navegador, sistema e tipo de
  aparelho, além do tempo de carregamento (Core Web Vitals).
- Não usa cookies nem armazenamento no navegador e não identifica a pessoa;
  os números são agregados.
- Robôs que não executam JavaScript ficam de fora.
- "Visitas" do Cloudflare e "usuários" do Google não são a mesma medida: para
  comparar semanas, use sempre a mesma ferramenta.

## Texto para a política de privacidade

A página <https://hojemt.com.br/privacidade/> já fala em "estatísticas de
acesso". Para ficar transparente, acrescente este parágrafo na seção
**Cookies** (Ghost Admin → Pages → Política de Privacidade), antes de
"Gerenciar consentimento":

> **Estatísticas sem cookies.** Para saber quantas pessoas leem o portal e
> quais matérias interessam mais, usamos o Cloudflare Web Analytics, que conta
> visitas de forma agregada. Essa ferramenta não grava cookies nem outros dados
> no seu navegador e não identifica o leitor. O Google Analytics só é ativado
> se você aceitar os cookies analíticos no aviso de consentimento.
