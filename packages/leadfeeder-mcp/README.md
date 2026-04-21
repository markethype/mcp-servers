# @mcp-servers/leadfeeder-mcp

MCP server wrapping the [Leadfeeder API](https://docs.leadfeeder.com/api/public).

## Tools exposed

| tool | description |
| --- | --- |
| `leadfeeder_list_accounts` | List accounts available to the API key (legacy `/accounts`) |
| `leadfeeder_list_custom_feeds` | Custom feeds for an account (v1) |
| `leadfeeder_list_web_visits` | Identified website visits filtered by feed/date range (v1) |
| `leadfeeder_search_companies` | Firmographic company search (v1 `POST /v1/companies/search`) |
| `leadfeeder_get_company` | Fetch one company by ID (v1) |
| `leadfeeder_enrich_ip` | IP-to-company enrichment (requires an enrichment-enabled plan) |

## Configuration

Set in environment or `.env`:

| variable | required | notes |
| --- | --- | --- |
| `LEADFEEDER_API_KEY` | yes | Personal settings → API keys in Leadfeeder |
| `LEADFEEDER_USER_AGENT` | no | Defaults to `mcp-servers/leadfeeder-mcp` |
| `LEADFEEDER_BASE_URL` | no | Defaults to `https://api.leadfeeder.com` |
| `MCP_TRANSPORT` | no | `stdio` (default) or `http` |
| `PORT` | no | HTTP listen port (default `3000`) |
| `MCP_AUTH_TOKEN` | only for `http` | Bearer token the remote client must send |
| `LOG_LEVEL` | no | `info` default; `silent` to mute |

## Build & run

```bash
pnpm install
pnpm --filter @mcp-servers/leadfeeder-mcp build
LEADFEEDER_API_KEY=lf_xxx pnpm --filter @mcp-servers/leadfeeder-mcp start
```

## Claude Desktop (local, stdio)

macOS config: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "leadfeeder": {
      "command": "node",
      "args": ["/Users/erik/Code/mcp-servers/packages/leadfeeder-mcp/dist/index.js"],
      "env": {
        "LEADFEEDER_API_KEY": "lf_xxx"
      }
    }
  }
}
```

Then restart Claude Desktop. You should see the six `leadfeeder_*` tools listed.

## CLI smoke test (no Claude needed)

Quick way to verify your API key works end-to-end without involving Claude:

```bash
LEADFEEDER_API_KEY=lf_xxx pnpm --filter @mcp-servers/leadfeeder-mcp smoke
```

This spawns the server over stdio, issues `initialize` + `tools/call leadfeeder_list_accounts`,
and prints the response.

## MCP Inspector (stdio or HTTP)

```bash
npx @modelcontextprotocol/inspector node packages/leadfeeder-mcp/dist/index.js
# or for HTTP:
MCP_TRANSPORT=http MCP_AUTH_TOKEN=$(openssl rand -hex 32) LEADFEEDER_API_KEY=lf_xxx \
  pnpm --filter @mcp-servers/leadfeeder-mcp start
# then point the Inspector at http://localhost:3000/mcp with the Bearer token.
```

## Deployment

See [../../README.md](../../README.md) and the `infra/` folder for Azure Container Apps deployment via `azd`.
