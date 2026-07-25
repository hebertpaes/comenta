# Imagem da API. O contexto de build é a RAIZ do monorepo (não saas/api):
# a API depende de @comenta/shared, que é um workspace local e não existe no
# registry — precisa entrar na imagem pelo próprio repositório.
FROM node:22-alpine

WORKDIR /app

# Manifestos antes do código: enquanto as dependências não mudam, o Docker
# reaproveita a camada do npm ci. Todos os manifestos de workspace entram
# porque o npm ci valida o lockfile contra a árvore inteira.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY saas/api/package.json saas/api/
COPY saas/web/package.json saas/web/
COPY site/package.json site/
COPY content/package.json content/
COPY apps/editor/package.json apps/editor/

# --ignore-scripts: o postinstall do @comenta/editor copia os 32 MB do core do
# FFmpeg, que não têm nada a ver com a API.
# Mantém devDependencies: o start usa tsx e drizzle-kit (migração/seed) em runtime.
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY packages/shared packages/shared
RUN npm run build -w @comenta/shared

COPY saas/api saas/api

ENV NODE_ENV=production
EXPOSE 4000

WORKDIR /app/saas/api
# tsx roda TS direto; migrações aplicadas pelo entrypoint do compose
CMD ["npx", "tsx", "src/index.ts"]
