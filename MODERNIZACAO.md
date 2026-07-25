# Modernização do Comenta

Documento de trabalho da reescrita. Branch: `claude/modernizacao`, a partir de
`claude/project-creation-az9g99`.

## Baseline (medido em 2026-07-25, antes de qualquer mudança)

| Projeto | Stack | `npm run build` |
| --- | --- | --- |
| `saas/api` | Fastify 5, Drizzle 0.38, Node 22, TS 5.7 | ✅ |
| `saas/web` | React 18, Vite 6, **JavaScript puro** | ✅ (após `node_modules` limpo) |
| `site` | Next 14, React 18, Tailwind 3 | ✅ |
| `.` (editor de vídeo) | React 18, Vite 5, ffmpeg.wasm | ✅ |

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

6. **`ratings.ts`** é o único módulo da API sem validação Zod.

7. **Deploy duplicado.** `deploy/` na raiz e `saas/deploy/` — dois
   `docker-compose.yml` e duas configs de nginx descrevendo o mesmo sistema.

8. **Site com dois roteadores.** `site/` mistura App Router (`app/`) e Pages
   Router (`pages/preview.tsx`, 876 linhas). O `tsconfig.tsbuildinfo` está
   versionado por engano.

## Etapas

- [x] **0** — Branch e baseline
- [ ] **1** — Monorepo npm workspaces + `packages/shared` com os contratos Zod
- [ ] **2** — ESLint 9 flat + Prettier + Vitest + CI com lint/typecheck/test/build
- [ ] **3** — Reescrita do painel: TS, React 19, Vite 7, React Router 7,
  TanStack Query, estrutura por feature, refresh token funcionando
- [ ] **4** — API: rotas tipadas via `fastify-type-provider-zod`, testes de
  integração de auth / conversas / isolamento multi-tenant
- [ ] **5** — Site: Next 15, React 19, Tailwind 4, só App Router
- [ ] **6** — Consolidar `deploy/` e `saas/deploy/` num só

Entrega: um commit por etapa, sem push. Nada vai para o remoto sem ordem
explícita.
