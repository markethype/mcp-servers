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
        return `Leadfeeder: Unauthorized. Check LEADFEEDER_API_KEY. ${summary}`.trim();
      case 402:
        return `Leadfeeder: Premium subscription required for this endpoint. ${summary}`.trim();
      case 403:
        return `Leadfeeder: Forbidden (API key lacks access or the resource is restricted). ${summary}`.trim();
      case 404:
        return `Leadfeeder: Not found. ${summary}`.trim();
      case 429:
        return `Leadfeeder: Rate limited (100 req/min per token or per account). Retry after a minute. ${summary}`.trim();
      default:
        return `Leadfeeder HTTP ${err.status} ${err.statusText}. ${summary}`.trim();
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
