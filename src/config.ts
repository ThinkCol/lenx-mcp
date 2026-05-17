export class ConfigError extends Error {
  constructor(public readonly errors: string[]) {
    super("Lenx MCP configuration errors:\n" + errors.map((e) => `  - ${e}`).join("\n"));
    this.name = "ConfigError";
  }
}

export interface LenxConfig {
  apiKey: string;
  userId: string;
  baseUrl: string;
}

export function loadConfig(): LenxConfig {
  const env = process.env;
  const apiKey = (env.LENX_API_KEY ?? "").trim();
  const userId = (env.LENX_USER_ID ?? "").trim();
  const baseUrl = (env.LENX_BASE_URL ?? "https://open.lenx.ai").trim();

  const errors: string[] = [];
  if (!apiKey) errors.push("LENX_API_KEY is required but was not provided");
  if (!userId) errors.push("LENX_USER_ID is required but was not provided");

  if (errors.length > 0) {
    throw new ConfigError(errors);
  }

  return { apiKey, userId, baseUrl };
}
