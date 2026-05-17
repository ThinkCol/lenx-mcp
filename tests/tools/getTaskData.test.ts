import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerGetTaskData } from "../../src/tools/getTaskData.js";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

type GetTaskDataArgs = { task_id: number; from: number; to: number; size: number; search_after?: number };
type HandlerResult = Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

describe("lenx_get_task_data", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns task data on success", async () => {
    const mockResponse = { data: [{ id: "post1", hash: "abc", country: "US", lang_abbr: "en", medium: "News", channel: "CNN", channel_link: "https://cnn.com", site: "cnn.com", thread_link: "https://cnn.com/article", post_link: "https://cnn.com/article/1", thread_title: "Headline", post_message: "Content", post_timestamp: "2025-01-01T00:00:00Z", unix_timestamp: 1735689600, author_name: "Author", author_id: "a1", author_image: "", author_link: "", is_comment: false }], total: 1 };
    vi.spyOn(LenxClient.prototype, "get").mockResolvedValue(mockResponse);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTaskData(server, client);

    const handler = getToolHandler(server, "lenx_get_task_data") as (args: GetTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
    const result = await handler({ task_id: 1, from: 1740096000, to: 1740787200, size: 50 }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(mockResponse));
  });

  it("includes search_after in query string when provided", async () => {
    const mockFn = vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: [], total: 0 });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTaskData(server, client);

    const handler = getToolHandler(server, "lenx_get_task_data") as (args: GetTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
    await handler({ task_id: 1, from: 100, to: 200, size: 10, search_after: 150 }, { signal: new AbortController().signal });
    const callPath = mockFn.mock.calls[0][0] as string;
    expect(callPath).toContain("search_after=150");
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "get").mockRejectedValue(new Error("Not Found"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTaskData(server, client);

    const handler = getToolHandler(server, "lenx_get_task_data") as (args: GetTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
    const result = await handler({ task_id: 999, from: 100, to: 200, size: 10 }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});
