import { describe, it, expect, beforeEach, vi } from "vitest";
import { LenxClient } from "../src/client.js";
import { LenxConfig } from "../src/config.js";

const config: LenxConfig = { apiKey: "test-key", userId: "test-user", baseUrl: "https://api.test.com" };

describe("LenxClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends x-api-key and x-user-id headers on every request", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );
    const client = new LenxClient(config);
    await client.get("/api/v1/tasks");
    const call = mockFetch.mock.calls[0];
    const headers = (call[1] as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-key");
    expect(headers["x-user-id"]).toBe("test-user");
  });

  it("uses 30s timeout via AbortSignal", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );
    const client = new LenxClient(config);
    await client.get("/api/v1/tasks");
    const signal = (mockFetch.mock.calls[0][1] as RequestInit).signal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("throws for 4xx responses with API error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid parameters" }), { status: 400 })
    );
    const client = new LenxClient(config);
    await expect(client.get("/api/v1/tasks")).rejects.toThrow("Invalid parameters");
  });

  it("throws generic Server error for 5xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Internal error" }), { status: 500 })
    );
    const client = new LenxClient(config);
    await expect(client.get("/api/v1/tasks")).rejects.toThrow("Server error: 500");
  });

  it("throws Network error on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new LenxClient(config);
    await expect(client.get("/api/v1/tasks")).rejects.toThrow("Network error: ECONNREFUSED");
  });

  it("sends POST body as JSON", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 201 })
    );
    const client = new LenxClient(config);
    const body = { task_name: "test" };
    await client.post("/api/v1/tasks", body);
    const call = mockFetch.mock.calls[0];
    expect((call[1] as RequestInit).body).toBe(JSON.stringify(body));
  });

  it("sends PATCH body as JSON", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 })
    );
    const client = new LenxClient(config);
    const body = { task_name: "updated" };
    await client.patch("/api/v1/tasks/1", body);
    const call = mockFetch.mock.calls[0];
    expect((call[1] as RequestInit).body).toBe(JSON.stringify(body));
  });

  it("DELETE request works", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { task_id: 1, deleted: true } }), { status: 200 })
    );
    const client = new LenxClient(config);
    const result = await client.delete<{ data: { task_id: number; deleted: boolean } }>("/api/v1/tasks/1");
    expect(result.data.deleted).toBe(true);
  });

  it("returns null for 204 No Content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204, headers: { "content-length": "0" } })
    );
    const client = new LenxClient(config);
    const result = await client.delete<null>("/api/v1/tasks/1");
    expect(result).toBeNull();
  });

  it("falls back to error field when message is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    );
    const client = new LenxClient(config);
    await expect(client.get("/api/v1/tasks")).rejects.toThrow("Forbidden");
  });

  it("falls back to HTTP status for non-JSON error body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 400 })
    );
    const client = new LenxClient(config);
    await expect(client.get("/api/v1/tasks")).rejects.toThrow("HTTP 400");
  });
});
