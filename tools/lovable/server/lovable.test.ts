import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "./lovable";
import type { AppSpec } from "../shared/protocol";

const spec: AppSpec = {
  requestId: "demo-1",
  groupId: "saturday",
  kind: "party",
  title: "Saturday, sorted",
  participants: [{ id: "ao", name: "Ao" }],
  initialData: {},
  rules: {},
  dataApiBaseUrl: "https://example.com/api",
};
test("generated app prompt includes matching read/write routes and action shapes", () => {
  const prompt = buildPrompt(spec);
  assert.match(
    prompt,
    /GET https:\/\/example.com\/api\/groups\/saturday\/state/,
  );
  assert.match(
    prompt,
    /POST https:\/\/example.com\/api\/groups\/saturday\/commands/,
  );
  assert.match(prompt, /party.claim/);
  assert.match(prompt, /roomId: "party"/);
  assert.match(prompt, /Do not use localStorage as the shared database/);
});
test("local or insecure data endpoints cannot be mistaken for a deployable data API", () => {
  assert.throws(
    () => buildPrompt({ ...spec, dataApiBaseUrl: "http://localhost:8000" }),
    /HTTPS/,
  );
});
