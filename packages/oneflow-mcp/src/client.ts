import { HttpClient, HttpError, type Logger } from "@mcp-servers/core";
import type { OneflowEnv } from "./config.js";

/**
 * Thin wrapper around Oneflow's public API (https://developer.oneflow.com/).
 */
export class OneflowClient {
  private readonly http: HttpClient;
  private readonly cfg: OneflowEnv;
  private readonly logger?: Logger;

  constructor(cfg: OneflowEnv, logger?: Logger) {
    this.cfg = cfg;
    this.logger = logger;
    const defaultHeaders: Record<string, string> = {
      "X-Oneflow-API-Token": cfg.ONEFLOW_API_TOKEN,
    };
    if (cfg.ONEFLOW_USER_EMAIL) {
      defaultHeaders["X-Oneflow-User-Email"] = cfg.ONEFLOW_USER_EMAIL;
    }
    this.http = new HttpClient({
      baseUrl: cfg.ONEFLOW_BASE_URL,
      defaultHeaders,
      logger,
    });
  }

  /** Return a new client that uses the given API token instead of the configured one. */
  withApiToken(apiToken: string): OneflowClient {
    return new OneflowClient({ ...this.cfg, ONEFLOW_API_TOKEN: apiToken }, this.logger);
  }

  ping(): Promise<unknown> {
    return this.http.get("/v1/ping");
  }

  listContracts(params: {
    limit?: number;
    offset?: number;
    state?: string;
    workspace_ids?: string;
  }): Promise<unknown> {
    return this.http.get("/v1/contracts", {
      limit: params.limit,
      offset: params.offset,
      state: params.state,
      workspace_ids: params.workspace_ids,
    });
  }

  getContract(contractId: string): Promise<unknown> {
    return this.http.get(`/v1/contracts/${encodeURIComponent(contractId)}`);
  }

  createContract(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/v1/contracts/create", body);
  }

  listWorkspaces(params: { limit?: number; offset?: number }): Promise<unknown> {
    return this.http.get("/v1/workspaces", {
      limit: params.limit,
      offset: params.offset,
    });
  }

  listTemplates(params: {
    limit?: number;
    offset?: number;
    workspace_id?: string;
  }): Promise<unknown> {
    return this.http.get("/v1/templates", {
      limit: params.limit,
      offset: params.offset,
      workspace_id: params.workspace_id,
    });
  }

  listUsers(params: { limit?: number; offset?: number }): Promise<unknown> {
    return this.http.get("/v1/users", {
      limit: params.limit,
      offset: params.offset,
    });
  }
}

export { HttpError };
