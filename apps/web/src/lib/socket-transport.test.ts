import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBuild, toMessage } from "./socket-transport";
import { seedSnapshot } from "./data";
import { ServerEventSchema, hasLinesMention } from "@group-dots/protocol";

test("wire messages preserve unfamiliar members and distinguish assistant roles", () => {
  const incoming = { id: "m", roomId: "party", role: "user" as const, user: { id: "new-person", name: "Ren" }, text: "Hello", createdAt: new Date().toISOString() };
  assert.equal(toMessage(incoming).authorName, "Ren");
  assert.equal(toMessage({ ...incoming, role: "assistant" }).author, "lines");
});
test("wakeup maps to morning; replayed ready cards deduplicate and approval stays pending", () => {
  let room = seedSnapshot().rooms.morning;
  const build = { id: "b", scenario: "wakeup" as const, status: "awaiting_input" as const, projectId: "p", editorUrl: "https://lovable.dev/projects/p", mocked: false };
  room = applyBuild(room, build);
  assert.equal(room.appStatus, "awaiting_input");
  assert.equal(room.appUrl, undefined);
  const ready = { ...build, status: "ready" as const, url: "https://demo.example.test" };
  room = applyBuild(applyBuild(room, ready), ready);
  assert.equal(room.messages.filter((message) => message.id === "build-b").length, 1);
  assert.equal(room.appUrl, ready.url);
  assert.equal(applyBuild(room, { ...ready, scenario: "party" }), room);
  assert.equal(ServerEventSchema.safeParse({ type: "site.ready", roomId: "morning", requestId: "r", build: { ...ready, url: "javascript:alert(1)" } }).success, false);
});
test("server wake gate matches UI mention boundaries", () => {
  for (const text of ["@Astra help", "@Lines help", "hey (@LINES)", "@Lines!", "@Lines。你好"]) assert.ok(hasLinesMention(text), text);
  for (const text of ["person@lines.com", "https://example.com/@lines", "@lines-team", "@LinesBot", "@lines.example", "@@Lines", "hello"]) assert.equal(hasLinesMention(text), false, text);
});
