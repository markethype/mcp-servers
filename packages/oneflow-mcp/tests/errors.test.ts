import { describe, expect, it } from "vitest";
import { HttpError } from "@mcp-servers/core";
import { explainError } from "../src/errors.js";

describe("explainError", () => {
  it("maps 401 to an auth hint", () => {
    const msg = explainError(
      new HttpError({
        status: 401,
        statusText: "Unauthorized",
        body: { error: "invalid_token" },
        url: "https://api.oneflow.com/v1/ping",
      }),
    );
    expect(msg).toBe("Oneflow: Unauthorized. Check ONEFLOW_API_TOKEN.");
  });

  it("maps 429 to a rate-limit hint", () => {
    const msg = explainError(
      new HttpError({
        status: 429,
        statusText: "Too Many Requests",
        body: "",
        url: "https://api.oneflow.com/v1/contracts",
      }),
    );
    expect(msg).toBe("Oneflow: Rate limited.");
  });

  it("falls back to message for plain Error", () => {
    expect(explainError(new Error("boom"))).toBe("boom");
  });

  it("stringifies unknowns", () => {
    expect(explainError(42)).toBe("42");
  });
});
