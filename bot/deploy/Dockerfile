FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV CI=true

# Install tini for proper init process and signal forwarding (SIGTERM / SIGINT)
RUN apk add --no-cache tini \
    && corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package manifests and source
COPY package.json pnpm-lock.yaml* ./
COPY src ./src
COPY config ./config

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile || pnpm install --prod

# Non-root user
USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
