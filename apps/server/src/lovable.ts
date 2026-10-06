import { Context, Effect, Layer } from "effect";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Build, Scenario } from "@group-dots/protocol";
import type { Config } from "./config.ts";
import { type BuildResult, toError } from "./agent.ts";
import { LovableAuth } from "./lovable-auth.ts";

export class SiteBuilder extends Context.Service<SiteBuilder, {
  build: (scenario: Scenario, prompt: string, checkpoint?: (result: BuildResult) => Promise<void>) => Effect.Effect<BuildResult, Error>;
  check: (build: Build) => Effect.Effect<BuildResult, Error>;
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

type ToolConnection = Pick<LovableConnection, "call">;

// get_message.status is the USER message status and can stay running forever.
// The agent's nested response is authoritative; scaffold completion is not a build.
export function agentOutcome(data: Record<string, unknown>): string {
  const response = (data.response ?? data.agent_response) as Record<string, unknown> | undefined;
  const result = response && typeof response === "object" ? response : data;
  if (result.awaiting_input || result.status === "awaiting_input") return "awaiting_input";
  if (result.completion_reason && result.completion_reason !== "finished") return "failed";
  if (["failed", "error", "stopped"].includes(String(result.status))) return "failed";
  if (result.status === "completed") return "ready";
  return "checking";
}

export function siteBuilderLayer(config: Config, connection: ToolConnection) {
  const inspect = async (build: BuildResult): Promise<BuildResult> => {
    if (!build.projectId) throw new Error("No project ID was returned. Inspect Lovable before resetting this build; do not create another project blindly.");
    let status = build.status ?? "checking";
    if (build.messageId) {
      const message = await connection.call("get_message", { project_id: build.projectId, message_id: build.messageId });
      status = agentOutcome(message) as Build["status"];
    }
    if (status === "awaiting_input") return { ...build, status, error: undefined };
    if (status === "failed") return { ...build, status, error: "Lovable stopped or failed. Inspect the existing project in the editor." };
    const project = await connection.call("get_project", { project_id: build.projectId });
    const details = project.project as Record<string, unknown> | undefined;
    // Without a message, require positive agent completion, never provisioning.status.
    if (!build.messageId) status = details?.agentFinished === true ? "ready" : "checking";
    const url = findString(project, ["preview_url", "previewUrl"]);
    if (status === "ready" && url && /^https?:\/\//.test(url)) return { ...build, status, url, error: undefined };
    return { ...build, status: "checking", error: undefined };
  };
  return Layer.succeed(SiteBuilder, {
    build: (scenario, prompt, checkpoint) => Effect.tryPromise({
      try: async () => {
        if (config.lovableMode === "mock") {
          await new Promise((resolve) => setTimeout(resolve, 300));
          return { status: "ready" as const, url: config.demoUrls[scenario] || `http://localhost:${config.port}/demo/${scenario}`, mocked: true };
        }
        const created = await connection.call("create_project", {
          initial_message: prompt,
          ...(config.workspaceId ? { workspace_id: config.workspaceId } : {}),
          wait: false,
          timeout_seconds: 600,
        });
        if (created.available_workspaces || String(created.status).toUpperCase() === "WAITING") {
          throw new Error("Lovable needs a workspace selection. Set LOVABLE_WORKSPACE_ID in .env; inspect before resetting this job.");
        }
        const projectId = findString(created, ["projectId", "project_id"]) ?? (typeof created.id === "string" ? created.id : undefined);
        if (!projectId) throw new Error("Lovable did not return a project ID. Inspect your workspace before resetting this job.");
        // Use the TOP-LEVEL user message ID, never the agent response's message ID.
        const messageId = typeof created.message_id === "string" ? created.message_id : undefined;
        const initial: BuildResult = {
          projectId, messageId, editorUrl: `https://lovable.dev/projects/${encodeURIComponent(projectId)}`,
          status: created.agent_response || created.response || created.awaiting_input ? agentOutcome(created) as Build["status"] : "checking", mocked: false,
        };
        await checkpoint?.(initial);
        return inspect(initial);
      },
      catch: toError,
    }),
    check: (build) => Effect.tryPromise({ try: () => inspect(build), catch: toError }),
  });
}

function findString(data: unknown, keys: string[]): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  for (const key of keys) if (typeof record[key] === "string" && record[key]) return record[key];
  for (const value of Object.values(record)) {
    if (typeof value === "object") { const found = findString(value, keys); if (found) return found; }
  }
}
