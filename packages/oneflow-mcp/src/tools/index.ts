import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OneflowClient } from "../client.js";
import { explainError } from "../errors.js";

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function fail(err: unknown): ToolResult {
  return { content: [{ type: "text", text: explainError(err) }], isError: true };
}

const apiTokenParam = {
  api_token: z
    .string()
    .optional()
    .describe(
      "Your Oneflow API token (from Marketplace → API tokens). " +
        "Required if ONEFLOW_API_TOKEN is not set on the server.",
    ),
};

function resolveClient(client: OneflowClient, apiToken: string | undefined): OneflowClient {
  if (apiToken) return client.withApiToken(apiToken);
  return client;
}

export function registerTools(server: McpServer, client: OneflowClient): void {
  server.tool(
    "oneflow_ping",
    "Verify Oneflow API credentials with GET /v1/ping (returns {} when auth works).",
    { ...apiTokenParam },
    async ({ api_token }) => {
      try {
        return ok(await resolveClient(client, api_token).ping());
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "oneflow_list_contracts",
    "List contracts (GET /v1/contracts). Supports pagination and filters per Oneflow API docs.",
    {
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().nonnegative().optional(),
      state: z.string().optional(),
      workspace_ids: z.string().optional().describe("Comma-separated workspace IDs."),
      ...apiTokenParam,
    },
    async ({ limit, offset, state, workspace_ids, api_token }) => {
      try {
        return ok(
          await resolveClient(client, api_token).listContracts({
            limit,
            offset,
            state,
            workspace_ids,
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "oneflow_get_contract",
    "Fetch a single contract by ID (GET /v1/contracts/{contract_id}).",
    {
      contract_id: z.string().describe("Oneflow contract ID."),
      ...apiTokenParam,
    },
    async ({ contract_id, api_token }) => {
      try {
        return ok(await resolveClient(client, api_token).getContract(contract_id));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "oneflow_create_contract",
    "Create a contract (POST /v1/contracts/create). Pass the JSON body as documented at https://developer.oneflow.com/.",
    {
      body: z
        .record(z.unknown())
        .describe("Raw request body for POST /v1/contracts/create."),
      ...apiTokenParam,
    },
    async ({ body, api_token }) => {
      try {
        return ok(await resolveClient(client, api_token).createContract(body));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "oneflow_list_workspaces",
    "List workspaces (GET /v1/workspaces).",
    {
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().nonnegative().optional(),
      ...apiTokenParam,
    },
    async ({ limit, offset, api_token }) => {
      try {
        return ok(await resolveClient(client, api_token).listWorkspaces({ limit, offset }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "oneflow_list_templates",
    "List contract templates (GET /v1/templates).",
    {
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().nonnegative().optional(),
      workspace_id: z.string().optional(),
      ...apiTokenParam,
    },
    async ({ limit, offset, workspace_id, api_token }) => {
      try {
        return ok(await resolveClient(client, api_token).listTemplates({ limit, offset, workspace_id }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "oneflow_list_users",
    "List users (GET /v1/users).",
    {
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().nonnegative().optional(),
      ...apiTokenParam,
    },
    async ({ limit, offset, api_token }) => {
      try {
        return ok(await resolveClient(client, api_token).listUsers({ limit, offset }));
      } catch (err) {
        return fail(err);
      }
    },
  );
}
