# Análise do Instalador (instaladormain.zip)

Análise técnica do instalador enviado (base Atendechat), que originou o
`instalador/` deste projeto.

## O que é

Instalador CLI em Bash para provisionar, em uma VPS Ubuntu, instâncias de uma
plataforma de atendimento via WhatsApp (arquitetura Whaticket/Atendechat):
backend Express + frontend React + PostgreSQL + Redis (Docker) + PM2 + Nginx +
Certbot (SSL).

## Estrutura

```
instalador/
├── install_primaria      # 1ª instalação: dependências do sistema + 1ª instância
├── install_instancia     # instâncias adicionais (pula dependências do sistema)
├── config                # senhas geradas na instalação (NÃO versionar)
├── lib/
│   ├── _system.sh        # sistema: usuário deploy, node, docker, nginx, certbot,
│   │                     #   clone do código, atualizar/deletar/bloquear instância
│   ├── _backend.sh       # .env, redis, dependências, build, migrate, seed, pm2
│   ├── _frontend.sh      # .env, dependências, build, pm2, nginx
│   └── _inquiry.sh       # CLI interativa (menu e perguntas)
├── utils/_banner.sh      # banner ASCII
└── variables/            # cores e variáveis (JWT secrets, senhas geradas)
```

## Fluxo de instalação (install_primaria)

1. **Menu**: instalar / atualizar / deletar / bloquear / desbloquear / alterar domínio.
2. **Perguntas**: senha deploy+banco, repositório Git, nome da instância,
   qtde de conexões WhatsApp, qtde de atendentes, domínios frontend/backend,
   portas frontend (3xxx), backend (4xxx) e Redis (5xxx).
3. **Sistema**: apt update, Node.js 20, PM2, Docker, dependências do Puppeteer
   (Chromium para o WhatsApp Web), snapd, Nginx, Certbot, usuário `deploy`.
4. **Backend**: clone do código, `.env` (Postgres, Redis, JWT, limites),
   container Redis por instância, `npm install`, build, `db:migrate`,
   `db:seed`, PM2, virtual host Nginx.
5. **Frontend**: `.env` (URL do backend), build, PM2, Nginx.
6. **Rede**: configuração global do Nginx, restart e SSL via Certbot.

Cada instância é isolada por nome: banco próprio, usuário Postgres próprio,
Redis próprio (porta dedicada) e processos PM2 próprios — modelo multi-tenant
por instância/empresa.

## Problemas encontrados e correções aplicadas

| # | Problema | Gravidade | Correção no `instalador/` |
|---|---|---|---|
| 1 | **Token GitHub hardcoded** (`ghp_…`) na URL de clone em `lib/_system.sh` | Crítica (vazamento de credencial) | Removido; o clone agora usa `${link_git}` informado na instalação |
| 2 | Arquivo `config` com senha de deploy e `db_pass` versionados | Crítica | Arquivo removido do pacote e adicionado ao `.gitignore` |
| 3 | `get_link_git` era chamado em `get_urls()` mas **não existia** (erro em runtime) | Alta | Função criada em `lib/_inquiry.sh` (pergunta a URL do repositório) |
| 4 | Marca Atendechat (banner, menus, mensagens) | — | Rebrandado para **Comenta** |

> ⚠️ **Ação recomendada:** se o token `ghp_…` presente no zip original ainda
> estiver ativo, revogue-o imediatamente em GitHub → Settings → Developer
> settings → Personal access tokens.

## Observações técnicas

- O instalador pressupõe **Ubuntu com sudo/root** e domínios já apontados
  para o servidor (DNS) antes do Certbot.
- `install_instancia` é idêntico ao `install_primaria`, porém com as etapas de
  dependências do sistema comentadas — próprio para adicionar instâncias.
- O `.env` do backend usa a mesma senha para banco e Redis
  (`mysql_root_password`) — em produção, considerar senhas distintas.
- Integração de pagamento preparada para **Gerencianet/Efí** (PIX) via
  variáveis `GERENCIANET_*` no `.env`.
- Alternativa moderna ao instalador: a stack Docker Compose do repositório
  `intsoft-app` (`manage-stacks.sh up -n <instância> …`), que já automatiza
  Nginx + SSL por instância.
