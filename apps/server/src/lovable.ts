import { Context, Effect, Layer } from "effect";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Scenario } from "@group-dots/protocol";
import type { Config } from "./config.ts";
import { type BuildResult, toError } from "./agent.ts";
import { LovableAuth } from "./lovable-auth.ts";

export class SiteBuilder extends Context.Service<SiteBuilder, {
  build: (scenario: Scenario, prompt: string) => Effect.Effect<BuildResult, Error>;
}>()("group-dots/SiteBuilder") {}

export class LovableConnection {
  readonly auth: LovableAuth;
  private client?: Client;
  private connecting?: Promise<Client>;

  constructor(private readonly config: Config) { this.auth = new LovableAuth(config); }

  async connect(): Promise<Client> {
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      const client = new Client({ name: "group-dots", version: "0.1.0" });
      const transport = new StreamableHTTPClientTransport(new URL(this.config.mcpUrl), { authProvider: this.auth });
      try {
        await client.connect(transport);
        this.client = client;
        return client;
      } catch (error) {
        await transport.close().catch(() => {});
        if (this.auth.authorizationUrl) throw new Error(`Connect Lovable at http://localhost:${this.config.port}/auth/lovable first`);
        throw error;
      }
    })();
    try { return await this.connecting; } finally { this.connecting = undefined; }
  }

  async call(name: string, args: Record<string, unknown>) {
    const client = await this.connect();
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 15 * 60_000 });
    const text = Array.isArray(result.content)
      ? result.content.filter((part) => part.type === "text").map((part) => part.text).join("\n")
      : "";
    if (result.isError) throw new Error(`Lovable ${name}: ${text || "tool call failed"}`);
    if (result.structuredContent) return result.structuredContent as Record<string, unknown>;
    try { return JSON.parse(text) as Record<string, unknown>; }
    catch { throw new Error(`Lovable ${name} returned an unexpected response. Inspect the MCP tool output before retrying.`); }
  }

  async close() { await this.client?.close(); this.client = undefined; }
}

export function siteBuilderLayer(config: Config, connection: LovableConnection) {
  return Layer.succeed(SiteBuilder, {
    build: (scenario, prompt) => Effect.tryPromise({
      try: async () => {
        if (config.lovableMode === "mock") {
          await new Promise((resolve) => setTimeout(resolve, 300));
          return { url: config.demoUrls[scenario] || `http://localhost:${config.port}/demo/${scenario}`, mocked: true };
        }
        const created = await connection.call("create_project", {
          initial_message: prompt,
          ...(config.workspaceId ? { workspace_id: config.workspaceId } : {}),
          wait: true,
          timeout_seconds: 600,
        });
        if (created.available_workspaces || String(created.status).toUpperCase() === "WAITING") {
          throw new Error("Lovable needs a workspace selection. Set LOVABLE_WORKSPACE_ID in .env and retry.");
        }
        const projectId = findString(created, ["projectId", "project_id"]) ?? projectField(created, "id");
        if (!projectId) throw new Error("Lovable did not return a project ID; inspect the response before retrying.");
        const status = String(created.status ?? "").toLowerCase();
        if (["failed", "error", "awaiting_input", "in_progress", "running", "timeout", "timed_out"].includes(status)) {
          throw new Error(`Lovable project ${projectId} is ${status}; check it in Lovable before building again.`);
        }
        const project = await connection.call("get_project", { project_id: projectId });
        const url = findString(project, ["preview_url", "previewUrl"]) ?? findString(created, ["preview_url", "previewUrl"]);
        if (!url || !/^https?:\/\//.test(url)) throw new Error(`Project ${projectId} exists but has no preview URL yet. Check Lovable.`);
        return { url, projectId, mocked: false };
      },
      catch: toError,
    }),
  });
}

function projectField(data: Record<string, unknown>, key: string): string | undefined {
  const project = data.project;
  return project && typeof project === "object" && key in project && typeof project[key as keyof typeof project] === "string"
    ? project[key as keyof typeof project] as string : undefined;
}

function findString(data: unknown, keys: string[]): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  for (const key of keys) if (typeof record[key] === "string" && record[key]) return record[key];
  for (const value of Object.values(record)) {
    if (typeof value === "object") { const found = findString(value, keys); if (found) return found; }
  }
}
