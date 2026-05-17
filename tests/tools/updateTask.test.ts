import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerUpdateTask } from "../../src/tools/updateTask.js";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

interface UpdateTaskArgs {
  task_id: number;
  task_name?: string;
  search_query?: {
    query_layer?: { in: (string | string[])[]; ex: (string | string[])[] }[] | null;
    region?: string | null;
    list_medium?: string[];
    list_author_id?: string[];
    lang_abbr?: string | null;
    exclude_channel_links?: string[];
  };
}

describe("lenx_update_task", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("updates a task on success", async () => {
    const mockResponse = { data: { task_id: 42, updated: true } };
    vi.spyOn(LenxClient.prototype, "patch").mockResolvedValue(mockResponse);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerUpdateTask(server, client);

    const handler = getToolHandler(server, "lenx_update_task") as (
      args: UpdateTaskArgs,
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ task_id: 42, task_name: "Updated" }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(mockResponse));
  });

  it("sends PATCH with coerced task_id", async () => {
    const patchMock = vi.spyOn(LenxClient.prototype, "patch").mockResolvedValue({ data: { task_id: 42, updated: true } });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerUpdateTask(server, client);

    const handler = getToolHandler(server, "lenx_update_task") as (
      args: UpdateTaskArgs,
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    await handler({ task_id: "42" as unknown as number, task_name: "Renamed" }, { signal: new AbortController().signal });
    expect(patchMock).toHaveBeenCalledWith("/api/v1/tasks/42", { task_name: "Renamed" });
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "patch").mockRejectedValue(new Error("Not Found"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerUpdateTask(server, client);

    const handler = getToolHandler(server, "lenx_update_task") as (
      args: UpdateTaskArgs,
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ task_id: 999, task_name: "X" }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});
