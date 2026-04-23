import { z } from "zod";
import { loadCommonEnv, type CommonEnv } from "@mcp-servers/core";

const oneflowEnvSchema = z.object({
  ONEFLOW_API_TOKEN: z.string().default(""),
  ONEFLOW_USER_EMAIL: z.string().optional(),
  ONEFLOW_BASE_URL: z.string().url().default("https://api.oneflow.com"),
});

export type OneflowEnv = z.infer<typeof oneflowEnvSchema> & CommonEnv;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): OneflowEnv {
  const common = loadCommonEnv(env);
  const parsed = oneflowEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid Oneflow environment:\n${issues}`);
  }
  return { ...common, ...parsed.data };
}
