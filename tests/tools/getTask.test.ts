import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerGetTask } from "../../src/tools/getTask.js";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

describe("lenx_get_task", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns task details on success", async () => {
    const mockData = { data: { task_id: 42, task_name: "Monitor", task_type: "live", language: "en", search_query: { query_layer: [{ in: ["keyword"], ex: [] }] }, prompts: { sentiment: "Analyze sentiment...", irrelevancy: null } } };
    vi.spyOn(LenxClient.prototype, "get").mockResolvedValue(mockData);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTask(server, client);

    const handler = getToolHandler(server, "lenx_get_task") as (
      args: { task_id: number },
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ task_id: 42 }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(mockData));
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "get").mockRejectedValue(new Error("Not Found"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTask(server, client);

    const handler = getToolHandler(server, "lenx_get_task") as (
      args: { task_id: number },
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ task_id: 999 }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });

  it("coerces string task_id to number in URL", async () => {
    const mockFn = vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: { task_id: 42 } });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTask(server, client);

    const handler = getToolHandler(server, "lenx_get_task") as (
      args: { task_id: number },
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    await handler({ task_id: "42" as unknown as number }, { signal: new AbortController().signal });
    expect(mockFn).toHaveBeenCalledWith("/api/v1/tasks/42");
  });
});
