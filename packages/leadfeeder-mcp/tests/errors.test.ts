import { describe, expect, it } from "vitest";
import { HttpError } from "@mcp-servers/core";
import { explainError } from "../src/errors.js";

describe("explainError", () => {
  it("maps 401 to an auth hint", () => {
    const msg = explainError(
      new HttpError({
        status: 401,
        statusText: "Unauthorized",
        body: { errors: [{ code: "unauthorized" }] },
        url: "https://api.leadfeeder.com/accounts",
      }),
    );
    expect(msg).toMatch(/Unauthorized/);
    expect(msg).toMatch(/LEADFEEDER_API_KEY/);
  });

  it("maps 429 to a rate-limit hint", () => {
    const msg = explainError(
      new HttpError({
        status: 429,
        statusText: "Too Many Requests",
        body: "",
        url: "https://api.leadfeeder.com/accounts",
      }),
    );
    expect(msg).toMatch(/Rate limited/);
  });

  it("falls back to message for plain Error", () => {
    expect(explainError(new Error("boom"))).toBe("boom");
  });

  it("stringifies unknowns", () => {
    expect(explainError(42)).toBe("42");
  });
});
