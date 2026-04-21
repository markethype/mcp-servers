# mcp-servers

TypeScript monorepo of Model Context Protocol servers wrapping SaaS APIs.

- [`packages/core`](packages/core) — shared building blocks (config, HTTP client, logger, transport bootstrap)
- [`packages/leadfeeder-mcp`](packages/leadfeeder-mcp) — wraps the [Leadfeeder API](https://docs.leadfeeder.com/api/public)
- [`packages/oneflow-mcp`](packages/oneflow-mcp) — wraps the [Oneflow API](https://developer.oneflow.com/reference/api-overview) _(phase 2)_

Both servers support the two standard MCP transports from a single binary:

- **stdio** — for local Claude Desktop / Claude Code
- **Streamable HTTP** — for remote deployment on Azure Container Apps

## Quick start (local)

```bash
nvm use           # Node 22
corepack enable   # pnpm
pnpm install
cp .env.example .env   # fill in LEADFEEDER_API_KEY
pnpm --filter @mcp-servers/leadfeeder-mcp build
pnpm --filter @mcp-servers/leadfeeder-mcp start
```

See each package's README for:

- Full local dev loop
- Claude Desktop configuration
- Remote / Azure deployment

## Repository layout

```
mcp-servers/
├── packages/
│   ├── core/               # shared lib
│   ├── leadfeeder-mcp/
│   └── oneflow-mcp/        # (phase 2)
├── .github/workflows/      # CI + deploy
└── ...
```

## Scripts

| command | what |
| --- | --- |
| `pnpm build` | build all packages |
| `pnpm typecheck` | type-check all packages |
| `pnpm test` | run vitest suites |
| `pnpm dev:leadfeeder` | run leadfeeder-mcp in watch mode |
