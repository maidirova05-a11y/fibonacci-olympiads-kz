# Сайт + функции api/ + приём заявок в Postgres в одном контейнере. Запуск целиком на своём сервере (см. compose.yaml).
# На Vercel этот файл не используется.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 ROOT=/app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/__health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Миграции базы, затем сервер (без DATABASE_URL миграции пропускаются)
CMD ["sh", "-c", "node server/migrate.cjs && exec node server/index.cjs"]
