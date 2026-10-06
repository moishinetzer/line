import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { WebSocket } from "ws";
import type { ClientEvent, ServerEvent } from "@group-dots/protocol";
import { startServer } from "../src/server.ts";
import type { Config } from "../src/config.ts";

export function testConfig(stateDir: string): Config {
  return { host: "127.0.0.1", port: 0, agentMode: "mock", lovableMode: "mock", apiKey: "", model: "gpt-6-astra", apiUrl: "https://api.openai.com/v1", mcpUrl: "https://mcp.lovable.dev", stateDir, demoUrls: {} };
}

export async function client(port: number, roomId = "demo", id = "alex") {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const events: ServerEvent[] = [];
  socket.on("message", (data) => events.push(JSON.parse(data.toString())));
  await once(socket, "open");
  const send = (event: ClientEvent) => socket.send(JSON.stringify(event));
  const wait = async (predicate: (event: ServerEvent) => boolean) => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const event = events.find(predicate);
      if (event) return event;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Timed out. Events: ${JSON.stringify(events)}`);
  };
  send({ type: "room.join", roomId, user: { id, name: id } });
  await wait((event) => event.type === "room.snapshot");
  return { socket, send, wait, events };
}

test("Lines only responds when tagged and retains ordinary group messages as context", async () => {
  const dir = await mkdtemp(`${tmpdir()}/group-dots-mentions-`);
  const requests: Array<{ input: unknown }> = [];
  const ai = createServer((request, response) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      requests.push(JSON.parse(Buffer.concat(chunks).toString()));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        id: `resp-${requests.length}`, model: "gpt-6-astra", created_at: 1,
        output: [{ id: `reply-${requests.length}`, type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Here to help.", annotations: [] }] }],
      }));
    })().catch(() => { response.statusCode = 500; response.end(); });
  });
  await new Promise<void>((resolve) => ai.listen(0, "127.0.0.1", resolve));
  const address = ai.address();
  assert.ok(address && typeof address !== "string");
  const server = await startServer({ ...testConfig(dir), agentMode: "astra", apiKey: "test-key", apiUrl: `http://127.0.0.1:${address.port}` });
  try {
    const alex = await client(server.port);
    for (const [id, text] of [
      ["ordinary", "Sam is buying the drinks."],
      ["email", "Contact alex@lines.com"],
      ["other-tag", "@LinesBot @linesl @lines-team"],
      ["unrelated-agent", "@AstraBot hello"],
      ["url", "https://example.com/@Lines"],
      ["tagged", "Hey @lInEs, can you help?"],
    ]) alex.send({ type: "chat.send", id, text });
    await alex.wait((event) => event.type === "chat.message" && event.message.replyTo === "tagged");
    assert.equal(requests.length, 1, "Untagged messages must not call the model");
    assert.match(JSON.stringify(requests[0].input), /Sam is buying the drinks/);
    assert.deepEqual(alex.events.filter((event) => event.type === "agent.status" && event.status === "thinking").map((event) => event.type === "agent.status" && event.requestId), ["tagged"]);
    alex.send({ type: "chat.send", id: "follow-up", text: "Jo will bring cups." });
    alex.send({ type: "chat.send", id: "tagged-again", text: "@Astra: what else is needed?" });
    await alex.wait((event) => event.type === "chat.message" && event.message.replyTo === "tagged-again");
    assert.equal(requests.length, 2, "Each agent turn needs its own tag");
    assert.match(JSON.stringify(requests[1].input), /Jo will bring cups/);
    const replies = alex.events.filter((event) => event.type === "chat.message" && event.message.role === "assistant");
    assert.deepEqual(replies.map((event) => event.type === "chat.message" && event.message.replyTo), ["tagged", "tagged-again"]);
  } finally {
    await server.close();
    await new Promise<void>((resolve) => ai.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});

test("three scenarios, room broadcasts, deduplication, replay, isolation and reset", async () => {
  const dir = await mkdtemp(`${tmpdir()}/group-dots-test-`);
  const server = await startServer(testConfig(dir));
  try {
    const alex = await client(server.port);
    const sam = await client(server.port, "demo", "sam");
    const other = await client(server.port, "other", "jo");
    for (const scenario of ["party", "wakeup", "boba"] as const) {
      alex.send({ type: "chat.send", id: scenario, text: `@Lines /build ${scenario}` });
      alex.send({ type: "chat.send", id: scenario, text: `@Lines /build ${scenario}` });
      await alex.wait((event) => event.type === "site.ready" && event.build.scenario === scenario);
      await sam.wait((event) => event.type === "chat.message" && event.message.replyTo === scenario);
      assert.equal(alex.events.filter((event) => event.type === "site.building" && event.build.scenario === scenario).length, 1);
      assert.equal(sam.events.filter((event) => event.type === "chat.message" && event.message.id === scenario).length, 1);
    }
    assert.equal(other.events.filter((event) => event.type === "chat.message").length, 0);
    const replay = await client(server.port, "demo", "jo");
    const snapshot = replay.events.find((event) => event.type === "room.snapshot");
    assert.equal(snapshot?.type === "room.snapshot" && snapshot.messages.length, 6);
    assert.equal(snapshot?.type === "room.snapshot" && snapshot.builds.length, 3);
    alex.send({ type: "chat.send", id: "reuse", text: "@Lines /build party" });
    await alex.wait((event) => event.type === "chat.message" && event.message.replyTo === "reuse");
    assert.equal(alex.events.filter((event) => event.type === "site.building").length, 3);
    alex.send({ type: "room.reset" });
    await alex.wait((event) => event.type === "room.snapshot" && event.messages.length === 0 && alex.events.filter((item) => item.type === "room.snapshot").length > 1);
    const reset = await client(server.port);
    const empty = reset.events.find((event) => event.type === "room.snapshot");
    assert.equal(empty?.type === "room.snapshot" && empty.messages.length, 0);
    const health = await fetch(`http://127.0.0.1:${server.port}/health`).then((response) => response.json());
    assert.equal(health.ok, true);
  } finally { await server.close(); await rm(dir, { recursive: true, force: true }); }
});

test("validates input, requires join, queues turns, and rejects reset while busy", async () => {
  const dir = await mkdtemp(`${tmpdir()}/group-dots-test-`);
  const server = await startServer(testConfig(dir));
  try {
    const fresh = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
    await once(fresh, "open");
    let incoming = once(fresh, "message");
    fresh.send("bad json");
    assert.equal(JSON.parse((await incoming)[0].toString()).code, "INVALID_MESSAGE");
    incoming = once(fresh, "message");
    fresh.send(JSON.stringify({ type: "chat.send", id: "x", text: "hello" }));
    assert.equal(JSON.parse((await incoming)[0].toString()).code, "JOIN_REQUIRED");
    fresh.close();
    const alex = await client(server.port);
    alex.send({ type: "chat.send", id: "first", text: "@Lines /build party" });
    alex.send({ type: "chat.send", id: "second", text: "@Lines thanks" });
    alex.send({ type: "room.reset" });
    await alex.wait((event) => event.type === "error" && event.code === "ROOM_BUSY");
    await alex.wait((event) => event.type === "chat.message" && event.message.replyTo === "second");
    const replies = alex.events.filter((event) => event.type === "chat.message" && event.message.role === "assistant");
    assert.deepEqual(replies.map((event) => event.type === "chat.message" && event.message.replyTo), ["first", "second"]);
  } finally { await server.close(); await rm(dir, { recursive: true, force: true }); }
});
