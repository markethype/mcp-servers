import { HttpClient, HttpError, type Logger } from "@mcp-servers/core";
import type { LeadfeederEnv } from "./config.js";

/**
 * Thin wrapper around the Leadfeeder v1 API.
 * All endpoints use `X-Api-Key` for authentication.
 */
export class LeadfeederClient {
  private readonly http: HttpClient;
  private readonly cfg: LeadfeederEnv;
  private readonly logger?: Logger;

  constructor(cfg: LeadfeederEnv, logger?: Logger) {
    this.cfg = cfg;
    this.logger = logger;
    this.http = new HttpClient({
      baseUrl: cfg.LEADFEEDER_BASE_URL,
      defaultHeaders: {
        "X-Api-Key": cfg.LEADFEEDER_API_KEY,
        "User-Agent": cfg.LEADFEEDER_USER_AGENT,
      },
      logger,
    });
  }

  /** Return a new client that uses the given API key instead of the configured one. */
  withApiKey(apiKey: string): LeadfeederClient {
    return new LeadfeederClient({ ...this.cfg, LEADFEEDER_API_KEY: apiKey }, this.logger);
  }

  /** List all accounts, or fetch one with credit details when accountId is given. */
  listAccounts(accountId?: string): Promise<unknown> {
    return this.http.get("/v1/accounts", { account_id: accountId });
  }

  listCustomFeeds(params: { accountId: string; include?: string }): Promise<unknown> {
    return this.http.get("/v1/web-visits/custom-feeds", {
      account_id: params.accountId,
      include: params.include,
    });
  }

  listWebVisits(params: {
    accountId: string;
    startDate: string;
    endDate: string;
    customFeedId?: string;
    include?: "company";
    pageNum?: number;
    pageSize?: number;
  }): Promise<unknown> {
    return this.http.get("/v1/web-visits/companies", {
      account_id: params.accountId,
      start_date: params.startDate,
      end_date: params.endDate,
      custom_feed_id: params.customFeedId,
      include: params.include,
      page_num: params.pageNum,
      page_size: params.pageSize,
    });
  }

  searchCompanies(
    body: Record<string, unknown>,
    accountId?: string,
  ): Promise<unknown> {
    // Dealfront's API requires account_id as a query parameter on this endpoint
    // (it ignores account_id placed inside the JSON body). Strip it from the body
    // if a caller put it there by mistake so we don't send conflicting values.
    const { account_id: bodyAccountId, ...rest } = body as Record<string, unknown>;
    const effectiveAccountId =
      accountId ?? (typeof bodyAccountId === "string" ? bodyAccountId : undefined);
    return this.http.post("/v1/companies/search", rest, {
      account_id: effectiveAccountId,
    });
  }

  getCompany(companyId: string, accountId?: string): Promise<unknown> {
    return this.http.get(`/v1/companies/${encodeURIComponent(companyId)}`, {
      account_id: accountId,
    });
  }

  enrichIp(ip: string, accountId: string): Promise<unknown> {
    return this.http.get("/v1/ip/enrich", { ip, account_id: accountId });
  }
}

export { HttpError };
