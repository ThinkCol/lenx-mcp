import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LenxClient } from "../client.js";
import { ExportTaskResponse, TimestampMs } from "../types.js";

const exportColumns = [
  "medium", "site", "country", "lang_abbr", "thread_title",
  "post_message", "author_name", "channel", "post_timestamp",
  "post_date", "post_time", "thread_link", "post_link",
  "comment_count", "share_count", "view_count", "reaction_count",
  "reaction_like", "reaction_dislike", "reaction_angry",
  "reaction_haha", "reaction_love", "reaction_sad", "reaction_wow",
  "ai_sentiment", "ai_impact", "hash",
] as const;

export function registerExportTaskData(server: McpServer, client: LenxClient): void {
  server.tool(
    "lenx_export_task_data",
    "Request a CSV or XLSX export of task post data. Results are sent to the specified email address.",
    {
      task_ids: z.array(z.coerce.number().int().positive()).min(1).describe("Array of task IDs to export (strings are auto-converted to numbers)"),
      unix_start: TimestampMs.describe("Start of export time range in MILLISECONDS (13-digit integer). NOT seconds."),
      unix_end: TimestampMs.describe("End of export time range in MILLISECONDS (13-digit integer). NOT seconds."),
      columns: z.array(z.enum(exportColumns)).min(1).describe("Columns to include in the export file"),
      file_format: z.enum(["csv", "xlsx"]).describe("Export file format: csv or xlsx"),
      email: z.string().email().max(255).describe("Email address to send the export to"),
      is_comment: z.boolean().optional().describe("Include comments in export"),
      dedupe: z.boolean().optional().describe("Deduplicate posts in export"),
      limit: z.number().int().positive().optional().describe("Maximum number of posts to export"),
      recipients: z.array(z.string().email()).optional().describe("Additional email recipients"),
      email_subject: z.string().max(200).optional().describe("Custom email subject line"),
      timezone: z.string().optional().describe("Timezone for date formatting in export"),
    },
    async (params) => {
      try {
        const result = await client.post<ExportTaskResponse>("/api/v1/tasks/export", params);
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
