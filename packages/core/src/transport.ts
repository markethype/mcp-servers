import express, { type NextFunction, type Request, type Response } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Logger } from "./logger.js";

export type TransportMode = "stdio" | "http";

export interface RunServerOptions {
  mode: TransportMode;
  /** Required for mode=http. Expected `Authorization: Bearer <token>`. */
  authToken?: string;
  /** Port to listen on (mode=http). Default 3000. */
  port?: number;
  logger?: Logger;
  /**
   * HTTP mode only. When provided, called per request with the incoming
   * headers to produce a fresh McpServer (and thus a fresh service client).
   * Use this to read a per-user service key from a custom request header
   * (e.g. X-Leadfeeder-Api-Key) so each caller can supply their own key
   * without it being baked into the shared server process.
   * Falls back to `server` when not provided.
   */
  serverFactory?: (headers: Record<string, string | string[] | undefined>) => McpServer;
}

export async function runServer(server: McpServer, opts: RunServerOptions): Promise<void> {
  if (opts.mode === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    opts.logger?.info("MCP server connected via stdio");
    return;
  }

  if (!opts.authToken) {
    throw new Error("authToken is required when mode=http");
  }
  const port = opts.port ?? 3000;
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  const bearerAuth = createBearerAuth(opts.authToken);

  // Stateless mode per Microsoft ACA sample: create a fresh transport per
  // request. This is safe because Streamable HTTP is request/response, not a
  // persistent WebSocket. When serverFactory is provided we also create a
  // fresh McpServer per request so each caller's headers (e.g. a per-user
  // service API key) are reflected in the server's tool handlers.
  const handleMcp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const effectiveServer = opts.serverFactory
        ? opts.serverFactory(req.headers as Record<string, string | string[] | undefined>)
        : server;
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on("close", () => {
        transport.close().catch(() => {});
      });
      await effectiveServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      next(err);
    }
  };

  app.post("/mcp", bearerAuth, handleMcp);
  app.get("/mcp", bearerAuth, handleMcp);
  app.delete("/mcp", bearerAuth, handleMcp);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    opts.logger?.error({ err }, "unhandled error in /mcp handler");
    if (res.headersSent) return;
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null,
    });
  });

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      opts.logger?.info({ port }, "MCP HTTP server listening on /mcp");
      resolve();
    });
  });
}

function createBearerAuth(expected: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match || !timingSafeEqual(match[1]!, expected)) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized" },
        id: null,
      });
      return;
    }
    next();
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
