import test from "node:test";
import assert from "node:assert/strict";
import { readSavedSnapshot } from "./persistence";
import { seedSnapshot } from "./data";

test("the rename preserves previous demo data and migrates only the legacy storage format", () => {
  const seed = seedSnapshot();
  seed.rooms.party.items[2].owner = "nina";
  const legacy = JSON.stringify(seed)
    .replaceAll('"lines"', '"astra"')
    .replaceAll("@Lines", "@Astra");
  assert.equal(readSavedSnapshot(legacy), null);
  const restored = readSavedSnapshot(legacy, true)!;
  assert.equal(restored.rooms.party.items[2].owner, "nina");
  assert.equal(restored.rooms.party.messages.at(-1)!.author, "lines");
  assert.match(restored.rooms.party.messages.at(-2)!.text, /@Lines/);
  assert.equal(readSavedSnapshot("not json", true), null);
});
