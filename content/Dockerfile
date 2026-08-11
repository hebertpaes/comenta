# Robô de conteúdo do blog (curadoria → Ghost). Roda uma vez ou em loop
# (BLOG_INTERVAL_MIN). Publica como rascunho por padrão (BLOG_AUTOPUBLISH=1 publica).
#
# O contexto de build é a RAIZ do monorepo (não content/): o lockfile é único e
# vive na raiz desde a migração para npm workspaces. Sem ele o npm resolveria
# versões novas a cada build, o que a imagem anterior evitava com o lockfile local.
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY saas/api/package.json saas/api/
COPY saas/web/package.json saas/web/
COPY site/package.json site/
COPY content/package.json content/
COPY apps/editor/package.json apps/editor/
# --ignore-scripts pula o postinstall do editor (32 MB de core do FFmpeg).
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

COPY content content

WORKDIR /app/content
CMD ["node", "publish.mjs"]
