# Projeto Comenta — Plataforma de Atendimento via WhatsApp

Novo projeto **Comenta**: uma plataforma white-label de atendimento multiusuário
via WhatsApp (multi-atendentes, filas, campanhas), baseada na arquitetura
Atendechat/Whaticket e no padrão de projetos da plataforma `intsoft-app`.

## Pasta

Este pacote fica dentro do repositório em:

`projects/comenta/`

## Conteúdo

- `README.md` — este arquivo.
- `ANALISE_INSTALADOR.md` — análise técnica completa do instalador enviado
  (arquitetura, fluxo de instalação, problemas encontrados e correções aplicadas).
- `BRIEF_DEMANDA.md` — resumo estratégico da demanda.
- `codex/CODEX_TASK.md` — tarefa de implementação do produto.
- `instalador/` — instalador CLI adaptado para a marca **Comenta**
  (rebrandado, sanitizado e corrigido — ver análise).

## Arquitetura do produto

| Camada | Tecnologia | Função |
|---|---|---|
| Backend | Node.js / Express + Sequelize | API, filas, integração WhatsApp |
| Frontend | React.js | Painel de atendimento |
| Banco | PostgreSQL | Dados por instância/empresa |
| Cache/Filas | Redis (Docker) | Agendamento e rate-limit de mensagens |
| Processos | PM2 | Backend e frontend em produção |
| Proxy | Nginx + Certbot | Domínios e SSL automáticos |

## Relação com outros repositórios

- **`hebertpaes/intsoft-app`** — plataforma multi-stack (Docker) que gerencia
  instâncias do mesmo produto via `manage-stacks.sh`; serve de referência de
  código do backend/frontend e do padrão de pastas `projects/`.
- **Instalador original (Atendechat)** — base do `instalador/` deste projeto,
  usado para instalação em VPS (instância primária e instâncias adicionais).

## Como usar o instalador (VPS Ubuntu)

```bash
# instância primária (instala dependências do sistema + 1ª instância)
sudo ./install_primaria

# instâncias adicionais (reutiliza dependências já instaladas)
sudo ./install_instancia
```

O instalador pergunta interativamente: senha de deploy, URL do repositório Git
do código, nome da instância, limites de conexões/usuários, domínios e portas.

> **Segurança:** o arquivo `config` (senhas geradas na instalação) não é
> versionado — está no `.gitignore` do instalador.
