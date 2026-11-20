FROM node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS=--max-old-space-size=8192
ENV CI=true

RUN npm i -g corepack && corepack enable

WORKDIR /app

# Copy monorepo manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY internal ./internal
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts

# Install dependencies using cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build shell
RUN pnpm --filter @operon/shell build

# Production Stage: Nginx Alpine
FROM nginx:stable-alpine AS production

RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=builder /app/apps/shell/dist /usr/share/nginx/html

# Copy nginx config
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
