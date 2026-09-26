# syntax=docker/dockerfile:1

# Shared build for both apps; the target service is chosen with APP_NAME.
ARG NODE_VERSION=22.18.0
ARG APP_NAME=web

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/adapters/package.json packages/adapters/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/gedcom/package.json packages/gedcom/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm build

# Prune to production dependencies only, so the runtime image carries no build tooling.
FROM build AS prune
ARG APP_NAME
RUN pnpm --filter "@family-tree/${APP_NAME}" deploy --prod --legacy /out

FROM node:${NODE_VERSION}-alpine AS runtime
ARG APP_NAME
ENV NODE_ENV=production
ENV APP_NAME=${APP_NAME}
WORKDIR /app

RUN addgroup -S app && adduser -S -G app app
COPY --from=prune --chown=app:app /out ./
USER app

EXPOSE 3000
CMD ["node", "dist/index.js"]
