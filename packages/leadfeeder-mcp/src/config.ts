import { z } from "zod";
import { loadCommonEnv, type CommonEnv } from "@mcp-servers/core";

const leadfeederEnvSchema = z.object({
  LEADFEEDER_API_KEY: z.string().default(""),
  LEADFEEDER_USER_AGENT: z.string().default("mcp-servers/leadfeeder-mcp"),
  LEADFEEDER_BASE_URL: z.string().url().default("https://api.leadfeeder.com"),
});

export type LeadfeederEnv = z.infer<typeof leadfeederEnvSchema> & CommonEnv;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): LeadfeederEnv {
  const common = loadCommonEnv(env);
  const parsed = leadfeederEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid Leadfeeder environment:\n${issues}`);
  }
  return { ...common, ...parsed.data };
}
