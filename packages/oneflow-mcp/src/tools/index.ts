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

export function registerTools(server: McpServer, client: OneflowClient): void {
  server.tool(
    "oneflow_ping",
    "Verify Oneflow API credentials with GET /v1/ping (returns {} when auth works).",
    {},
    async () => {
      try {
        return ok(await client.ping());
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
    },
    async ({ limit, offset, state, workspace_ids }) => {
      try {
        return ok(
          await client.listContracts({
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
    },
    async ({ contract_id }) => {
      try {
        return ok(await client.getContract(contract_id));
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
    },
    async ({ body }) => {
      try {
        return ok(await client.createContract(body));
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
    },
    async ({ limit, offset }) => {
      try {
        return ok(await client.listWorkspaces({ limit, offset }));
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
    },
    async ({ limit, offset, workspace_id }) => {
      try {
        return ok(await client.listTemplates({ limit, offset, workspace_id }));
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
    },
    async ({ limit, offset }) => {
      try {
        return ok(await client.listUsers({ limit, offset }));
      } catch (err) {
        return fail(err);
      }
    },
  );
}
