import { LenxConfig } from "./config.js";

export class LenxClient {
  private baseUrl: string;
  private apiKey: string;
  private userId: string;
  private version: string;

  constructor(config: LenxConfig, version: string) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.userId = config.userId;
    this.version = version;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const headers: Record<string, string> = {
      "User-Agent": "lenx-mcp",
      "X-Lenx-MCP-Version": this.version,
      "x-api-key": this.apiKey,
      "x-user-id": this.userId,
      "Content-Type": "application/json",
    };

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), init);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Network error: ${message}`);
    }

    if (!response.ok) {
      const status = response.status;
      let message: string;
      try {
        const errorBody = await response.json() as { message?: string; error?: string };
        message = errorBody.message ?? errorBody.error ?? `HTTP ${status}`;
      } catch {
        message = `HTTP ${status}`;
      }
      if (status >= 500) {
        throw new Error(`Server error: ${status}`);
      }
      throw new Error(message);
    }

    // Handle empty body (e.g., 204 No Content)
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0" || response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
