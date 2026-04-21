# @mcp-servers/oneflow-mcp

MCP server wrapping the [Oneflow public API](https://developer.oneflow.com/).

## Tools exposed

| tool | description |
| --- | --- |
| `oneflow_ping` | Health check via `GET /v1/ping` (returns `{}` when auth works) |
| `oneflow_list_contracts` | List contracts with optional `limit`, `offset`, `state`, `workspace_ids` |
| `oneflow_get_contract` | Fetch one contract by ID (`GET /v1/contracts/{contract_id}`) |
| `oneflow_create_contract` | Create a contract (`POST /v1/contracts/create`) |
| `oneflow_list_workspaces` | List workspaces (`GET /v1/workspaces`) |
| `oneflow_list_templates` | List templates (`GET /v1/templates`) |
| `oneflow_list_users` | List users (`GET /v1/users`) |

## Configuration

Set in environment or `.env`:

| variable | required | notes |
| --- | --- | --- |
| `ONEFLOW_API_TOKEN` | yes | API token from Oneflow; sent as `X-Oneflow-API-Token` |
| `ONEFLOW_USER_EMAIL` | no | When set, sent as `X-Oneflow-User-Email` to scope permissions to that user |
| `ONEFLOW_BASE_URL` | no | Defaults to `https://api.oneflow.com` |
| `MCP_TRANSPORT` | no | `stdio` (default) or `http` |
| `PORT` | no | HTTP listen port (default `3000`) |
| `MCP_AUTH_TOKEN` | only for `http` | Bearer token the remote client must send |
| `LOG_LEVEL` | no | `info` default; `silent` to mute |

## Build & run

```bash
pnpm install
pnpm --filter @mcp-servers/oneflow-mcp build
ONEFLOW_API_TOKEN=xxx pnpm --filter @mcp-servers/oneflow-mcp start
```

## Claude Desktop (local, stdio)

macOS config: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "oneflow": {
      "command": "node",
      "args": ["/Users/erik/Code/mcp-servers/packages/oneflow-mcp/dist/index.js"],
      "env": {
        "ONEFLOW_API_TOKEN": "your-token"
      }
    }
  }
}
```

Then restart Claude Desktop. You should see the seven `oneflow_*` tools listed.

## CLI smoke test (no Claude needed)

Quick way to verify your API token works end-to-end without involving Claude:

```bash
ONEFLOW_API_TOKEN=xxx pnpm --filter @mcp-servers/oneflow-mcp smoke
```

This spawns the server over stdio, issues `initialize` + `tools/call oneflow_ping`,
and prints the response.

## MCP Inspector (stdio or HTTP)

```bash
npx @modelcontextprotocol/inspector node packages/oneflow-mcp/dist/index.js
# or for HTTP:
MCP_TRANSPORT=http MCP_AUTH_TOKEN=$(openssl rand -hex 32) ONEFLOW_API_TOKEN=xxx \
  pnpm --filter @mcp-servers/oneflow-mcp start
# then point the Inspector at http://localhost:3000/mcp with the Bearer token.
```

## Deployment

See [../../README.md](../../README.md) and the `infra/` folder for Azure Container Apps deployment via `azd`.
