# Frontend handoff

Run `npm install` then `npm run dev`. The server is `http://localhost:3001`;
the React WhatsApp-style frontend is `http://localhost:5173`.

Ao owns the main UI in `apps/web/` and the three Lovable build prompts.
Moishi owns `apps/server/`, `packages/prompts/agent.md`, and the separate
`rehearsal.html` prompt playground.
Shared types and runtime validation: `@group-dots/protocol`.
Prompt files are read on every request/build, so editing prompts needs no restart.

## Connect and send

```ts
import type { ClientEvent, ServerEvent } from "@group-dots/protocol";

const socket = new WebSocket("ws://localhost:3001/ws");
const send = (event: ClientEvent) => socket.send(JSON.stringify(event));
socket.onopen = () => send({
  type: "room.join",
  roomId: "demo",
  user: { id: "alex", name: "Alex" },
});
socket.onmessage = ({ data }) => {
  const event: ServerEvent = JSON.parse(data);
  console.log(event);
};
// After room.snapshot arrives:
send({ type: "chat.send", id: crypto.randomUUID(), text: "@Lines let's plan a party" });
```

`room.join` may be sent again to switch identity or room. All sockets in a room
receive messages and build events. The server echoes accepted user messages;
deduplicate by message ID if rendering optimistically. IDs must be unique per room;
resending the same ID does not trigger another agent turn or build.

Only messages containing the standalone tag `@Lines` (case-insensitive) trigger
an agent turn. Each response needs a fresh tag; untagged follow-ups do not wake
the agent. All messages are broadcast and kept as context. Turns run in order per
room. Different rooms can run independently. `room.snapshot` replays history and
build state on reconnect. Chat is in memory and clears on restart. Live build receipts persist in `.local/build-jobs.json`.

## Events to render

| Event | Render |
| --- | --- |
| `room.snapshot` | Replace history, participants, builds; inspect mock/live modes |
| `room.participants` | Update participants |
| `chat.message` | Append user or Lines message |
| `agent.status` | Typing indicator (`thinking` / `idle`) |
| `site.building` | Build progress card |
| `site.ready` | Link card using `build.url` |
| `site.waiting` | Approval or ongoing build; open `build.editorUrl`, then `build.check` |
| `site.failed` | Failed build card using `build.error` |
| `error` | Visible error; retry with a fresh message ID |

`requestId` links progress/errors to the originating `chat.send.id`.
Use `build.id` to update build cards rather than appending duplicates.

Send `{ type: "room.reset" }` to clear an idle room for the next demo.
Reset is rejected while a request is running. It deliberately clears the build receipt too; never reset to resume an approval. The UI exposes reset only in mock/local mode.

Send `{ type: "build.check", buildId }` to read the existing Lovable project again.
It does not approve, send a message, publish or create a project. `awaiting_input`
means review in Lovable. `checking` means generation is ongoing. See
[FIXED_PROMPTS.md](FIXED_PROMPTS.md) for the full approval procedure.

## Three build prompts

The only agent tool is `build_site({ scenario: "party" | "wakeup" | "boba" })`.
It reads the matching Markdown file from `packages/prompts/`. Prompt contents
are passed unchanged to Lovable; conversation details are not interpolated yet.
The same scenario is reused within a room after a successful build. Reset the
room to intentionally build it again.

Mock agent commands: `@Lines /build party`, `@Lines /build wakeup`, `@Lines /build boba`.
These go through the same build pipeline. A mock Lovable URL is a clearly labelled
local receipt, not a generated app. Set `DEMO_PARTY_URL`, `DEMO_WAKEUP_URL`, or
`DEMO_BOBA_URL` to point mock results at prebuilt demo sites.

## Frontend adapter

`apps/web/src/lib/socket-transport.ts` maps validated shared wire events into
local view state. Three room sockets (`party`, `morning`, `boba`) keep histories
separate; the `morning` room expects the backend `wakeup` scenario. Participant
switching sends `room.join` before the next message. Ready cards deduplicate by
build ID; reconnects request fresh snapshots. `agent.status` controls typing.
Unknown user IDs still render their supplied name instead of crashing.

The default UI uses `VITE_WS_URL` (root `.env`). `?demo=1` or `VITE_DEMO_MODE=true`
uses the original local simulator. `?app=...` is always a local mini-app view.
`apps/web/shared/protocol.ts` describes those local widgets, not the wire API.
The app drawer links to real sites in connected mode and hosts interactive local
widgets in simulator mode. No cross-device app-state synchronization is implied.

The backend also accepts `@Astra` as a compatibility alias. The WhatsApp composer uses `@Lines`; both invoke the same `gpt-6-astra` model. Main demo rooms start with two ordinary friend messages, with the recording request prefilled.
