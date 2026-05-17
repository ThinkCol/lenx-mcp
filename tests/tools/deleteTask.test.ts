import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerDeleteTask } from "../../src/tools/deleteTask.js";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

interface DeleteTaskArgs {
  task_id: number;
}

describe("lenx_delete_task", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("deletes a task on success", async () => {
    const mockResponse = { data: { task_id: 42, deleted: true } };
    vi.spyOn(LenxClient.prototype, "delete").mockResolvedValue(mockResponse);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerDeleteTask(server, client);

    const handler = getToolHandler(server, "lenx_delete_task") as (
      args: DeleteTaskArgs,
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ task_id: 42 }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(mockResponse));
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "delete").mockRejectedValue(new Error("Forbidden"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerDeleteTask(server, client);

    const handler = getToolHandler(server, "lenx_delete_task") as (
      args: DeleteTaskArgs,
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({ task_id: 1 }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});
