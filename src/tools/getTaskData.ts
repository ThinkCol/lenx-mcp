import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LenxClient } from "../client.js";
import { GetTaskDataResponse } from "../types.js";

export function registerGetTaskData(server: McpServer, client: LenxClient): void {
  server.tool(
    "lenx_get_task_data",
    "Retrieve paginated social media post data for a specific task within a time range.",
    {
      task_id: z.coerce.number().int().positive().describe("Task ID"),
      from: z.number().positive().describe("Start unix timestamp (inclusive)"),
      to: z.number().positive().describe("End unix timestamp (inclusive)"),
      size: z.number().positive().max(1000).describe("Number of posts per page (max: 1000)"),
      search_after: z.number().optional().describe("Cursor for pagination: pass the last post's unix_timestamp to get the next page"),
    },
    async ({ task_id, from, to, size, search_after }) => {
      try {
        const params = new URLSearchParams({
          from: String(from),
          to: String(to),
          size: String(size),
        });
        if (search_after !== undefined) params.set("search_after", String(search_after));
        const result = await client.get<GetTaskDataResponse>(
          `/api/v1/tasks/${task_id}/data?${params.toString()}`
        );
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
