# Recorded demo handoff

Target: a silent screen recording of the localhost WhatsApp mock and the Lovable
mini-apps. Narration and presenter video will be added afterward. Build waits can
be cut from the recording.

## Current readiness

| Piece | Status |
| --- | --- |
| Astra authentication | Verified with a live response |
| Lovable OAuth + workspace | Verified locally; `work` workspace selected |
| `@Astra` trigger | Tested; untagged messages remain context without calling the model |
| Party: chat → Astra tool → Lovable → preview | Verified live on 6 October 2026 |
| Wake-up and boba adapter flows | Passing against local test servers; real builds pending |
| Conversation flow for all three scenarios | Verified with live Astra and mocked builds; rehearsal page ready |
| WhatsApp mock and final Lovable prompt content | Awaiting teammate's changes |

Verified party preview:
https://id-preview--528877cf-f6fc-400a-b103-2c9b0c01985e.lovable.app

The preview loaded as **Party Squad**, with Alex/Sam/Jo participant controls,
item assignments, purchase toggles, and a reset button. This verifies the live
backend route and page load; it is not a full acceptance test of every control.

## Merge handoff

- UI belongs in `apps/web/`; the current page is a disposable integration starter.
- Moishi owns conversation instructions in `packages/prompts/agent.md`.
- The three fixed build prompts are `party.md`, `wakeup.md`, and `boba.md` in the
  same directory. The backend sends them unchanged, without chat interpolation.
- Follow [INTEGRATION.md](INTEGRATION.md) and import `@group-dots/protocol` for types.
- Every request to the agent must contain `@Astra`, including UI shortcut buttons.
- Render `site.building`, `site.ready`, and `site.failed` as states of the same
  build card. The ready URL comes from `build.url`.

After merging, run `npm install`, `npm run build`, and `npm test`.
Then run `npm run dev` and open http://localhost:5173.
Local credentials are deliberately excluded from Git; another machine must
configure its own root `.env` and complete Lovable OAuth.

For prompt iteration, use `npm run dev:rehearsal` and open
http://localhost:5173/rehearsal.html. See [PROMPT-REHEARSAL.md](PROMPT-REHEARSAL.md).

## Capture flow

Use Alex, Sam, and Jo unless the final prompts introduce different names.

1. Start with a clean chat. Send ordinary messages between friends to establish
   the plan and show that Astra stays quiet.
2. Send `@Astra can you help us organise this?` and capture the response.
3. Continue the conversation, then explicitly tag Astra to request the selected
   app. Ordinary replies alone do not trigger the agent.
4. Capture the build card changing to a ready link. Cut the middle of the wait
   in the edit if needed.
5. Open the Lovable preview and demonstrate a visible interaction. Capture each
   scenario as a separate take so one can be replaced without repeating all three.

Suggested shots: party item assignment/check-off; morning check-in/leaderboard;
boba selection/group order summary. Exact UI actions follow the generated app.

For a prepared-site take, use `AGENT_MODE=astra`, `LOVABLE_MODE=mock`, and set the
corresponding `DEMO_PARTY_URL`, `DEMO_WAKEUP_URL`, or `DEMO_BOBA_URL` locally.
That mode uses a prebuilt site; it does not perform fresh generation. The live
party generation has already been verified separately.

## Recording setup

Use the [macOS Screenshot recorder](https://support.apple.com/en-gb/102618)
(`Shift-Command-5`) to capture only the demo
browser area. Keep the microphone off because narration is added afterward.
Store recordings locally outside Git. Close credential/account setup pages
before capture and keep the debug event panel collapsed.

Browser driving is available through Codex's computer-use tools. A video has not
been recorded yet; capture should begin after the teammate UI and final prompts
are merged.

## Current operating limits

- A build can occupy its room's agent queue for up to ten minutes. New chat
  messages still appear, and subsequent agent turns wait.
- There is no automatic polling/resume after a Lovable build times out. Inspect
  the existing project before retrying to avoid creating another project.
- Resetting the chat or restarting the server clears its in-memory build cache.
  Save useful preview links before doing either.
- Preview links are returned without publishing the apps to production.
