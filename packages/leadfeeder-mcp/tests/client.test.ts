import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadfeederClient } from "../src/client.js";
import type { LeadfeederEnv } from "../src/config.js";

const baseCfg: LeadfeederEnv = {
  MCP_TRANSPORT: "stdio",
  PORT: 3000,
  LOG_LEVEL: "silent",
  LEADFEEDER_API_KEY: "test-key",
  LEADFEEDER_USER_AGENT: "mcp-servers/leadfeeder-mcp-test",
  LEADFEEDER_BASE_URL: "https://api.leadfeeder.com",
};

function mockFetch(response: {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const fn = vi.fn(async () => {
    return new Response(JSON.stringify(response.body ?? {}), {
      status: response.status ?? 200,
      headers: { "content-type": "application/json", ...(response.headers ?? {}) },
    });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LeadfeederClient", () => {
  it("sends both Authorization and X-Api-Key headers", async () => {
    const fetchMock = mockFetch({ body: { data: [] } });
    const client = new LeadfeederClient(baseCfg);
    await client.listAccounts();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.leadfeeder.com/accounts");
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Token token=test-key");
    expect(headers["X-Api-Key"]).toBe("test-key");
    expect(headers["User-Agent"]).toMatch(/mcp-servers/);
  });

  it("builds v1 web-visits URL with query params", async () => {
    const fetchMock = mockFetch({ body: { data: [] } });
    const client = new LeadfeederClient(baseCfg);
    await client.listWebVisits({
      accountId: "123456",
      customFeedId: "feed-1",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      pageSize: 50,
    });
    const [url] = fetchMock.mock.calls[0]!;
    const u = new URL(String(url));
    expect(u.pathname).toBe("/v1/web-visits");
    expect(u.searchParams.get("account_id")).toBe("123456");
    expect(u.searchParams.get("custom_feed_id")).toBe("feed-1");
    expect(u.searchParams.get("start_date")).toBe("2026-01-01");
    expect(u.searchParams.get("end_date")).toBe("2026-01-31");
    expect(u.searchParams.get("page_size")).toBe("50");
  });

  it("posts JSON body for company search", async () => {
    const fetchMock = mockFetch({ body: { data: [] } });
    const client = new LeadfeederClient(baseCfg);
    await client.searchCompanies({ filter: { country: "SE" } });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({ filter: { country: "SE" } });
    expect((init!.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});
