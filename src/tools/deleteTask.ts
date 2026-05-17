import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LenxClient } from "../client.js";
import { DeleteTaskResponse } from "../types.js";

export function registerDeleteTask(server: McpServer, client: LenxClient): void {
  server.tool(
    "lenx_delete_task",
    "Delete a monitoring task. Only the task owner can perform this operation.",
    {
      task_id: z.coerce.number().int().positive().describe("Task ID to delete"),
    },
    async ({ task_id }) => {
      try {
        const result = await client.delete<DeleteTaskResponse>(`/api/v1/tasks/${task_id}`);
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
