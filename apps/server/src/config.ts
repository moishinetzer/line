import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../../", import.meta.url));
loadEnv({ path: `${root}/.env`, quiet: true });

export type Config = {
  host: string;
  port: number;
  agentMode: "mock" | "astra";
  lovableMode: "mock" | "mcp";
  apiKey: string;
  model: string;
  apiUrl: string;
  mcpUrl: string;
  workspaceId?: string;
  stateDir: string;
  demoUrls: Partial<Record<"party" | "wakeup" | "boba", string>>;
};

export function readConfig(): Config {
  const agentMode = process.env.AGENT_MODE ?? "mock";
  const lovableMode = process.env.LOVABLE_MODE ?? "mock";
  if (agentMode !== "mock" && agentMode !== "astra") throw new Error("AGENT_MODE must be mock or astra");
  if (lovableMode !== "mock" && lovableMode !== "mcp") throw new Error("LOVABLE_MODE must be mock or mcp");
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (agentMode === "astra" && !apiKey) throw new Error("Set OPENAI_API_KEY in root .env to use Astra");
  return {
    host: process.env.HOST ?? "127.0.0.1", port, agentMode, lovableMode, apiKey,
    model: process.env.OPENAI_MODEL || "gpt-6-astra",
    apiUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    mcpUrl: process.env.LOVABLE_MCP_URL || "https://mcp.lovable.dev",
    workspaceId: process.env.LOVABLE_WORKSPACE_ID || undefined,
    stateDir: `${root}/.local`,
    demoUrls: { party: process.env.DEMO_PARTY_URL, wakeup: process.env.DEMO_WAKEUP_URL, boba: process.env.DEMO_BOBA_URL },
  };
}
