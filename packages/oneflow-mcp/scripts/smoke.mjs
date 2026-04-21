#!/usr/bin/env node
/**
 * CLI smoke test: spawn the MCP server over stdio, call `oneflow_ping`,
 * print the result. Fails non-zero on any error.
 *
 * Usage:
 *   ONEFLOW_API_TOKEN=xxx node scripts/smoke.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, "../dist/index.js");

if (!process.env.ONEFLOW_API_TOKEN) {
  console.error("ONEFLOW_API_TOKEN is required");
  process.exit(2);
}

const child = spawn("node", [entry], {
  env: process.env,
  stdio: ["pipe", "pipe", "inherit"],
});

let buf = "";
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buf += chunk.toString("utf8");
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const resolver = pending.get(msg.id);
    if (resolver) {
      pending.delete(msg.id);
      resolver(msg);
    }
  }
});

let nextId = 1;
function call(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

const timeout = setTimeout(() => {
  console.error("smoke test timed out");
  child.kill();
  process.exit(1);
}, 30_000);

try {
  const init = await call("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  });
  if (init.error) throw new Error("initialize failed: " + JSON.stringify(init.error));
  console.log("initialized:", init.result.serverInfo);

  const result = await call("tools/call", {
    name: "oneflow_ping",
    arguments: {},
  });
  if (result.error) throw new Error("tool error: " + JSON.stringify(result.error));
  const payload = result.result;
  const text = payload?.content?.[0]?.text ?? "(no text)";
  const isError = payload?.isError === true;
  console.log(isError ? "TOOL RETURNED ERROR:" : "ping:", text);
  clearTimeout(timeout);
  child.kill();
  process.exit(isError ? 1 : 0);
} catch (err) {
  console.error(err);
  clearTimeout(timeout);
  child.kill();
  process.exit(1);
}
