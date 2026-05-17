import { describe, it, expect, afterEach } from "vitest";
import { loadConfig, ConfigError } from "../src/config.js";

const OLD_ENV = process.env;

describe("loadConfig", () => {
  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("returns config when both required env vars are set", () => {
    process.env = { LENX_API_KEY: "key123", LENX_USER_ID: "user456" };
    const config = loadConfig();
    expect(config.apiKey).toBe("key123");
    expect(config.userId).toBe("user456");
    expect(config.baseUrl).toBe("https://open.lenx.ai");
  });

  it("uses custom base_url when provided", () => {
    process.env = {
      LENX_API_KEY: "key123",
      LENX_USER_ID: "user456",
      LENX_BASE_URL: "https://custom.lenx.ai",
    };
    const config = loadConfig();
    expect(config.baseUrl).toBe("https://custom.lenx.ai");
  });

  it("throws ConfigError when LENX_API_KEY is missing", () => {
    process.env = { LENX_USER_ID: "user456" };
    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow("LENX_API_KEY is required");
  });

  it("throws ConfigError when LENX_USER_ID is missing", () => {
    process.env = { LENX_API_KEY: "key123" };
    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow("LENX_USER_ID is required");
  });

  it("throws ConfigError when both required vars are missing", () => {
    process.env = {};
    expect(() => loadConfig()).toThrow(ConfigError);
    try {
      loadConfig();
    } catch (e) {
      const msg = (e as ConfigError).message;
      expect(msg).toContain("LENX_API_KEY");
      expect(msg).toContain("LENX_USER_ID");
    }
  });

  it("rejects whitespace-only values", () => {
    process.env = { LENX_API_KEY: "   ", LENX_USER_ID: "   " };
    expect(() => loadConfig()).toThrow(ConfigError);
  });
});
