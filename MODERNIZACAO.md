# Modernização do Comenta

Documento de trabalho da reescrita. Branch: `claude/modernizacao`, a partir de
`claude/project-creation-az9g99`.

## Baseline (medido em 2026-07-25, antes de qualquer mudança)

| Projeto               | Stack                                    | `npm run build`                |
| --------------------- | ---------------------------------------- | ------------------------------ |
| `saas/api`            | Fastify 5, Drizzle 0.38, Node 22, TS 5.7 | ✅                             |
| `saas/web`            | React 18, Vite 6, **JavaScript puro**    | ✅ (após `node_modules` limpo) |
| `site`                | Next 14, React 18, Tailwind 3            | ✅                             |
| `.` (editor de vídeo) | React 18, Vite 5, ffmpeg.wasm            | ✅                             |

Total: ~10.000 linhas de código em 143 arquivos versionados.

Nota: o build de `saas/web` falhava com `esbuild: Host version "0.25.12" does not
match binary version "0.21.5"` por causa de um `node_modules` obsoleto no disco —
não era defeito de código. `npm ci` limpo resolveu.

## Diagnóstico

### O que está bom e **não** vai ser reescrito

A API (`saas/api`) é sólida: 17 módulos de rota separados, Fastify 5, Drizzle,
OpenAPI via `@fastify/swagger`, rate limit no Redis, error handler central,
graceful shutdown. 16 dos 17 módulos já validam entrada com Zod.

### Problemas reais encontrados

1. **O painel é um arquivo só.** `saas/web/src/App.jsx` tem 1.973 linhas, 32
   componentes, 102 `useState` e 22 `useEffect`. Sem TypeScript, sem router
   (navegação por `useState("dashboard")`, então nenhuma tela tem URL própria e
   F5 sempre volta pro dashboard), sem camada de cache de dados.

2. **Sessão morre em 15 minutos.** `ACCESS_TOKEN_TTL` é `15m` e a API expõe
   `POST /auth/refresh`, mas o cliente (`saas/web/src/api.js`) guarda o refresh
   token no `localStorage` e **nunca o usa**. Passados 15 min, toda requisição
   falha até o usuário deslogar e logar de novo.

3. **Zero testes automatizados no repo inteiro.** Nenhum `*.test.*`, nenhum
   `*.spec.*`. O que existe é `saas/api/test/smoke.sh`, um script curl.

4. **CI só faz build.** `.github/workflows/ci.yml` roda `npm run build` nos 4
   projetos. Não há lint, typecheck isolado nem teste. Também não existe ESLint
   nem Prettier configurado em lugar nenhum.

5. **Quatro projetos, quatro `package-lock.json`, nenhum código compartilhado.**
   Os contratos de dados entre API e painel são reescritos à mão dos dois lados,
   sem nada que garanta que continuem iguais.

6. ~~**`ratings.ts`** é o único módulo da API sem validação Zod.~~ **Errado.**
   O módulo tem uma rota só, `GET /ratings`, que não recebe nenhuma entrada —
   não há o que validar. A ausência de Zod ali não é lacuna.

7. **Deploy duplicado.** `deploy/` na raiz e `saas/deploy/` — dois
   `docker-compose.yml` e duas configs de nginx descrevendo o mesmo sistema.

8. **Site com dois roteadores.** `site/` mistura App Router (`app/`) e Pages
   Router (`pages/preview.tsx`, 876 linhas). O `tsconfig.tsbuildinfo` está
   versionado por engano.

## Etapas

- [x] **0** — Branch e baseline
- [x] **1** — Monorepo npm workspaces + `packages/shared` com os contratos Zod
- [x] **2** — ESLint 10 flat + Prettier + Vitest + CI com lint/typecheck/test/build
- [x] **3** — Reescrita do painel: TS, React 19, Vite 8, React Router 8,
      TanStack Query, estrutura por feature, refresh token funcionando
- [x] **4** — API: testes de auth e isolamento multi-tenant contra Postgres
      real. A migração para `fastify-type-provider-zod` ficou de fora — motivo
      abaixo.
- [x] **5** — Site: Next **16** (não 15 — é a versão atual), React 19,
      Tailwind 4, só App Router, TypeScript estrito
- [x] **6** — Consolidar `deploy/` e `saas/deploy/` num só

Entrega: um commit por etapa, sem push. Nada vai para o remoto sem ordem
explícita.

## Divergências encontradas entre o código e o que estava documentado

Extrair os contratos para `packages/shared` obrigou a conferir cada valor
contra o que o código realmente faz. Três comentários do schema estavam
desatualizados:

| Onde                | Comentário dizia                          | Código faz                                               |
| ------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `automations.type`  | `welcome \| business_hours \| keyword`    | também aceita `ai` e `rating`                            |
| `channels.status`   | `connected \| connecting \| disconnected` | `modules/channels.ts` também grava `configured`          |
| `conversationNotes` | —                                         | a rota devolve o autor como `author`, não `authorUserId` |

## O que ficou de fora da etapa 4, e por quê

O plano previa migrar as rotas para `fastify-type-provider-zod`. **Não fiz**, e
a decisão é minha — vale discordar.

O ganho seria o `/docs` passar a descrever os corpos de requisição, que hoje
só documenta os esquemas de segurança. O custo é alto para o que entrega:

- São **84 chamadas de `parse()` em 17 módulos**. As entradas **já são
  validadas** com Zod hoje; a migração troca a forma, não adiciona proteção.
- Os testes de integração cobrem 5 dos 17 módulos. Mexer nos outros 12 sem
  rede de proteção é justamente o tipo de mudança grande e silenciosa que
  costuma quebrar em produção.
- Se junto vierem `response` schemas — que é o que faz o OpenAPI ficar
  completo —, o Fastify passa a **serializar** por eles e **descarta em
  silêncio** qualquer campo ausente do esquema. Num painel que acabou de ser
  reescrito contra as respostas atuais, esse é um jeito fácil de sumir com
  dados sem ninguém perceber.

Ordem que eu sugiro, se quiser seguir: ampliar os testes de integração para os
módulos restantes primeiro, e só então migrar — módulo a módulo, com os testes
como rede.

## Pendências conhecidas

- **`any` restantes: 18**, de 34 no começo. Os 15 do site foram eliminados na
  etapa 5. Sobraram 17 em `saas/api/src/channels/whatsapp.ts` (o Baileys tipa
  mal o que devolve) e 1 em `modules/channels.ts`. O lint avisa mas não
  reprova; vira erro quando zerar.
- **Progresso das aulas** da Academia continua no `localStorage`: não existe
  endpoint de progresso na API, então não acompanha o usuário entre
  dispositivos. Mantido como estava para não inventar comportamento.
- ~~**`site/pages/preview.tsx`** encadeia `setTimeout` sem cancelar no
  unmount.~~ Resolvido na etapa 5: o handle vai num ref e um efeito de
  limpeza cancela ao desmontar.
