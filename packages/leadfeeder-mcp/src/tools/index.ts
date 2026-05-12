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

const apiKeyParam = {
  api_key: z
    .string()
    .optional()
    .describe(
      "Your Leadfeeder API key (from Personal settings → API keys). " +
        "Required if LEADFEEDER_API_KEY is not set on the server.",
    ),
};

function resolveClient(client: LeadfeederClient, apiKey: string | undefined): LeadfeederClient {
  if (apiKey) return client.withApiKey(apiKey);
  return client;
}

export function registerTools(server: McpServer, client: LeadfeederClient): void {
  server.tool(
    "leadfeeder_list_accounts",
    "List the Leadfeeder accounts accessible with the current API key. Useful for discovering account_id values required by other tools. Optionally pass account_id to fetch credit details for a specific account.",
    {
      account_id: z.string().optional().describe("Optional account ID to fetch detailed credit information for a specific account."),
      ...apiKeyParam,
    },
    async ({ account_id, api_key }) => {
      try {
        return ok(await resolveClient(client, api_key).listAccounts(account_id));
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
      ...apiKeyParam,
    },
    async ({ account_id, include, api_key }) => {
      try {
        return ok(await resolveClient(client, api_key).listCustomFeeds({ accountId: account_id, include }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "leadfeeder_list_web_visits",
    "Retrieve companies that visited your website within a date range, optionally filtered by custom feed. Pass include='company' to embed full company details in the response.",
    {
      account_id: z.string().describe("Leadfeeder account ID (from leadfeeder_list_accounts)."),
      start_date: z.string().describe("Inclusive start date in YYYY-MM-DD format."),
      end_date: z.string().describe("Inclusive end date in YYYY-MM-DD format."),
      custom_feed_id: z.string().optional().describe("Filter to a specific custom feed."),
      include: z.enum(["company"]).optional().describe("Pass 'company' to embed full company details in each result."),
      page_num: z.number().int().positive().optional().describe("Page number for pagination (1-based)."),
      page_size: z.number().int().positive().max(100).optional().describe("Number of results per page (max 100)."),
      ...apiKeyParam,
    },
    async ({ account_id, start_date, end_date, custom_feed_id, include, page_num, page_size, api_key }) => {
      try {
        return ok(
          await resolveClient(client, api_key).listWebVisits({
            accountId: account_id,
            startDate: start_date,
            endDate: end_date,
            customFeedId: custom_feed_id,
            include,
            pageNum: page_num,
            pageSize: page_size,
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "leadfeeder_search_companies",
    [
      "Search companies in Dealfront's global firmographic database (POST /v1/companies/search).",
      "This is the unified Dealfront/Leadfeeder v1 API — same data as Dealfront Target/Discover.",
      "",
      "REQUIRED ARGUMENT FORMAT:",
      "  account_id: top-level argument (sent as ?account_id=… query param). Do NOT put it in body.",
      "  body.filters: must include at least ONE of these boolean keys with value true or false:",
      "    has_phone, has_email, has_social_media_profiles, do_not_contact,",
      "    has_financials_revenue, has_financials_earnings, has_financials_net_worth, has_ip_addresses.",
      "",
      "OPTIONAL: additional non-boolean filters (e.g. countries, industries) can be added alongside",
      "the required boolean filter inside body.filters.",
      "",
      "PAGINATION: this endpoint does NOT accept page_num/page_size. See",
      "https://docs.dealfront.com/api/public for the supported pagination format (cursor-based).",
      "",
      "EXAMPLE body: { \"filters\": { \"has_phone\": true, \"countries\": [\"SE\"] } }",
    ].join("\n"),
    {
      account_id: z
        .string()
        .describe(
          "Leadfeeder/Dealfront account ID (from leadfeeder_list_accounts). " +
            "Sent as the required ?account_id=… query parameter. Do not put it in body.",
        ),
      body: z
        .record(z.unknown())
        .describe(
          "Request body. Must contain a 'filters' object with at least one boolean key " +
            "from: has_phone, has_email, has_social_media_profiles, do_not_contact, " +
            "has_financials_revenue, has_financials_earnings, has_financials_net_worth, has_ip_addresses. " +
            "page_num/page_size are NOT supported here — see Dealfront docs for cursor pagination. " +
            "Do not include account_id in the body.",
        ),
      ...apiKeyParam,
    },
    async ({ account_id, body, api_key }) => {
      try {
        return ok(await resolveClient(client, api_key).searchCompanies(body, account_id));
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
      account_id: z.string().optional().describe("Leadfeeder account ID (from leadfeeder_list_accounts). Recommended — pass this whenever you have it."),
      ...apiKeyParam,
    },
    async ({ company_id, account_id, api_key }) => {
      try {
        return ok(await resolveClient(client, api_key).getCompany(company_id, account_id));
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
      account_id: z.string().describe("Leadfeeder account ID (from leadfeeder_list_accounts)."),
      ...apiKeyParam,
    },
    async ({ ip, account_id, api_key }) => {
      try {
        return ok(await resolveClient(client, api_key).enrichIp(ip, account_id));
      } catch (err) {
        return fail(err);
      }
    },
  );
}
