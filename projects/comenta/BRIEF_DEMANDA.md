# Comenta — Brief da demanda

## Objetivo

Criar o projeto **Comenta**: plataforma white-label de atendimento via
WhatsApp, multiusuário e multi-instância, com identidade própria, baseada na
arquitetura Atendechat/Whaticket já dominada pela equipe (repositório
`intsoft-app`) e no instalador analisado nesta sessão.

## Escopo desta fase

1. Análise do instalador enviado (concluída — ver `ANALISE_INSTALADOR.md`).
2. Instalador rebrandado, sanitizado e corrigido (concluído — `instalador/`).
3. Documentação do projeto no padrão `projects/` da plataforma (este pacote).

## Funcionalidades do produto (herdadas da base)

- Multi-atendentes com filas e setores.
- Múltiplas conexões WhatsApp por instância (limite configurável).
- Limite de usuários/atendentes por instância (licenciamento).
- Agendamento de mensagens (Redis).
- Cobrança PIX via Gerencianet/Efí (variáveis já previstas no `.env`).
- Gestão de instâncias: instalar, atualizar, bloquear, desbloquear,
  alterar domínios e deletar.

## Próxima fase

1. Definir identidade visual Comenta (logo, cores, tipografia).
2. Publicar o código do backend/frontend em repositório próprio para o
   `link_git` do instalador.
3. Decidir modelo de deploy padrão: instalador VPS (PM2) ou stacks Docker
   (`intsoft-app/manage-stacks.sh`).
4. Configurar domínio e instância piloto (ex.: `app.comenta.com.br` /
   `api.comenta.com.br`).
5. Personalizar frontend com a marca Comenta.
6. Revogar o token exposto no instalador original e criar deploy keys novas.
