import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerCreateTask } from "../../src/tools/createTask.js";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

interface CreateTaskArgs {
  task_type: "live" | "adhoc";
  task_name: string;
  language: "zh-t" | "zh-s" | "en";
  date_range?: { from: number; to: number };
  search_query: {
    query_layer?: { in: (string | string[])[]; ex: (string | string[])[] }[] | null;
    region?: string | null;
    list_medium?: string[];
    list_author_id?: string[];
    lang_abbr?: string | null;
    exclude_channel_links?: string[];
  };
}

describe("lenx_create_task", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("creates a task on success", async () => {
    const mockResponse = { data: { task_id: 1 } };
    vi.spyOn(LenxClient.prototype, "post").mockResolvedValue(mockResponse);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerCreateTask(server, client);

    const handler = getToolHandler(server, "lenx_create_task") as (
      args: CreateTaskArgs,
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({
      task_type: "adhoc",
      task_name: "Brand Monitor",
      language: "en",
      date_range: { from: 1740096000000, to: 1740787200000 },
      search_query: {
        query_layer: [{ in: ["brand_name", "product_name"], ex: ["competitor_name"] }],
        region: "USA",
        list_medium: ["News", "Forum"],
      },
    }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(mockResponse));
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "post").mockRejectedValue(new Error("Bad Request: invalid body"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerCreateTask(server, client);

    const handler = getToolHandler(server, "lenx_create_task") as (
      args: CreateTaskArgs,
      extra: { signal: AbortSignal }
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await handler({
      task_type: "live",
      task_name: "Test",
      language: "en",
      search_query: { query_layer: [{ in: ["kw"], ex: [] }] },
    }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Bad Request: invalid body");
  });
});
