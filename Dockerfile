# Сайт на своём сервере (вне Vercel): статика + api/lead.js → Bitrix24.
# Как развернуть — docs/SERVER.md в репозитории az-group-projects.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
# Функция (зависимостей нет) и сервер, который вызывает её вместо Vercel.
COPY vercel.json ./
COPY api ./api
COPY docker/serve.mjs ./docker/serve.mjs
# Сам сайт — только это доступно по URL.
COPY *.html robots.txt sitemap.xml llms.txt ./public/
COPY .well-known ./public/.well-known
COPY assets ./public/assets
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "docker/serve.mjs"]
