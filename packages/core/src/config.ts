import { z } from "zod";

const transportSchema = z.enum(["stdio", "http"]);

const commonEnvSchema = z.object({
  MCP_TRANSPORT: transportSchema.default("stdio"),
  PORT: z.coerce.number().int().positive().default(3000),
  MCP_AUTH_TOKEN: z.string().optional(),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),
});

export type CommonEnv = z.infer<typeof commonEnvSchema>;

export function loadCommonEnv(env: NodeJS.ProcessEnv = process.env): CommonEnv {
  const parsed = commonEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const cfg = parsed.data;

  if (cfg.MCP_TRANSPORT === "http" && !cfg.MCP_AUTH_TOKEN) {
    throw new Error(
      "MCP_AUTH_TOKEN is required when MCP_TRANSPORT=http (used to authenticate remote clients).",
    );
  }

  return cfg;
}
