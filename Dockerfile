# syntax=docker/dockerfile:1
# Imagem multi-arch (amd64, arm64, arm/v7): nenhuma dependência nativa, então não há etapa de compilação.

FROM node:25-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:25-alpine
ENV NODE_ENV=production \
    PORT=4242 \
    HOST=0.0.0.0 \
    STATUS_PATH=/dados/status.json
WORKDIR /app

# Arquivos ficam com dono root e o processo roda como "node": a aplicação não consegue alterar o próprio código.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

USER node
EXPOSE 4242

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" > /dev/null || exit 1

CMD ["node", "src/server.js"]
