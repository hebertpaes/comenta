FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# Inclui devDependencies: o start usa tsx e drizzle-kit (migração/seed) em runtime.
RUN npm install --no-audit --no-fund

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

# tsx roda TS direto; migrações aplicadas pelo entrypoint do compose
CMD ["npx", "tsx", "src/index.ts"]
