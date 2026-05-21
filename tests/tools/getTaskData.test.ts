import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LenxClient } from "../../src/client.js";
import { LenxConfig } from "../../src/config.js";
import { registerGetTaskData } from "../../src/tools/getTaskData.js";
import * as fs from "node:fs";
import * as path from "node:path";

const config: LenxConfig = { apiKey: "k", userId: "u", baseUrl: "https://api.test.com" };

function getToolHandler(server: McpServer, name: string) {
  const tools: Record<string, { handler: (...args: unknown[]) => unknown }> = (
    server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> }
  )._registeredTools;
  return tools[name].handler;
}

type GetTaskDataArgs = {
  task_id: number;
  from: number;
  to: number;
  size: number;
  search_after?: number;
  output_path?: string;
  output_mode?: "append" | "overwrite";
};
type HandlerResult = Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

function makePost(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "post1",
    hash: "abc",
    country: "US",
    lang_abbr: "en",
    medium: "News",
    channel: "CNN",
    channel_link: "https://cnn.com",
    site: "cnn.com",
    thread_link: "https://cnn.com/article",
    post_link: "https://cnn.com/article/1",
    thread_title: "Headline",
    post_message: "Content",
    post_timestamp: "2025-01-01T00:00:00Z",
    unix_timestamp: 1735689600000,
    author_name: "Author",
    author_id: "a1",
    author_image: "",
    author_link: "",
    is_comment: false,
    ...overrides,
  };
}

function makeHandler(server: McpServer, client: LenxClient) {
  return getToolHandler(server, "lenx_get_task_data") as (args: GetTaskDataArgs, extra: { signal: AbortSignal }) => HandlerResult;
}

describe("lenx_get_task_data", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns task data on success", async () => {
    const mockResponse = { data: [makePost()], total: 1 };
    vi.spyOn(LenxClient.prototype, "get").mockResolvedValue(mockResponse);
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTaskData(server, client);

    const handler = makeHandler(server, client);
    const result = await handler({ task_id: 1, from: 1740096000000, to: 1740787200000, size: 50 }, { signal: new AbortController().signal });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(mockResponse));
  });

  it("includes search_after in query string when provided", async () => {
    const mockFn = vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: [], total: 0 });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTaskData(server, client);

    const handler = makeHandler(server, client);
    await handler({ task_id: 1, from: 100000, to: 200000, size: 10, search_after: 150000 }, { signal: new AbortController().signal });
    const callPath = mockFn.mock.calls[0][0] as string;
    expect(callPath).toContain("search_after=150000");
  });

  it("returns isError on failure", async () => {
    vi.spyOn(LenxClient.prototype, "get").mockRejectedValue(new Error("Not Found"));
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const client = new LenxClient(config);
    registerGetTaskData(server, client);

    const handler = makeHandler(server, client);
    const result = await handler({ task_id: 999, from: 100000, to: 200000, size: 10 }, { signal: new AbortController().signal });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });

  describe("file write", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(process.cwd(), ".test-tmp-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("writes JSONL file and returns metadata when output_path is provided", async () => {
      const posts = [
        makePost({ id: "p1", unix_timestamp: 1735689600000 }),
        makePost({ id: "p2", unix_timestamp: 1735693200000 }),
      ];
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: posts, total: 100 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const filePath = path.join(tmpDir, "output.jsonl");
      const handler = makeHandler(server, client);
      const result = await handler({ task_id: 1, from: 100000, to: 200000, size: 50, output_path: filePath }, { signal: new AbortController().signal });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(100);
      expect(parsed.records_written).toBe(2);
      expect(parsed.first_timestamp).toBe(1735689600000);
      expect(parsed.last_timestamp).toBe(1735693200000);
      expect(parsed.file_path).toBe(path.resolve(filePath));
      expect(parsed.has_more).toBe(false);

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).id).toBe("p1");
      expect(JSON.parse(lines[1]).id).toBe("p2");
    });

    it("returns has_more when records_written equals size and is less than total", async () => {
      const posts = Array.from({ length: 50 }, (_, i) => makePost({ id: `p${i}`, unix_timestamp: 1735689600000 + i * 1000 }));
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: posts, total: 1000 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const filePath = path.join(tmpDir, "output.jsonl");
      const handler = makeHandler(server, client);
      const result = await handler({ task_id: 1, from: 100000, to: 200000, size: 50, output_path: filePath }, { signal: new AbortController().signal });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.has_more).toBe(true);
    });

    it("auto-appends .jsonl extension when missing", async () => {
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: [], total: 0 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const noExtPath = path.join(tmpDir, "output");
      const handler = makeHandler(server, client);
      const result = await handler({ task_id: 1, from: 100000, to: 200000, size: 10, output_path: noExtPath }, { signal: new AbortController().signal });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.file_path).toBe(path.resolve(noExtPath + ".jsonl"));
    });

    it("overwrites file in overwrite mode", async () => {
      const filePath = path.join(tmpDir, "test.jsonl");
      fs.writeFileSync(filePath, '{"id": "old"}\n', "utf-8");

      const posts = [makePost({ id: "new" })];
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: posts, total: 1 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const handler = makeHandler(server, client);
      await handler({ task_id: 1, from: 100000, to: 200000, size: 10, output_path: filePath, output_mode: "overwrite" }, { signal: new AbortController().signal });

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]).id).toBe("new");
    });

    it("appends to file in append mode", async () => {
      const filePath = path.join(tmpDir, "test.jsonl");
      fs.writeFileSync(filePath, '{"id": "existing"}\n', "utf-8");

      const posts = [makePost({ id: "new" })];
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: posts, total: 1 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const handler = makeHandler(server, client);
      await handler({ task_id: 1, from: 100000, to: 200000, size: 10, output_path: filePath, output_mode: "append" }, { signal: new AbortController().signal });

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).id).toBe("existing");
      expect(JSON.parse(lines[1]).id).toBe("new");
    });

    it("defaults to append mode when output_mode is not provided", async () => {
      const filePath = path.join(tmpDir, "test.jsonl");
      fs.writeFileSync(filePath, '{"id": "existing"}\n', "utf-8");

      const posts = [makePost({ id: "appended" })];
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: posts, total: 1 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const handler = makeHandler(server, client);
      await handler({ task_id: 1, from: 100000, to: 200000, size: 10, output_path: filePath }, { signal: new AbortController().signal });

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[1]).id).toBe("appended");
    });

    it("rejects paths outside the workspace", async () => {
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: [], total: 0 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const handler = makeHandler(server, client);
      const result = await handler({ task_id: 1, from: 100000, to: 200000, size: 10, output_path: "/tmp/outside.jsonl" }, { signal: new AbortController().signal });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("outside workspace");
    });

    it("returns error when parent directory creation fails", async () => {
      const posts = [makePost()];
      vi.spyOn(LenxClient.prototype, "get").mockResolvedValue({ data: posts, total: 1 });

      const server = new McpServer({ name: "test", version: "0.0.0" });
      const client = new LenxClient(config);
      registerGetTaskData(server, client);

      const filePath = path.join(tmpDir, "blocker", "output.jsonl");
      fs.writeFileSync(path.join(tmpDir, "blocker"), "", "utf-8");

      const handler = makeHandler(server, client);
      const result = await handler({ task_id: 1, from: 100000, to: 200000, size: 10, output_path: filePath }, { signal: new AbortController().signal });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBeTruthy();
    });
  });
});
