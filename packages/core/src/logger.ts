import pino, { type Logger as PinoLogger } from "pino";

export type Logger = PinoLogger;

export interface CreateLoggerOptions {
  name: string;
  level?: string;
  /**
   * When true, sends logs to stderr (never stdout). REQUIRED for stdio MCP
   * transport, because stdout is reserved for JSON-RPC frames.
   */
  stdio?: boolean;
}

export function createLogger(opts: CreateLoggerOptions): Logger {
  const level = opts.level ?? process.env.LOG_LEVEL ?? "info";

  if (opts.stdio) {
    // Write to stderr only. Do not use pino-pretty in stdio mode to keep the
    // dependency surface small and stderr output compact.
    return pino(
      { name: opts.name, level },
      pino.destination({ dest: 2, sync: false }),
    );
  }

  return pino({ name: opts.name, level });
}
