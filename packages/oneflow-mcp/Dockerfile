# syntax=docker/dockerfile:1.7

# ---- builder ---------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.12.2 --activate

# Copy lockfiles and workspace manifests first for better layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/tsconfig.json ./packages/core/
COPY packages/oneflow-mcp/package.json packages/oneflow-mcp/tsconfig.json ./packages/oneflow-mcp/

RUN pnpm install --frozen-lockfile

COPY packages/core ./packages/core
COPY packages/oneflow-mcp ./packages/oneflow-mcp

RUN pnpm --filter @mcp-servers/core... build \
 && pnpm --filter @mcp-servers/oneflow-mcp build

# Produce a self-contained deploy folder with only production deps resolved.
RUN pnpm --filter @mcp-servers/oneflow-mcp --prod deploy /deploy

# ---- runtime ---------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    MCP_TRANSPORT=http \
    PORT=3000
# Drop root.
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /deploy /app
USER app
EXPOSE 3000
# Simple container-level healthcheck against the Express /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
