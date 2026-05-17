import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerListTasks } from "../../src/tools/listTasks.js";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

describe("lenx_list_tasks", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns tasks on success", async () => {
    const mockData = { data: [{ task_id: 1, task_name: "Test" }], pagination: { page: 1, size: 10, total: 1, totalPages: 1 } };
    vi.spyOn(LenxClient.prototype, "get").mockResolvedValue(mockData);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerListTasks(server, client);

    const handler = getToolHandler(server, "lenx_list_tasks") as (
      args: { page?: number; size?: number },
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ page: 1, size: 10 }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toEqual({ type: "text", text: JSON.stringify(mockData) });
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "get").mockRejectedValue(new Error("Server error: 500"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerListTasks(server, client);

    const handler = getToolHandler(server, "lenx_list_tasks") as (
      args: { page?: number; size?: number },
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ page: 1, size: 10 }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Server error: 500");
  });
});
