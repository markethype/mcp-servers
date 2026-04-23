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
| `LEADFEEDER_API_KEY` | no | Personal settings → API keys in Leadfeeder. Can be supplied per tool call instead (see below). |
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

## Claude Desktop setup

macOS config: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Option A — stdio (local, recommended)

Claude Desktop spawns the server as a child process. Set your API key once in the `env` block — no `MCP_AUTH_TOKEN` needed (the OS process model secures the stdio pipe).

```json
{
  "mcpServers": {
    "leadfeeder": {
      "command": "/path/to/node",
      "args": ["/path/to/leadfeeder-mcp/dist/index.js"],
      "env": {
        "LEADFEEDER_API_KEY": "lf_xxx"
      }
    }
  }
}
```

### Option B — HTTP (shared/remote server)

Run the server as a persistent daemon (see [Build & run](#build--run)), then point Claude Desktop at it with two headers set once:

```json
{
  "mcpServers": {
    "leadfeeder": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_AUTH_TOKEN>",
        "X-Leadfeeder-Api-Key": "lf_xxx"
      }
    }
  }
}
```

The server validates `Authorization` (existing bearer check) and reads `X-Leadfeeder-Api-Key` per request to build a per-user client — so different Claude Desktop users can each supply their own key to the same server.

### Option C — per tool call (no config required)

Omit the `env` block and headers entirely. Each tool exposes an optional `api_key` argument that Claude will use if you mention your key in the prompt.

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
