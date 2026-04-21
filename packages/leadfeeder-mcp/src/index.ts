#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createLogger, runServer } from "@mcp-servers/core";
import { loadConfig } from "./config.js";
import { LeadfeederClient } from "./client.js";
import { registerTools } from "./tools/index.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const isStdio = cfg.MCP_TRANSPORT === "stdio";

  const logger = createLogger({
    name: "leadfeeder-mcp",
    level: cfg.LOG_LEVEL,
    stdio: isStdio,
  });

  const client = new LeadfeederClient(cfg, logger);

  const mcp = new McpServer({
    name: "leadfeeder-mcp",
    version: "0.1.0",
  });
  registerTools(mcp, client);

  await runServer(mcp, {
    mode: cfg.MCP_TRANSPORT,
    authToken: cfg.MCP_AUTH_TOKEN,
    port: cfg.PORT,
    logger,
  });
}

main().catch((err) => {
  process.stderr.write(`[leadfeeder-mcp] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
