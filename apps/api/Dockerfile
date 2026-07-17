FROM node:24-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @crm/api...

COPY apps/api apps/api
RUN pnpm --filter @crm/api build \
    && pnpm --filter @crm/api deploy --legacy --prod /opt/api

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S crm && adduser -S crm -G crm
COPY --from=build --chown=crm:crm /opt/api ./

USER crm
EXPOSE 3000
CMD ["node", "dist/main.js"]

