import { HttpClient, HttpError, type Logger } from "@mcp-servers/core";
import type { LeadfeederEnv } from "./config.js";

/**
 * Thin wrapper around Leadfeeder's public API.
 *
 * The same API key works for both:
 *   - legacy endpoints (`/accounts`, `/accounts/{id}/...`) which use
 *     `Authorization: Token token=<key>`
 *   - new v1 endpoints (`/v1/...`) which use `X-Api-Key: <key>`
 *
 * We send both headers on every request so a single client works for both.
 */
export class LeadfeederClient {
  private readonly http: HttpClient;

  constructor(cfg: LeadfeederEnv, logger?: Logger) {
    this.http = new HttpClient({
      baseUrl: cfg.LEADFEEDER_BASE_URL,
      defaultHeaders: {
        Authorization: `Token token=${cfg.LEADFEEDER_API_KEY}`,
        "X-Api-Key": cfg.LEADFEEDER_API_KEY,
        "User-Agent": cfg.LEADFEEDER_USER_AGENT,
      },
      logger,
    });
  }

  // ---- legacy API -----------------------------------------------------------

  listAccounts(): Promise<unknown> {
    return this.http.get("/accounts");
  }

  listLeads(params: {
    accountId: string;
    customFeedId?: string;
    startDate?: string;
    endDate?: string;
    fields?: string;
  }): Promise<unknown> {
    return this.http.get(`/accounts/${encodeURIComponent(params.accountId)}/leads`, {
      custom_feed_id: params.customFeedId,
      start_date: params.startDate,
      end_date: params.endDate,
      "fields[lead]": params.fields,
    });
  }

  listVisits(params: {
    accountId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<unknown> {
    return this.http.get(`/accounts/${encodeURIComponent(params.accountId)}/visits`, {
      start_date: params.startDate,
      end_date: params.endDate,
    });
  }

  // ---- new v1 API -----------------------------------------------------------

  listCustomFeeds(params: { accountId: string; include?: string }): Promise<unknown> {
    return this.http.get("/v1/web-visits/custom-feeds", {
      account_id: params.accountId,
      include: params.include,
    });
  }

  listWebVisits(params: {
    accountId: string;
    customFeedId?: string;
    startDate?: string;
    endDate?: string;
    pageSize?: number;
    pageCursor?: string;
  }): Promise<unknown> {
    return this.http.get("/v1/web-visits", {
      account_id: params.accountId,
      custom_feed_id: params.customFeedId,
      start_date: params.startDate,
      end_date: params.endDate,
      page_size: params.pageSize,
      page_cursor: params.pageCursor,
    });
  }

  searchCompanies(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/v1/companies/search", body);
  }

  getCompany(companyId: string): Promise<unknown> {
    return this.http.get(`/v1/companies/${encodeURIComponent(companyId)}`);
  }

  enrichIp(ip: string): Promise<unknown> {
    return this.http.get("/v1/ip-enrich", { ip });
  }
}

export { HttpError };
