import test from "node:test";
import assert from "node:assert/strict";
import { reduceDemo, londonDay, sevenDayWindow } from "./demo";
import { seedSnapshot } from "./data";
import { commandSchema, serverEventSchema } from "../../shared/protocol";

test("claiming updates the owner and conversation; other members cannot steal or complete it", () => {
  const original = seedSnapshot();
  const claimed = reduceDemo(original, {
    type: "party.claim",
    roomId: "party",
    actor: "ao",
    itemId: "ice",
  });
  assert.equal(
    original.rooms.party.items.find((i) => i.id === "ice")!.owner,
    null,
  );
  assert.equal(
    claimed.rooms.party.items.find((i) => i.id === "ice")!.owner,
    "ao",
  );
  assert.match(claimed.rooms.party.messages.at(-1)!.text, /Ao is bringing/);
  for (const type of ["party.claim", "party.toggle"] as const) {
    const result = reduceDemo(claimed, {
      type,
      roomId: "party",
      actor: "maya",
      itemId: "ice",
    });
    assert.equal(result, claimed);
  }
  const done = reduceDemo(claimed, {
    type: "party.toggle",
    roomId: "party",
    actor: "ao",
    itemId: "ice",
  });
  assert.equal(done.rooms.party.items.find((i) => i.id === "ice")!.done, true);
});
test("check-in is unique per member per London date and the cutoff accounts for DST", () => {
  let state = seedSnapshot();
  const checkin = {
    type: "morning.checkin",
    roomId: "morning",
    actor: "ao",
  } as const;
  state = reduceDemo(state, checkin, new Date("2026-10-06T06:30:00Z"));
  assert.equal(state.rooms.morning.checkins[0].onTime, true);
  assert.equal(
    reduceDemo(state, checkin, new Date("2026-10-06T07:00:00Z")),
    state,
  );
  state = reduceDemo(state, checkin, new Date("2026-10-07T06:31:00Z"));
  assert.equal(state.rooms.morning.checkins[1].onTime, false);
  state = reduceDemo(state, checkin, new Date("2026-11-07T07:30:00Z"));
  assert.equal(state.rooms.morning.checkins[2].onTime, true);
  assert.equal(londonDay(new Date("2026-10-06T23:30:00Z")), "2026-10-07");
});
test("changing a drink replaces the same member’s order and preserves everyone else", () => {
  const first = reduceDemo(seedSnapshot(), {
    type: "boba.order",
    roomId: "boba",
    actor: "ao",
    drinkId: "classic",
    sugar: "50%",
    ice: "Less ice",
  });
  const second = reduceDemo(first, {
    type: "boba.order",
    roomId: "boba",
    actor: "ao",
    drinkId: "taro",
    sugar: "0%",
    ice: "No ice",
  });
  assert.equal(second.rooms.boba.orders.length, 2);
  assert.equal(
    second.rooms.boba.orders.find((o) => o.member === "ao")!.drinkId,
    "taro",
  );
  assert.equal(
    second.rooms.boba.orders.find((o) => o.member === "maya")!.drinkId,
    "matcha",
  );
  assert.match(second.rooms.boba.messages.at(-1)!.text, /2 of 4/);
});
test("protocol rejects blank messages, unknown identities and executable app URLs", () => {
  assert.equal(
    commandSchema.safeParse({
      type: "message.send",
      roomId: "party",
      actor: "ao",
      text: "   ",
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "message.send",
      roomId: "party",
      actor: "stranger",
      text: "hello",
    }).success,
    false,
  );
  const state = seedSnapshot();
  state.rooms.party.appUrl = "javascript:alert(1)";
  assert.equal(
    serverEventSchema.safeParse({ version: 1, type: "snapshot", data: state })
      .success,
    false,
  );
});

test("a check-in one second after the London cutoff is late", () => {
  const state = reduceDemo(seedSnapshot(), { type: "morning.checkin", roomId: "morning", actor: "ao" }, new Date("2026-10-06T06:30:01Z"));
  assert.equal(state.rooms.morning.checkins[0].onTime, false);
});

test("the seven-day leaderboard window uses London calendar dates across DST", () => {
  const days = sevenDayWindow(new Date("2026-10-26T00:15:00Z"));
  assert.equal(days.size, 7);
  assert.ok(days.has("2026-10-20"));
  assert.ok(days.has("2026-10-26"));
  assert.equal(days.has("2026-10-19"), false);
});
