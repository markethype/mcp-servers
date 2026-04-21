import type { Logger } from "./logger.js";

export interface HttpClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  logger?: Logger;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  body?: unknown;
  /** Override default timeout for this request. */
  timeoutMs?: number;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;
  readonly url: string;

  constructor(params: {
    status: number;
    statusText: string;
    body: unknown;
    url: string;
    message?: string;
  }) {
    super(
      params.message ??
        `HTTP ${params.status} ${params.statusText} for ${params.url}`,
    );
    this.name = "HttpError";
    this.status = params.status;
    this.statusText = params.statusText;
    this.body = params.body;
    this.url = params.url;
  }
}

const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly logger?: Logger;

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.defaultHeaders = { Accept: "application/json", ...opts.defaultHeaders };
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.logger = opts.logger;
  }

  async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const method = opts.method ?? "GET";
    const headers: Record<string, string> = { ...this.defaultHeaders, ...opts.headers };

    let body: string | undefined;
    if (opts.body !== undefined && opts.body !== null) {
      body = JSON.stringify(opts.body);
      headers["Content-Type"] ??= "application/json";
    }

    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;

    let attempt = 0;
    let lastError: unknown;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        this.logger?.debug({ method, url, attempt }, "http request");
        const res = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        if (res.ok) {
          return (await this.parseBody(res)) as T;
        }

        const parsed = await this.parseBody(res);
        if (RETRY_STATUSES.has(res.status) && attempt < this.maxRetries) {
          const delay = this.retryDelayMs(attempt, res);
          this.logger?.warn(
            { status: res.status, url, attempt, delayMs: delay },
            "retrying http request",
          );
          await sleep(delay);
          attempt += 1;
          continue;
        }
        throw new HttpError({
          status: res.status,
          statusText: res.statusText,
          body: parsed,
          url,
        });
      } catch (err) {
        lastError = err;
        if (err instanceof HttpError) throw err;
        const isAbort = err instanceof Error && err.name === "AbortError";
        if (attempt < this.maxRetries && (isAbort || isNetworkError(err))) {
          const delay = this.retryDelayMs(attempt);
          this.logger?.warn(
            { err: (err as Error).message, url, attempt, delayMs: delay },
            "retrying http request after transport error",
          );
          await sleep(delay);
          attempt += 1;
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError ?? new Error("Unreachable retry loop");
  }

  get<T = unknown>(path: string, query?: RequestOptions["query"], headers?: Record<string, string>) {
    return this.request<T>({ method: "GET", path, query, headers });
  }
  post<T = unknown>(path: string, body?: unknown, query?: RequestOptions["query"], headers?: Record<string, string>) {
    return this.request<T>({ method: "POST", path, body, query, headers });
  }
  put<T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>({ method: "PUT", path, body, headers });
  }
  delete<T = unknown>(path: string, headers?: Record<string, string>) {
    return this.request<T>({ method: "DELETE", path, headers });
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const prefix = path.startsWith("/") ? "" : "/";
    const url = new URL(this.baseUrl + prefix + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async parseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") || looksLikeJson(text)) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  }

  private retryDelayMs(attempt: number, res?: Response): number {
    if (res) {
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);
      }
    }
    const base = 300 * Math.pow(2, attempt);
    const jitter = Math.random() * 200;
    return Math.min(base + jitter, 10_000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound")
  );
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}
