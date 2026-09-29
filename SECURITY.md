# Protocolo de segurança

Vale para o site HOJE MT (Ghost em hojemt.com.br), a redação automatizada
(`content/`), o painel/API (`saas/`) e os scripts de servidor (`deploy/`).
Última revisão: 29/09/2026.

## Regras permanentes

1. **Segredo nunca entra no git.** Chave, token, senha e hottok vão em
   variável de ambiente (`.env` no servidor, _Secrets_ do GitHub Actions ou
   conexão do Zapier). No repositório só o nome da variável, em `.env.example`.
2. **Segredo nunca vai para o chat, o log ou a resposta da API.** O painel
   mostra só o final (`…1234`); os webhooks não ecoam nem registram o valor.
3. **Webhook de venda só com prova de origem.** Hotmart: `HOTMART_HOTTOK`
   (cabeçalho `X-HOTMART-HOTTOK`). ABACS: `ABACS_TOKEN`. Sem a variável o
   webhook fica fechado (503); com valor errado, 401. Comparação em tempo
   constante.
4. **Rota que lê ou grava credencial exige administrador autenticado.**
5. **Menor permissão.** Workflows com `permissions: contents: read`; o servidor
   clona com token _fine-grained_ só de leitura, que vai no cabeçalho de cada
   comando git (`http.extraHeader`), nunca gravado em `.git/config`.
6. **Vazou? Troca na origem.** Apagar do código não basta: o valor continua no
   histórico e em qualquer clone. Gere um novo, atualize o ambiente e só então
   (opcionalmente) reescreva o histórico.

## Barreiras automáticas

| Onde                                       | O quê                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/verificar-segredos.py`            | Procura padrões de chave (Ghost Admin, GitHub, AWS, Google, OpenAI, Anthropic, Stripe, Meta, SendGrid, Telegram, Mercado Pago, chave privada…) e os valores que já vazaram — estes guardados só como SHA-256. Barra também arquivos de credencial (`.env`, `.pem`, `id_rsa`…). Mostra o achado mascarado. |
| Gancho `pre-commit`                        | `bash scripts/instalar-gancho-segredos.sh` (uma vez por clone). Roda o verificador no que vai entrar no commit.                                                                                                                                                                                           |
| `.github/workflows/segredos.yml`           | Roda o verificador nas linhas novas de cada push e PR.                                                                                                                                                                                                                                                    |
| `saas/api/test/webhooks-seguranca.test.ts` | 10 testes: webhooks fechados sem segredo, 401 com segredo errado, rotas de credencial com 401/403 sem admin, credenciais só mascaradas. Falham (9 de 10) no código antigo.                                                                                                                                |
| `deploy/nginx/seguranca-cabecalhos.conf`   | HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` e remoção do `X-Powered-By`. Já aplicado em `deploy/nginx_hojemt.conf` e `deploy/install_ghost.sh`.                                                                                                                           |

## Auditoria de 29/09/2026

**Varredura do histórico** (384 commits, 6 ramos): a chave Admin do Ghost e o
token do instalador Atendechat **não** estão no git. Estão expostos, desde que o
repositório é público, o **token da integração ABACS** e o **hottok do
Hotmart** (em `main`, no ramo padrão e nos ramos de trabalho).

**Falhas corrigidas neste ramo** (`claude/exciting-thompson-4rhut2`):

- `POST /webhooks/hotmart` aceitava qualquer chamada como compra aprovada (a
  checagem do hottok só registrava no log) e devolvia o hottok na resposta.
- `POST /webhooks/hotmart/test` era aberto a qualquer um.
- `GET/POST /abacs/config` eram abertos: qualquer pessoa lia e trocava as
  credenciais de pagamento (Mercado Pago, cartão, ABACS).
- `POST /abacs/sync-hotmart` era um repasse aberto de login para abacs.org.br,
  com usuário e senha padrão embutidos.
- O webhook ABACS não validava o token e o ecoava na resposta.
- O link do catálogo no painel levava o token ABACS para o navegador de
  qualquer usuário; o manual em PDF e o _seed_ também traziam os valores.

> O ramo `main` **continua com o código vulnerável**. A API não está no ar hoje
> (os domínios do painel não respondem), mas não suba o `saas/` a partir da
> `main` antes de trazer estas correções para ela.

**Site ao vivo (hojemt.com.br)**: atrás da Cloudflare, HTTPS obrigatório (301);
`/.env`, `/.git/config`, `config.production.json`, banco e backups
dão 404; a Admin API do Ghost dá 403 sem autenticação. Faltam os cabeçalhos de
segurança e o servidor anuncia `X-Powered-By: Express` — resolvido no Nginx do
repositório, falta aplicar (item 6 abaixo). O fuso do Ghost está em
`America/Santiago`.

## Checklist do responsável (ações fora do alcance da automação)

1. **Tornar o repositório privado:** GitHub → _Settings_ → _General_ →
   _Danger Zone_ → _Change repository visibility_ → _Private_.
2. **Trocar o token ABACS e o hottok do Hotmart** (Hotmart: área de Webhook,
   em Ferramentas — se o painel não permitir gerar outro, pedir ao suporte do
   Hotmart; o token ABACS, com a própria ABACS). Colocar os novos
   em `HOTMART_HOTTOK` e `ABACS_TOKEN` no `.env` do servidor. Os antigos devem
   ser considerados públicos.
3. **Conta GitHub:** autenticação em dois fatores; _Settings → Code security_:
   _Secret scanning_ e _Push protection_ (no repositório privado exigem o
   GitHub Advanced Security — hoje desativado); proteção de ramo na `main`
   (PR obrigatório, sem _force push_).
4. **Servidor com repositório privado:** criar um token _fine-grained_ só com
   _Contents: read_ neste repositório e exportar `GITHUB_TOKEN` antes de rodar
   `deploy/bootstrap.sh`, `deploy_site.sh`, `ghost_restaurar_hojemt.sh` ou
   `install_ghost.sh`. O workflow _Deploy_ (modo `full`) já usa o token
   temporário do próprio job; o modo `site` (padrão) não clona nada no servidor
   e segue funcionando igual.
5. **Actions no repositório privado** passam a consumir minutos do plano
   (2.000/mês no gratuito). A publicação do site não depende deles.
6. **Cabeçalhos no ar:** na Cloudflare, _Rules → Transform Rules → Managed
   Transforms_ → ligar _Add security headers_ e _Remove "X-Powered-By"
   headers_; _SSL/TLS → Edge Certificates_ → ligar HSTS (6 meses, sem
   subdomínios de início); _Minimum TLS Version_ → 1.2. Ou, no servidor, incluir
   `deploy/nginx/seguranca-cabecalhos.conf` no `location /` do Ghost
   (`nginx -t` antes do _reload_).
7. **Fuso do Ghost:** _Settings → General → Timezone_ → `America/Cuiaba`.
8. **(Opcional) Reescrever o histórico** para tirar os valores antigos
   (`git filter-repo`). Só depois do item 2, e exige que todos reclonem — pedir
   explicitamente, porque reescreve todos os ramos.
9. **Trazer as correções para a `main`** por PR revisado (nunca _push_ direto).
