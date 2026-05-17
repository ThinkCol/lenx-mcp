import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LenxClient } from "../client.js";
import { CreateTaskResponse } from "../types.js";

const queryLayerItemSchema = z.object({
  in: z.array(z.union([z.string(), z.array(z.string())])),
  ex: z.array(z.union([z.string(), z.array(z.string())])),
});

const searchQuerySchema = z.object({
  query_layer: z.array(queryLayerItemSchema).nullable().optional(),
  region: z.string().nullable().optional(),
  list_medium: z.array(z.string()).optional(),
  list_author_id: z.array(z.string()).optional(),
  lang_abbr: z.string().nullable().optional(),
  exclude_channel_links: z.array(z.string()).optional(),
});

export function registerCreateTask(server: McpServer, client: LenxClient): void {
  server.tool(
    "lenx_create_task",
    "Create a new monitoring task (live or adhoc). Live tasks run continuously; adhoc tasks require a date_range.",
    {
      task_type: z.enum(["live", "adhoc"]).describe("Task type: 'live' runs continuously, 'adhoc' requires date_range"),
      task_name: z.string().min(1).max(50).describe("Task name (1-50 characters)"),
      language: z.enum(["zh-t", "zh-s", "en"]).describe("Language: zh-t (Traditional Chinese), zh-s (Simplified Chinese), en (English)"),
      date_range: z.object({
        from: z.number().positive().describe("Start unix timestamp"),
        to: z.number().positive().describe("End unix timestamp"),
      }).optional().describe("Required for adhoc tasks: time range for data collection"),
      search_query: searchQuerySchema.describe(
        "Search query configuration. Example query_layer with nested grouped keywords:\n" +
        '[{"in": ["brand_name", "product_name"], "ex": ["competitor_name"]}]\n' +
        "Nested OR-group form:\n" +
        '[{"in": [["brand_name", "brand_alias"], ["product_series_a", "product_series_b"]], "ex": [["competitor_a", "competitor_b"]]}]'
      ),
    },
    async (params) => {
      try {
        const result = await client.post<CreateTaskResponse>("/api/v1/tasks", params);
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
