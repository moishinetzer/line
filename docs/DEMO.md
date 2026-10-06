# Hackathon demo handoff

Status as of 6 October 2026. Sources: this session's browser verification of Ao's
three Lovable apps, and the teammate's existing live backend handoff below.

## Prepared apps

| Group / prompt | Published app | Lovable project |
| --- | --- | --- |
| The Saturday Club / `party` | [Saturday, sorted](https://saturday-sorted-app.lovable.app) | `11bc9eb8-bbdc-4bdc-a1d2-f0c7006d58bb` |
| Early birds / `wakeup` | [Rise together](https://lines-rise-together.lovable.app) | `e95a3ecc-6c85-415e-81e8-4cd84f0556c9` |
| Boba break / `boba` | [The usual?](https://the-usual-by-lines.lovable.app) | `d7f86687-eee6-4d18-8bd5-674eac13e87a` |

All three published pages were loaded and their final Lines branding checked.
Party claiming was exercised; morning duplicate check-in and member switching
were verified; boba editing, form restoration and total calculations were checked.
These are standalone demos: party state lasts for its current tab; the other
two persist in localStorage. The fixed prompts now request localStorage for all
three future builds. Neither published app state nor local simulator state syncs
with group chat or another device. These generated project sources remain in
Lovable; the repository contains the local interactive versions and fixed prompts.

Two generated apps paused at plan approval during creation. Ao reviewed their
specific plans and approved both before MCP resumed them. Later builds may pause
again. Follow [FIXED_PROMPTS.md](FIXED_PROMPTS.md), not a blanket auto-approval.

## Rehearsal modes

- **Visual simulator:** `http://localhost:5173/?demo=1`. Seeded conversations,
  mock replies, working local mini-apps. No keys or server needed for UI-only use.
- **Connected mock:** `AGENT_MODE=mock`, `LOVABLE_MODE=mock`, URLs from `.env.example`.
  Tests the actual chat/WebSocket/build-card flow with the prepared apps.
- **Live conversation + prepared apps:** `AGENT_MODE=astra`, `LOVABLE_MODE=mock`.
  Real model conversation, prebuilt app URLs. Do not present this as new generation.
- **Live generation:** both modes live (`astra`, `mcp`). Requires local API key and
  OAuth. Generates a new preview, can pause for a human decision, consumes credits.

For the connected mock, paste the matching explicit command:

```text
@Lines /build party
@Lines /build wakeup
@Lines /build boba
```

In live conversation mode, naturally ask `@Lines, make a shared checklist for
Saturday`, `@Lines, make our morning check-in board`, or `@Lines, make our boba
order board`. Every response requires a fresh tag. Normal group messages remain
context but do not wake the agent. A bare `@Lines` asks what the group needs.

## Conversation rehearsal

Moishi's separate [rehearsal page](PROMPT-REHEARSAL.md) is available at
`/rehearsal.html`. `npm run dev:rehearsal` forces real Astra with mocked Lovable.
Keep his conversation prompt in `packages/prompts/agent.md`; the three app build
prompts remain owned by the frontend side. The rehearsal room is separate.

## Recording flow

1. In each group, switch Ao/Maya/Leo/Nina and exchange a few normal messages to
   establish the plan. Show that Lines stays quiet.
2. Mention `@Lines` and request the matching fixed app. Capture the reply and
   build status. If Lovable pauses, review the plan in the editor and approve
   only that plan. Return to **View project → Check again**.
3. Open the ready card. Follow its app link. Show a concrete interaction:
   claim Ice; check in once; change a boba order and see the updated total.
4. Take each scenario separately. Cut long build waits in editing if needed.
   Keep credentials and OAuth pages outside the recording.

No screen recording is included. Use macOS Shift-Command-5 if recording locally.
The narrow WhatsApp navigation rail is hidden; the chat list and actor selector
remain visible. The final logo is three colored characters without connectors.

## Earlier teammate verification, retained for provenance

The repository's original handoff recorded a live Astra authentication response
and a party build through the backend on 6 October 2026, in the teammate's `work`
Lovable workspace. That earlier [Party Squad preview](https://id-preview--528877cf-f6fc-400a-b103-2c9b0c01985e.lovable.app)
used Alex/Sam/Jo and predates the fixed Lines prompts and UI. It is supporting
integration evidence, not one of the three presentation apps above.

## Operating limits

The integration suite uses local Responses/MCP test servers. It does not verify
a new live build under another collaborator's credentials. Root `.env` and all
OAuth state are excluded from Git; each machine authenticates independently.
Chats clear on restart; live build receipts persist in `.local/build-jobs.json`.
Checking a pending job is read-only. Publishing stays a separate Lovable action.
