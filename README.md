# Line

[GitHub repository](https://github.com/moishinetzer/line)

Astra in a group chat → one of three Lovable mini-apps. Local hackathon backend
with a replaceable frontend starter. npm workspaces, TypeScript, Effect 4 +
Effect AI, WebSockets, and the official MCP client SDK.

## Run

Node 22.12+ recommended.

```sh
npm install
npm run dev
```

Open http://localhost:5173. The backend runs on http://localhost:3001.
Everything starts in explicit mock mode without keys. Switch participants and
try the three build buttons. Mock builds return a local receipt page; configure
the `DEMO_*_URL` variables to return prebuilt sites instead.

## Work in parallel

| Owner | Files |
| --- | --- |
| Moishi: backend + conversation | `apps/server/`, `packages/prompts/agent.md` |
| Teammate: WhatsApp UI | Main page in `apps/web/` |
| Teammate: Lovable prompts | `packages/prompts/party.md`, `wakeup.md`, `boba.md` |
| Prompt rehearsal | `apps/web/rehearsal.html`, `apps/web/src/rehearsal.ts` |
| Shared contract | `packages/protocol/src/index.ts` |

**Frontend teammate: start with [docs/INTEGRATION.md](docs/INTEGRATION.md).**
For the recording and verified live-build status, see [docs/DEMO.md](docs/DEMO.md).
To tune the chat prompt with live Astra and fixed build results, see
[docs/PROMPT-REHEARSAL.md](docs/PROMPT-REHEARSAL.md).
You can run only the UI with `npm run dev:web` or only the backend with
`npm run dev:server`. Prompt edits are loaded on the next request, without a restart.

## Use Astra

```sh
cp .env.example .env
```

Set `AGENT_MODE=astra` and `OPENAI_API_KEY` in the root `.env`, then restart.
The default model is `gpt-6-astra`, using the Responses API via Effect AI.
`OPENAI_MODEL` and `OPENAI_BASE_URL` support a hackathon-specific endpoint/model.
There is no automatic fallback to another model. Keep `LOVABLE_MODE=mock` while
tuning conversation prompts if you want to avoid creating Lovable projects.

Only incoming messages tagged `@Astra` get an agent turn; ordinary group messages
remain available as context. Each new response requires a tag. The model can
respond conversationally, ask the group to wait, or call `build_site({ scenario })`. The tool reads exactly
one of `party.md`, `wakeup.md`, or `boba.md` and sends that fixed prompt to Lovable.

## Connect Lovable MCP

1. Set `LOVABLE_MODE=mcp` and restart.
2. Open http://localhost:3001/auth/lovable and complete browser OAuth.
3. Visit http://localhost:3001/lovable/tools to verify tool discovery.
4. If you have several eligible workspaces, get their IDs from
   http://localhost:3001/lovable/workspaces and set `LOVABLE_WORKSPACE_ID` explicitly.
5. Tag `@Astra` to build a site (or use `@Astra /build party` with the mock agent).

OAuth credentials are saved in `.local/lovable-auth.json`, excluded from Git.
The backend calls `create_project` with `wait=true`, then gets the preview URL
with `get_project`. It returns a preview link without publishing to production.
Live builds consume Lovable credits and can take several minutes.

## Verify

```sh
npm run typecheck
npm test
npm run build
```

Tests cover all three flows, room isolation/replay/reset, duplicate requests,
and the actual Effect AI Responses + MCP adapters against local test servers.
Live Astra access and Lovable OAuth/builds require your credentials and are not
verified by the automated suite.

State is in memory. Reconnecting restores a room's messages while the server is
running; restarting clears them. Reset an idle room between demos. Successful
builds are reused per scenario within a room to avoid duplicate generation.
This backend stops at handing back the URL; generated apps own their demo data.

## References

- [Astra model](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [Lovable MCP](https://docs.lovable.dev/integrations/lovable-mcp-server)
- [Effect AI](https://effect.website/docs/v4/ai/)
