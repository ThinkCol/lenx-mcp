import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { LenxClient } from "../client.js";
import { ListTasksResponse } from "../types.js";

export function registerListTasks(server: McpServer, client: LenxClient): void {
  server.registerTool(
    "lenx_list_tasks",
    {
      description: "List monitoring tasks accessible to the authenticated user, with pagination support.",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        size: z.number().int().positive().max(20).optional().describe("Items per page (default: 10, max: 20)"),
    },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ page, size }) => {
      try {
        const params = new URLSearchParams();
        if (page !== undefined) params.set("page", String(page));
        if (size !== undefined) params.set("size", String(size));
        const qs = params.toString();
        const path = qs ? `/api/v1/tasks?${qs}` : "/api/v1/tasks";
        const result = await client.get<ListTasksResponse>(path);
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
