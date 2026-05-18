import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LenxClient } from "../client.js";
import { DeleteTaskResponse } from "../types.js";

export function registerDeleteTask(server: McpServer, client: LenxClient): void {
  server.registerTool(
    "lenx_delete_task",
    {
      description: "Delete a monitoring task. Only the task owner can perform this operation.",
      inputSchema: {
        task_id: z.coerce.number().int().positive().describe("Task ID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: true,
      },
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
