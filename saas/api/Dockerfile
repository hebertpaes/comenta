FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

# tsx roda TS direto; migrações aplicadas pelo entrypoint do compose
CMD ["npx", "tsx", "src/index.ts"]
