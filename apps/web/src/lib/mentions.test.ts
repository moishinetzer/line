import test from "node:test";
import assert from "node:assert/strict";
import {
  agentMentions,
  mentionedAgentIds,
  mentionQuery,
  shouldWakeAgent,
} from "../../shared/mentions";
import { commandSchema, type MemberId } from "../../shared/protocol";
import { reduceDemo, finishDemoBuild } from "./demo";
import { seedSnapshot } from "./data";

test("only an explicit standalone Lines mention wakes the agent", () => {
  for (const text of [
    "@Lines make our plan",
    "Can you help, @lines?",
    "Hey (@LINES), help!",
    "@Lines.",
    "你好，@Lines 帮忙",
  ]) {
    assert.deepEqual(mentionedAgentIds(text), ["lines"], text);
  }
  for (const text of [
    "Lines make our plan",
    "@Astra make our plan",
    "@Linesman help",
    "@Lines-bot help",
    "@lineschan",
    "me@lines.dev",
    "me@lines",
    "https://example.com/@lines",
    "@Lines.com",
    "@@lines",
  ]) {
    assert.deepEqual(mentionedAgentIds(text), [], text);
  }
  assert.deepEqual(mentionedAgentIds("@Lines, hey @lines!"), ["lines"]);
  assert.equal(agentMentions("Hey @lInEs!")[0].text, "@lInEs");
});

test("any group member can wake Lines; ordinary messages and forged metadata stay quiet", () => {
  for (const actor of ["ao", "maya", "leo", "nina"] as MemberId[]) {
    const original = seedSnapshot();
    const normal = {
      type: "message.send",
      roomId: "party",
      actor,
      text: "Can someone bring ice?",
      mentions: ["lines"],
    } as const;
    const command = commandSchema.parse(normal);
    assert.equal(shouldWakeAgent(command), false);
    const quiet = reduceDemo(original, command);
    assert.equal(
      quiet.rooms.party.messages.length,
      original.rooms.party.messages.length + 1,
    );
    assert.equal(quiet.rooms.party.messages.at(-1)!.author, actor);
    assert.equal(quiet.rooms.party.appStatus, "ready");
    const awake = reduceDemo(quiet, {
      type: "message.send",
      roomId: "party",
      actor,
      text: "@Lines make the checklist",
    });
    assert.equal(awake.rooms.party.appStatus, "building");
    assert.equal(awake.rooms.party.messages.at(-1)!.author, "lines");
    assert.deepEqual(awake.rooms.party.messages.at(-2)!.mentions, ["lines"]);
    assert.equal(
      finishDemoBuild(awake, "party").rooms.party.appStatus,
      "ready",
    );
  }
});

test("a bare mention asks for a task and a direct build command cannot bypass the gate", () => {
  const original = seedSnapshot();
  const next = reduceDemo(original, {
    type: "message.send",
    roomId: "boba",
    actor: "nina",
    text: "@Lines!",
  });
  assert.equal(next.rooms.boba.appStatus, "ready");
  assert.match(
    next.rooms.boba.messages.at(-1)!.text,
    /What would you like me to do/,
  );
  assert.equal(
    commandSchema.safeParse({ type: "app.build", roomId: "party", actor: "ao" })
      .success,
    false,
  );
});

test("mention suggestions identify the token at the cursor, including inside a sentence", () => {
  assert.deepEqual(mentionQuery("Hey @li", 7), { start: 4, end: 7 });
  assert.deepEqual(mentionQuery("Hey @ plan this", 5), { start: 4, end: 5 });
  assert.equal(mentionQuery("me@li", 5), null);
  assert.equal(mentionQuery("@Maya", 5), null);
  assert.equal(mentionQuery("@Linesman", 3), null);
});
