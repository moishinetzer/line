import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Effect, ManagedRuntime } from "effect";
import { SiteBuilder, siteBuilderLayer, agentOutcome } from "../src/lovable.ts";
import { buildJournal } from "../src/build-journal.ts";
import type { Config } from "../src/config.ts";
import type { Build } from "@group-dots/protocol";

const config: Config = { host: "localhost", port: 3001, agentMode: "mock", lovableMode: "mcp", apiKey: "", model: "test", apiUrl: "", mcpUrl: "", stateDir: "", demoUrls: {} };

test("Lovable approval resumes the same project; nested completion overrides running user status", async () => {
  let paused = true;
  const calls: string[] = [];
  const connection = { call: async (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    calls.push(name);
    if (name === "create_project") return { projectId: "existing", message_id: "user-message", status: "in_progress", agent_response: { message_id: "agent-message", status: "awaiting_input", awaiting_input: { event_id: "approval" } } };
    if (name === "get_message") {
      assert.equal(args.message_id, "user-message");
      assert.equal(args.project_id, "existing");
      return { status: "running", response: paused ? { status: "awaiting_input", awaiting_input: { event_id: "approval" } } : { status: "completed", completion_reason: "finished" } };
    }
    if (name === "get_project") return { status: "completed", preview_url: "https://preview.example.test", project: { agentFinished: false } };
    throw new Error(`Unexpected mutation: ${name}`);
  } };
  const runtime = ManagedRuntime.make(siteBuilderLayer(config, connection));
  let receipt: unknown;
  try {
    const pending = await runtime.runPromise(Effect.flatMap(SiteBuilder, (builder) => builder.build("party", "fixed prompt", async (value) => { receipt = value; })));
    assert.equal(pending.status, "awaiting_input");
    assert.equal(pending.url, undefined);
    assert.ok(receipt, "Save identifiers before polling");
    const build: Build = { ...pending, id: "build-1", scenario: "party", status: pending.status! };
    const stillWaiting = await runtime.runPromise(Effect.flatMap(SiteBuilder, (builder) => builder.check(build)));
    assert.equal(stillWaiting.status, "awaiting_input");
    paused = false; // Models a human answering in the editor, not an auto-approval.
    const ready = await runtime.runPromise(Effect.flatMap(SiteBuilder, (builder) => builder.check(build)));
    assert.equal(ready.status, "ready");
    assert.equal(ready.url, "https://preview.example.test");
    assert.equal(calls.filter((name) => name === "create_project").length, 1);
    assert.equal(calls.includes("respond_to_approval"), false);
    assert.equal(calls.includes("send_message"), false);
  } finally { await runtime.dispose(); }
});

test("scaffold completion without agent completion never announces a ready app", async () => {
  const runtime = ManagedRuntime.make(siteBuilderLayer(config, { call: async (name) => name === "create_project"
    ? { projectId: "scaffold", status: "completed" }
    : { status: "completed", preview_url: "https://preview.example.test", project: { agentFinished: false } } }));
  try {
    const result = await runtime.runPromise(Effect.flatMap(SiteBuilder, (builder) => builder.build("boba", "fixed")));
    assert.equal(result.status, "checking");
    assert.equal(result.url, undefined);
    assert.equal(agentOutcome({ status: "running", response: { status: "completed", completion_reason: "max_iterations" } }), "failed");
    assert.equal(agentOutcome({ status: "running", response: { status: "stopped" } }), "failed");
  } finally { await runtime.dispose(); }
});

test("live receipts survive restart; ambiguous interrupted creates require inspection", async () => {
  const dir = await mkdtemp(`${tmpdir()}/lines-journal-`);
  try {
    const journal = await buildJournal(dir);
    await journal.save("party", [{ id: "one", scenario: "party", status: "awaiting_input", projectId: "p1", messageId: "m1", mocked: false }]);
    await journal.save("boba", [{ id: "two", scenario: "boba", status: "building", mocked: false }]);
    const restored = await buildJournal(dir);
    assert.equal(restored.get("party")[0].status, "awaiting_input");
    assert.equal(restored.get("party")[0].messageId, "m1");
    assert.equal(restored.get("boba")[0].status, "failed");
    assert.match(restored.get("boba")[0].error!, /Inspect Lovable/);
    await restored.save("party", []);
    assert.deepEqual((await buildJournal(dir)).get("party"), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
