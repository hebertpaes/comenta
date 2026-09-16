# Codex Task — Comenta

## Objetivo

Implementar a plataforma **Comenta** (atendimento via WhatsApp, white-label)
usando como referência a base Atendechat/Whaticket do repositório
`intsoft-app` e o instalador em `projects/comenta/instalador/`.

## Escopo obrigatório

- Backend Express + Sequelize (PostgreSQL) com autenticação JWT
  (access + refresh) e limites por instância (`USER_LIMIT`,
  `CONNECTIONS_LIMIT`).
- Frontend React com identidade visual Comenta (substituir marca, cores e
  logotipos da base).
- Integração WhatsApp via WhatsApp Web (Puppeteer/Baileys conforme a base).
- Filas de atendimento, setores e transferência entre atendentes.
- Agendamento de mensagens via Redis.
- Faturamento PIX (Gerencianet/Efí) usando as variáveis `GERENCIANET_*`.
- Deploy:
  - Caminho A — VPS: instalador `projects/comenta/instalador/`
    (PM2 + Nginx + Certbot).
  - Caminho B — Docker: stack compose no padrão `intsoft-app`
    (`manage-stacks.sh up -n comenta -u https://api.<domínio> -w https://app.<domínio>`).
- Multi-instância: cada empresa com banco, Redis e processos isolados.

## Critérios de aceite

- Instalação limpa em Ubuntu 22.04 via `install_primaria` sem intervenção
  manual além das perguntas do CLI.
- Nenhuma credencial hardcoded em código ou scripts (verificar com secret
  scanning antes do push).
- Painel acessível via HTTPS com certificado válido.
- Uma conexão WhatsApp funcional (QR code → conectado → mensagem de teste).

## Fora de escopo (por enquanto)

- Apps móveis nativos.
- API pública para terceiros.
