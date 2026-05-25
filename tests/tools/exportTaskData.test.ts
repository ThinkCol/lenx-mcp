import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerExportTaskData } from "../../src/tools/exportTaskData.js";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

type ExportTaskDataArgs = {
  task_ids?: number[];
  unix_start: number;
  unix_end: number;
  columns: string[];
  file_format: "csv" | "xlsx";
  email: string;
  is_comment?: boolean;
  dedupe?: boolean;
  limit?: number;
  recipients?: string[];
  email_subject?: string;
  timezone?: string;
};
type HandlerResult = Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

describe("lenx_export_task_data", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("submits export on success", async () => {
    const mockResponse = { result: "success" as const, job_id: "job-123", message: "Export job submitted" };
    vi.spyOn(LenxClient.prototype, "post").mockResolvedValue(mockResponse);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerExportTaskData(server, client);

    const handler = getToolHandler(server, "lenx_export_task_data") as (args: ExportTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
    const result = await handler({
      task_ids: [1, 2],
      unix_start: 1740096000000,
      unix_end: 1740787200000,
      columns: ["medium", "site"],
      file_format: "csv",
      email: "user@example.com",
    }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(mockResponse));
  });

  it("coerces string task_ids to numbers", async () => {
    const postMock = vi.spyOn(LenxClient.prototype, "post").mockResolvedValue({ result: "success" as const });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerExportTaskData(server, client);

    const handler = getToolHandler(server, "lenx_export_task_data") as (args: ExportTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
    await handler({
      task_ids: [1, 2, 3],
      unix_start: 100000,
      unix_end: 200000,
      columns: ["medium"],
      file_format: "xlsx",
      email: "a@b.com",
    }, { signal: new AbortController().signal });

    const sentBody = postMock.mock.calls[0][1] as any;
    expect(sentBody.task_ids).toEqual([1, 2, 3]);
  });

  it("accepts export request without task_ids", async () => {
    const postMock = vi.spyOn(LenxClient.prototype, "post").mockResolvedValue({ result: "success" as const });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerExportTaskData(server, client);

    const handler = getToolHandler(server, "lenx_export_task_data") as (args: ExportTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
    const result = await handler({
      unix_start: 1740096000000,
      unix_end: 1740787200000,
      columns: ["medium", "site"],
      file_format: "csv",
      email: "user@example.com",
    }, { signal: new AbortController().signal });

    const sentBody = postMock.mock.calls[0][1] as any;
    expect(sentBody.task_ids).toBeUndefined();
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify({ result: "success" }));
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "post").mockRejectedValue(new Error("Bad Request"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerExportTaskData(server, client);

    const handler = getToolHandler(server, "lenx_export_task_data") as (args: ExportTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
    const result = await handler({
      task_ids: [1],
      unix_start: 100000,
      unix_end: 200000,
      columns: ["medium"],
      file_format: "csv",
      email: "a@b.com",
    }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Bad Request");
  });
});
