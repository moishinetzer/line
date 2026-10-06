import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Effect, Layer, ManagedRuntime } from "effect";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import type { Scenario } from "@group-dots/protocol";
import { Agent, agentLayer } from "../src/agent.ts";
import { LovableConnection, SiteBuilder, siteBuilderLayer } from "../src/lovable.ts";
import { LovableAuth } from "../src/lovable-auth.ts";
import { readPrompt } from "../src/prompts.ts";
import type { Config } from "../src/config.ts";

const listen = (server: Server) => new Promise<number>((resolve) => server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (address && typeof address !== "string") resolve(address.port);
}));
const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

test("Astra Responses tool loop calls MCP with each fixed prompt and returns its URL", async () => {
  const dir = await mkdtemp(`${tmpdir()}/group-dots-integrations-`);
  const requests: Record<string, any>[] = [];
  const prompts: string[] = [];
  let failBuild = false;
  const mcp = new McpServer({ name: "test-lovable", version: "1" });
  mcp.registerTool("create_project", {
    inputSchema: { initial_message: z.string(), wait: z.boolean(), timeout_seconds: z.number() },
  }, async ({ initial_message }) => {
    prompts.push(initial_message);
    if (failBuild) return { isError: true, content: [{ type: "text", text: "Build rejected" }] };
    return { structuredContent: { projectId: "project-test", status: "completed" }, content: [{ type: "text", text: "Created" }] };
  });
  mcp.registerTool("get_project", { inputSchema: { project_id: z.string() } }, async () => ({
    structuredContent: { project: { id: "project-test", agentFinished: true, preview_url: "https://demo.example.test/preview" } },
    content: [{ type: "text", text: "Preview" }],
  }));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => "test-session", enableJsonResponse: true });
  await mcp.connect(transport);
  const mcpHttp = createServer((request, response) => {
    void transport.handleRequest(request, response).catch((error) => { response.statusCode = 500; response.end(String(error)); });
  });
  const mcpPort = await listen(mcpHttp);
  const aiHttp = createServer((request, response) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString());
      requests.push(body);
      const result = body.input.find((item: any) => item.type === "function_call_output");
      const input = JSON.stringify(body.input.filter((item: any) => item.role === "user").at(-1));
      const scenario = input.includes("wakeup") ? "wakeup" : input.includes("boba") ? "boba" : "party";
      let toolResult = result ? JSON.parse(result.output) : undefined;
      if (typeof toolResult === "string") toolResult = JSON.parse(toolResult);
      const output = result ? [{
        type: "message", id: "msg-test", role: "assistant", status: "completed",
        content: [{ type: "output_text", text: toolResult.url ?? `Build failed: ${toolResult.error}`, annotations: [] }],
      }] : [
        { type: "reasoning", id: "rs-test", summary: [], encrypted_content: "encrypted-test-reasoning" },
        { type: "function_call", id: "fc-test", call_id: "call-test", name: "build_site", arguments: JSON.stringify({ scenario }), status: "completed" },
      ];
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: `resp-${requests.length}`, model: "gpt-6-astra", created_at: 1, output, usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } }));
    })().catch(() => { response.statusCode = 500; response.end(); });
  });
  const aiPort = await listen(aiHttp);
  const config: Config = {
    host: "127.0.0.1", port: 3001, agentMode: "astra", lovableMode: "mcp", apiKey: "test-key",
    model: "gpt-6-astra", apiUrl: `http://127.0.0.1:${aiPort}`, mcpUrl: `http://127.0.0.1:${mcpPort}/mcp`, stateDir: dir, demoUrls: {},
  };
  const connection = new LovableConnection(config);
  const runtime = ManagedRuntime.make(Layer.mergeAll(agentLayer(config), siteBuilderLayer(config, connection)));
  try {
    for (const scenario of ["party", "wakeup", "boba"] as const) {
      const reply = await runtime.runPromise(Effect.flatMap(Agent, (agent) => agent.respond({
        messages: [{ id: scenario, roomId: "test", role: "user", user: { id: "alex", name: "Alex" }, text: `Build ${scenario}`, createdAt: new Date().toISOString() }],
        buildSite: async (chosen: Scenario) => {
          assert.equal(chosen, scenario);
          const prompt = await readPrompt(chosen);
          return runtime.runPromise(Effect.flatMap(SiteBuilder, (builder) => builder.build(chosen, prompt)));
        },
      })));
      assert.equal(reply, "https://demo.example.test/preview");
      assert.equal(prompts.at(-1), await readPrompt(scenario));
    }
    assert.equal(requests.length, 6);
    assert.ok(requests.every((request) => request.model === "gpt-6-astra"));
    assert.equal(requests[0].tools[0].name, "build_site");
    assert.ok(requests[1].input.some((item: any) => item.type === "function_call_output" && item.call_id === "call-test"));
    assert.ok(requests[1].input.some((item: any) => item.type === "reasoning" && item.encrypted_content === "encrypted-test-reasoning"));
    assert.equal(requests[1].tool_choice, "none");
    failBuild = true;
    await assert.rejects(runtime.runPromise(Effect.flatMap(SiteBuilder, (builder) => builder.build("party", "Test failure"))), /Build rejected/);
    const oauth = new LovableAuth(config);
    await assert.rejects(oauth.callback("code", "invalid-state"), /Invalid or expired OAuth state/);
  } finally {
    await runtime.dispose(); await connection.close(); await mcp.close();
    await close(aiHttp); await close(mcpHttp); await rm(dir, { recursive: true, force: true });
  }
});
