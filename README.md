# Lines

A group agent living in a WhatsApp-style chat. Mention **@Lines** to turn the
conversation into a party checklist, morning leaderboard, or boba order board.
React + TypeScript + Vite frontend; Effect AI/Astra backend; Lovable MCP.

## Run

Node 22.12+; run from this repository's root:

```sh
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. The backend is http://localhost:3001.
Defaults use a mock agent and the three prebuilt Lovable demos from `.env.example`.
No keys are needed. Without `.env`, mock builds return a labelled local receipt.
Send `@Lines /build party`, `@Lines /build wakeup`, or `@Lines /build boba` in the
matching group. Switch Ao/Maya/Leo/Nina using the selector below the chat list.

For the original self-contained visual demo, open http://localhost:5173/?demo=1.
It has seeded conversations, simulated replies and interactive local mini-apps.
Standalone local views: `/?app=party`, `/?app=morning`, `/?app=boba`.
Generated Lovable sites keep separate browser demo data; this is not WhatsApp
messaging integration or a shared production database.

## Fixed prompts and Lovable approval

Start with **[docs/FIXED_PROMPTS.md](docs/FIXED_PROMPTS.md)**. The three complete
Markdown prompts in `packages/prompts/` are passed to Lovable unchanged.
They include fixed members, demo content, interaction rules and the final Lines
logo: three characters standing together with no connecting strokes.

If Lovable pauses for a plan approval, the app shows the editor link. Review and
decide there, then use **Check again** in the group app. This checks the same
project. The app does not auto-approve or create a replacement. Live project IDs
survive server restarts in ignored `.local/build-jobs.json`.

## Live Astra and Lovable

Set `AGENT_MODE=astra` and `OPENAI_API_KEY` in the root `.env`, then restart.
The model remains `gpt-6-astra`; the visible group participant is **Lines**.
`OPENAI_MODEL` and `OPENAI_BASE_URL` support the hackathon endpoint. Each response
needs a standalone `@Lines` tag; ordinary messages stay available as context.

To generate new apps, set `LOVABLE_MODE=mcp`, restart, and visit
http://localhost:3001/auth/lovable to complete OAuth. Tool discovery is at
`/lovable/tools`; workspace IDs at `/lovable/workspaces`. If needed, set
`LOVABLE_WORKSPACE_ID` explicitly. Build credits are used only in MCP mode.
Credentials remain local in `.env` and `.local/`. Every collaborator authenticates
on their own machine. The server returns previews; publishing is a separate step.

## Project map

| Area | Path |
| --- | --- |
| WhatsApp UI, logo, three local mini-apps | `apps/web/` |
| Moishi: backend and conversation prompt | `apps/server/`, `packages/prompts/agent.md` |
| Wire events and validation | `packages/protocol/src/index.ts` |
| Ao: fixed Lovable build prompts | `packages/prompts/party.md`, `wakeup.md`, `boba.md` |
| Moishi: prompt rehearsal | `apps/web/rehearsal.html`, `apps/web/src/rehearsal.ts` |
| Optional standalone Lovable developer CLI | `tools/lovable/` |

[Conversation rehearsal](docs/PROMPT-REHEARSAL.md) · [Integration details](docs/INTEGRATION.md) · [Demo script and published apps](docs/DEMO.md)

```sh
npm run typecheck
npm test
npm run build
```

Chat messages are in memory and reset on server restart. Live build receipts
persist separately to prevent accidental duplicate projects. There is no chat
API for synchronizing generated apps' task/order/check-in data.

## References

- [Lovable MCP](https://docs.lovable.dev/integrations/lovable-mcp-server)
- [Effect AI](https://effect.website/docs/v4/ai/)
- [Meta WhatsApp design reference](https://www.meta.com/design-at-meta/blog/whatsapp-user-interface-update/)

This hackathon UI is an unofficial WhatsApp-style prototype, not a Meta product.

The chat wallpaper is a [third-party WhatsApp doodle asset](https://github.com/nufrankz/whatsapp-css/blob/master/assets/data-asset-chat-background.png). The Lines mark is custom SVG based on Ao's visual direction, 6 October 2026.
