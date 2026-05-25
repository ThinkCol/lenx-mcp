import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { LenxClient } from "../client.js";
import { UpdateTaskResponse } from "../types.js";

const queryLayerItemSchema = z.object({
  in: z.array(z.union([z.string(), z.array(z.string())])),
  ex: z.array(z.union([z.string(), z.array(z.string())])),
});

const updateSearchQuerySchema = z.object({
  query_layer: z.array(queryLayerItemSchema).nullable().optional(),
  region: z.string().nullable().optional(),
  list_medium: z.array(z.string()).optional(),
  list_author_id: z.array(z.string()).optional(),
  lang_abbr: z.string().nullable().optional(),
  exclude_channel_links: z.array(z.string()).optional(),
});

export function registerUpdateTask(server: McpServer, client: LenxClient): void {
  server.registerTool(
    "lenx_update_task",
    {
      description: "Update an existing task's name and/or search query configuration. At least one field is required.",
      inputSchema: {
        task_id: z.coerce.number().int().positive().describe("Task ID to update"),
        task_name: z.string().min(1).max(50).optional().describe("New task name (1-50 characters)"),
        search_query: updateSearchQuerySchema.optional().describe(
          "Partial search query update. Provide only the fields to change. Example:\n" +
          '{"query_layer": [{"in": ["new_keyword"], "ex": []}]}'
        ),
        prompts: z.record(z.string().min(1).max(5000).nullable()).optional().describe(
          "Per-task AI prompts for sentiment, irrelevancy, etc. Values are strings (1-5000 chars) or null."
        ),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.task_name !== undefined) body.task_name = params.task_name;
        if (params.search_query !== undefined) body.search_query = params.search_query;
        if (params.prompts !== undefined) body.prompts = params.prompts;
        const result = await client.patch<UpdateTaskResponse>(`/api/v1/tasks/${params.task_id}`, body);
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
