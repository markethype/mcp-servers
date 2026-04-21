import { HttpError } from "@mcp-servers/core";

/**
 * Convert any thrown value into a human-friendly error message suitable for
 * returning to the MCP client. The goal is to make API problems obvious from
 * inside Claude (auth? rate limit? 404?) without leaking raw upstream payloads.
 */
export function explainError(err: unknown): string {
  if (err instanceof HttpError) {
    const summary = summarizeBody(err.body);
    switch (err.status) {
      case 401:
        return "Oneflow: Unauthorized. Check ONEFLOW_API_TOKEN.";
      case 403:
        return "Oneflow: Forbidden.";
      case 404:
        return "Oneflow: Not found.";
      case 429:
        return "Oneflow: Rate limited.";
      default:
        return `Oneflow HTTP ${err.status} ${err.statusText}. ${summary}`.trim();
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function summarizeBody(body: unknown): string {
  if (!body) return "";
  if (typeof body === "string") return body.slice(0, 400);
  try {
    return JSON.stringify(body).slice(0, 400);
  } catch {
    return "";
  }
}
