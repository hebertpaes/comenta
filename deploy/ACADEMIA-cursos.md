# Academia Comenta — cursos e treinamentos (Fase 6)

Plataforma de cursos com vídeo dentro do próprio painel. Serve para treinar a
equipe no Comenta e nas ferramentas. É nativa (API + Postgres), não precisa de
serviço extra.

## Onde fica
Painel → aba **🎓 Academia**. Todo usuário logado (admin e atendentes) vê e
assiste aos cursos. **Admins** também criam/editam cursos e aulas pela tela.

## O que já vem pronto
No primeiro boot, o seed cria 4 cursos de treinamento (idempotente):
1. 🚀 **Comece pelo Comenta** — painel, conversas e times
2. 📲 **WhatsApp e canais** — conectar por QR e o fluxo site+WhatsApp
3. 🤖 **Automação e bot de fluxo** — respostas automáticas
4. 🧩 **Ferramentas open-source** — n8n, Metabase e NocoDB

Cada aula tem resumo em texto; o campo de vídeo vem vazio para você colar os
seus links (nada de conteúdo de terceiros embutido sem querer).

## Como usar
- **Assistir**: abra um curso → escolha a aula → veja o vídeo e o conteúdo →
  **Marcar como concluída**. O progresso (barra %) fica salvo no navegador.
- **Criar curso** (admin): aba Academia → *Novo curso* (emoji, título, nível,
  descrição).
- **Adicionar aulas** (admin): abra o curso → *Adicionar aula* (título, link do
  vídeo, conteúdo). Aceita **YouTube**, **Vimeo** e arquivos **.mp4/.webm**;
  outros links viram botão "abrir em nova aba".

## API (para integrações)
- `GET /courses` · `GET /courses/:id` — leitura (qualquer usuário logado)
- `POST /courses` · `PATCH /courses/:id` · `DELETE /courses/:id` — admin
- `POST /courses/:id/lessons` · `PATCH /lessons/:id` · `DELETE /lessons/:id` — admin

As tabelas `courses` e `lessons` são criadas automaticamente no boot da API
(`drizzle-kit push`). O progresso do aluno é por navegador (localStorage); se
quiser progresso por usuário no servidor, dá para evoluir numa próxima fase.
