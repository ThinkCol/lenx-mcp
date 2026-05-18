import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { LenxClient } from "./client.js";
import { LenxConfig } from "./config.js";
import { registerListTasks } from "./tools/listTasks.js";
import { registerGetTask } from "./tools/getTask.js";
import { registerCreateTask } from "./tools/createTask.js";
import { registerUpdateTask } from "./tools/updateTask.js";
import { registerDeleteTask } from "./tools/deleteTask.js";
import { registerGetTaskData } from "./tools/getTaskData.js";
import { registerExportTaskData } from "./tools/exportTaskData.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export async function createAndRunServer(config: LenxConfig): Promise<void> {
  const client = new LenxClient(config);

  const server = new McpServer(
    { name: "lenx-mcp", version },
    {
      instructions:
        "Always list tasks first to find task IDs before using other tools.\n" +
        "Task IDs are integers.\n" +
        "Export is async — the result indicates job submission, not completion.",
    },
  );

  registerListTasks(server, client);
  registerGetTask(server, client);
  registerCreateTask(server, client);
  registerUpdateTask(server, client);
  registerDeleteTask(server, client);
  registerGetTaskData(server, client);
  registerExportTaskData(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return new Promise((resolve) => {
    const cleanup = async () => {
      console.error("Lenx MCP: shutting down...");
      await server.close();
      resolve();
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  });
}
