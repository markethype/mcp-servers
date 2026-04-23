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

  // In HTTP mode, create a fresh McpServer per request so the per-user
  // X-Leadfeeder-Api-Key header is picked up by the tool handlers.
  const serverFactory = isStdio
    ? undefined
    : (headers: Record<string, string | string[] | undefined>) => {
        const apiKey = (headers["x-leadfeeder-api-key"] as string | undefined) || cfg.LEADFEEDER_API_KEY;
        const requestClient = new LeadfeederClient({ ...cfg, LEADFEEDER_API_KEY: apiKey }, logger);
        const requestServer = new McpServer({ name: "leadfeeder-mcp", version: "0.1.0" });
        registerTools(requestServer, requestClient);
        return requestServer;
      };

  await runServer(mcp, {
    mode: cfg.MCP_TRANSPORT,
    authToken: cfg.MCP_AUTH_TOKEN,
    port: cfg.PORT,
    logger,
    serverFactory,
  });
}

main().catch((err) => {
  process.stderr.write(`[leadfeeder-mcp] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
