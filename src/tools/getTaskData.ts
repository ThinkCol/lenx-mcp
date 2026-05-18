import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { LenxClient } from "../client.js";
import { GetTaskDataResponse, TimestampMs } from "../types.js";

export function registerGetTaskData(server: McpServer, client: LenxClient): void {
  server.registerTool(
    "lenx_get_task_data",
    {
      description: "Retrieve paginated social media post data for a specific task within a time range.",
      inputSchema: {
        task_id: z.coerce.number().int().positive().describe("Task ID"),
        from: TimestampMs.describe("Start unix timestamp in MILLISECONDS (13-digit integer), inclusive. NOT seconds."),
        to: TimestampMs.describe("End unix timestamp in MILLISECONDS (13-digit integer), inclusive. NOT seconds."),
        size: z.number().positive().max(1000).describe("Number of posts per page (max: 1000)"),
        search_after: TimestampMs.optional().describe("Cursor for pagination: pass the last post's unix_timestamp in MILLISECONDS (13-digit integer). NOT seconds."),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
      },
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
