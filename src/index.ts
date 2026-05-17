#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { createAndRunServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  console.error(`Lenx MCP: starting server (base URL: ${config.baseUrl})`);
  await createAndRunServer(config);
  console.error("Lenx MCP: server stopped");
}

main().catch((err) => {
  console.error("Lenx MCP: fatal error:", (err as Error).message);
  process.exit(1);
});
