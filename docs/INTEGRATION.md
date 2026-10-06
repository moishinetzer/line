# Frontend handoff

Run `npm install` then `npm run dev`. The server is `http://localhost:3001`;
the replaceable frontend starter is `http://localhost:5173`.

Your files: `apps/web/` and `packages/prompts/*.md`. Backend files: `apps/server/`.
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
send({ type: "chat.send", id: crypto.randomUUID(), text: "Let's plan a party" });
```

`room.join` may be sent again to switch identity or room. All sockets in a room
receive messages and build events. The server echoes accepted user messages;
deduplicate by message ID if rendering optimistically. IDs must be unique per room;
resending the same ID does not trigger another agent turn or build.

Every accepted chat message gets one agent turn. No tag is required. Turns run in
order per room. Different rooms can run independently. `room.snapshot` replays
history and build state on reconnect. State is in memory and clears on restart.

## Events to render

| Event | Render |
| --- | --- |
| `room.snapshot` | Replace history, participants, builds; inspect mock/live modes |
| `room.participants` | Update participants |
| `chat.message` | Append user or Astra message |
| `agent.status` | Typing indicator (`thinking` / `idle`) |
| `site.building` | Build progress card |
| `site.ready` | Link card using `build.url` |
| `site.failed` | Failed build card using `build.error` |
| `error` | Visible error; retry with a fresh message ID |

`requestId` links progress/errors to the originating `chat.send.id`.
Use `build.id` to update build cards rather than appending duplicates.

Send `{ type: "room.reset" }` to clear an idle room for the next demo.
Reset is rejected while a turn/build is running.

## Three build prompts

The only agent tool is `build_site({ scenario: "party" | "wakeup" | "boba" })`.
It reads the matching Markdown file from `packages/prompts/`. Prompt contents
are passed unchanged to Lovable; conversation details are not interpolated yet.
The same scenario is reused within a room after a successful build. Reset the
room to intentionally build it again.

Mock agent commands: `/build party`, `/build wakeup`, `/build boba`.
These go through the same build pipeline. A mock Lovable URL is a clearly labelled
local receipt, not a generated app. Set `DEMO_PARTY_URL`, `DEMO_WAKEUP_URL`, or
`DEMO_BOBA_URL` to point mock results at prebuilt demo sites.
