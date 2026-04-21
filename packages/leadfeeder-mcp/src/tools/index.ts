import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LeadfeederClient } from "../client.js";
import { explainError } from "../errors.js";

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function fail(err: unknown): ToolResult {
  return { content: [{ type: "text", text: explainError(err) }], isError: true };
}

export function registerTools(server: McpServer, client: LeadfeederClient): void {
  server.tool(
    "leadfeeder_list_accounts",
    "List the Leadfeeder accounts accessible with the current API key. Useful for discovering account_id values required by other tools.",
    {},
    async () => {
      try {
        return ok(await client.listAccounts());
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "leadfeeder_list_custom_feeds",
    "List the custom feeds for a given Leadfeeder account (new v1 API).",
    {
      account_id: z.string().describe("Leadfeeder account ID (from leadfeeder_list_accounts)."),
      include: z.string().optional().describe("Optional comma-separated include expansions."),
    },
    async ({ account_id, include }) => {
      try {
        return ok(await client.listCustomFeeds({ accountId: account_id, include }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "leadfeeder_list_web_visits",
    "Retrieve web visits (companies identified on your site) for an account, optionally filtered by custom feed and date range (new v1 API).",
    {
      account_id: z.string().describe("Leadfeeder account ID."),
      custom_feed_id: z.string().optional().describe("Filter to a specific custom feed."),
      start_date: z.string().optional().describe("Inclusive start date in YYYY-MM-DD."),
      end_date: z.string().optional().describe("Inclusive end date in YYYY-MM-DD."),
      page_size: z.number().int().positive().max(100).optional(),
      page_cursor: z.string().optional().describe("Cursor from a previous response for pagination."),
    },
    async ({ account_id, custom_feed_id, start_date, end_date, page_size, page_cursor }) => {
      try {
        return ok(
          await client.listWebVisits({
            accountId: account_id,
            customFeedId: custom_feed_id,
            startDate: start_date,
            endDate: end_date,
            pageSize: page_size,
            pageCursor: page_cursor,
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "leadfeeder_search_companies",
    "Search companies in Leadfeeder's global database using firmographic filters (new v1 API). Pass the filter body as documented at https://docs.leadfeeder.com/api/public.",
    {
      body: z
        .record(z.unknown())
        .describe("Raw request body for POST /v1/companies/search (filters, pagination, etc)."),
    },
    async ({ body }) => {
      try {
        return ok(await client.searchCompanies(body));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "leadfeeder_get_company",
    "Fetch a single company by its Leadfeeder company ID (new v1 API).",
    {
      company_id: z.string().describe("Leadfeeder company ID."),
    },
    async ({ company_id }) => {
      try {
        return ok(await client.getCompany(company_id));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "leadfeeder_enrich_ip",
    "Enrich an IP address with matching company information (IP-Enrich API). Requires a plan that includes IP enrichment.",
    {
      ip: z.string().describe("IPv4 or IPv6 address."),
    },
    async ({ ip }) => {
      try {
        return ok(await client.enrichIp(ip));
      } catch (err) {
        return fail(err);
      }
    },
  );
}
