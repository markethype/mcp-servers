import { afterEach, describe, expect, it, vi } from "vitest";
import { OneflowClient } from "../src/client.js";
import type { OneflowEnv } from "../src/config.js";

const baseCfg: OneflowEnv = {
  MCP_TRANSPORT: "stdio",
  PORT: 3000,
  LOG_LEVEL: "silent",
  ONEFLOW_API_TOKEN: "test-token",
  ONEFLOW_BASE_URL: "https://api.oneflow.com",
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

describe("OneflowClient", () => {
  it("sends X-Oneflow-API-Token on every request", async () => {
    const fetchMock = mockFetch({ body: {} });
    const client = new OneflowClient(baseCfg);
    await client.ping();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.oneflow.com/v1/ping");
    const headers = init!.headers as Record<string, string>;
    expect(headers["X-Oneflow-API-Token"]).toBe("test-token");
  });

  it("sends X-Oneflow-User-Email only when configured", async () => {
    const fetchMock = mockFetch({ body: {} });
    const client = new OneflowClient({
      ...baseCfg,
      ONEFLOW_USER_EMAIL: "user@example.com",
    });
    await client.ping();
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init!.headers as Record<string, string>;
    expect(headers["X-Oneflow-User-Email"]).toBe("user@example.com");

    const fetchMock2 = mockFetch({ body: {} });
    const client2 = new OneflowClient(baseCfg);
    await client2.ping();
    const [, init2] = fetchMock2.mock.calls[0]!;
    const headers2 = init2!.headers as Record<string, string>;
    expect(headers2["X-Oneflow-User-Email"]).toBeUndefined();
  });

  it("builds /v1/contracts URL with query params", async () => {
    const fetchMock = mockFetch({ body: { data: [] } });
    const client = new OneflowClient(baseCfg);
    await client.listContracts({
      limit: 25,
      offset: 10,
      state: "draft",
      workspace_ids: "1,2,3",
    });
    const [url] = fetchMock.mock.calls[0]!;
    const u = new URL(String(url));
    expect(u.pathname).toBe("/v1/contracts");
    expect(u.searchParams.get("limit")).toBe("25");
    expect(u.searchParams.get("offset")).toBe("10");
    expect(u.searchParams.get("state")).toBe("draft");
    expect(u.searchParams.get("workspace_ids")).toBe("1,2,3");
  });

  it("posts JSON body for createContract", async () => {
    const fetchMock = mockFetch({ body: { id: "c1" } });
    const client = new OneflowClient(baseCfg);
    await client.createContract({ template_id: "t1", name: "Deal" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/v1/contracts/create");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({ template_id: "t1", name: "Deal" });
    expect((init!.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});
