# Robô de conteúdo do blog (curadoria → Ghost). Roda uma vez ou em loop
# (BLOG_INTERVAL_MIN). Publica como rascunho por padrão (BLOG_AUTOPUBLISH=1 publica).
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
CMD ["node", "publish.mjs"]
