# syntax=docker/dockerfile:1
# Imagem de produção do site/plataforma (Next.js, output: standalone).
# O contexto de build é a RAIZ do monorepo (não site/): o lockfile é único e
# vive na raiz desde a migração para npm workspaces.

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
# Todos os manifestos de workspace: o npm ci valida o lockfile contra a árvore
# inteira. --ignore-scripts pula o postinstall do editor (32 MB de FFmpeg).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY saas/api/package.json saas/api/
COPY saas/web/package.json saas/web/
COPY site/package.json site/
COPY content/package.json content/
COPY apps/editor/package.json apps/editor/
RUN npm ci --ignore-scripts --no-audit --no-fund

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY site site
# Além do node_modules içado da raiz, o do próprio workspace: o npm não iça o
# symlink de bin do next, que fica em site/node_modules/.bin.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/site/node_modules ./site/node_modules
ENV NEXT_TELEMETRY_DISABLED=1
# URLs do painel/API embutidas no build (NEXT_PUBLIC_*). Sem args, caem no
# domínio de produção pelo fallback no código.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WHATSAPP
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WHATSAPP=$NEXT_PUBLIC_WHATSAPP
WORKDIR /app/site
RUN npm run build

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# O standalone do Next num monorepo preserva a estrutura de diretórios: o
# server.js sai em .next/standalone/site/server.js, não na raiz do standalone.
COPY --from=build /app/site/public ./site/public
COPY --from=build --chown=nextjs:nodejs /app/site/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/site/.next/static ./site/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "site/server.js"]
