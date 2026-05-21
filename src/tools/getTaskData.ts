import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { LenxClient } from "../client.js";
import { GetTaskDataResponse, TimestampMs } from "../types.js";
import * as fs from "node:fs";
import * as path from "node:path";

export function registerGetTaskData(server: McpServer, client: LenxClient): void {
  server.registerTool(
    "lenx_get_task_data",
    {
      description:
        "Retrieve paginated social media post data for a specific task within a time range. " +
        "When output_path is provided, data is written to a JSONL file (one JSON object per line, UTF-8 encoded) " +
        "and file metadata is returned instead of the full dataset — use this to reduce token usage on large result sets. " +
        "The output_mode parameter (\"append\" or \"overwrite\", default \"append\") controls whether new data is added to " +
        "an existing file or replaces it entirely. " +
        "Pagination works normally via search_after; pass last_timestamp from a file-write response to fetch the next page.",
      inputSchema: {
        task_id: z.coerce.number().int().positive().describe("Task ID"),
        from: TimestampMs.describe("Start unix timestamp in MILLISECONDS (13-digit integer), inclusive. NOT seconds."),
        to: TimestampMs.describe("End unix timestamp in MILLISECONDS (13-digit integer), inclusive. NOT seconds."),
        size: z.number().positive().max(1000).describe("Number of posts per page (max: 1000)"),
        search_after: TimestampMs.optional().describe("Cursor for pagination: pass the last post's unix_timestamp in MILLISECONDS (13-digit integer). NOT seconds."),
        output_path: z.string().optional().describe(
          "Path to write JSONL file. Auto-creates parent directories. " +
          "Relative paths are resolved against the current working directory. " +
          "The .jsonl extension is auto-appended if the path doesn't end with it. " +
          "Must resolve to a path inside the current workspace."
        ),
        output_mode: z.enum(["append", "overwrite"]).optional().default("append").describe(
          "File write mode: 'append' (default) adds new data to the end of an existing file, 'overwrite' replaces the file."
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    async ({ task_id, from, to, size, search_after, output_path, output_mode }) => {
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

        if (output_path) {
          const resolvedPath = path.resolve(output_path);
          const cwd = process.cwd();
          const relative = path.relative(cwd, resolvedPath);
          if (relative.startsWith("..") || path.isAbsolute(relative)) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: `Path outside workspace: ${resolvedPath}. Must be inside ${cwd}` }],
            };
          }

          let filePath = resolvedPath;
          if (!filePath.endsWith(".jsonl")) {
            filePath += ".jsonl";
          }

          fs.mkdirSync(path.dirname(filePath), { recursive: true });

          const mode = output_mode ?? "append";
          const flag = mode === "overwrite" ? "w" : "a";
          const jsonl = result.data.map((post) => JSON.stringify(post)).join("\n") + (result.data.length > 0 ? "\n" : "");
          fs.writeFileSync(filePath, jsonl, { flag, encoding: "utf-8" });

          const records_written = result.data.length;
          const has_more = records_written === size && records_written < result.total;

          const fileResponse: Record<string, unknown> = {
            total: result.total,
            records_written,
            file_path: path.resolve(filePath),
            has_more,
          };
          if (records_written > 0) {
            fileResponse.first_timestamp = result.data[0].unix_timestamp;
            fileResponse.last_timestamp = result.data[records_written - 1].unix_timestamp;
          }

          return { content: [{ type: "text" as const, text: JSON.stringify(fileResponse) }] };
        }

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
