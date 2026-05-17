import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LenxClient } from "../client.js";
import { GetTaskResponse } from "../types.js";

export function registerGetTask(server: McpServer, client: LenxClient): void {
  server.tool(
    "lenx_get_task",
    "Retrieve configuration and metadata for a single monitoring task by ID.",
    {
      task_id: z.coerce.number().int().positive().describe("Task ID"),
    },
    async ({ task_id }) => {
      try {
        const result = await client.get<GetTaskResponse>(`/api/v1/tasks/${task_id}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: (err as Error).message }],
        };
      }
    }
  );
}
