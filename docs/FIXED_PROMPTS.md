# Lines: fixed hackathon prompts

Approved scope from Ao's hackathon requests, 6 October 2026. These are the
canonical build inputs. Use the whole matching Markdown file **verbatim** as
Lovable `initial_message`. Do not prepend another design brief, interpolate
conversation history, change names/prices/rules, or substitute a new prompt.
Each file is self-contained, including the exact final three-character SVG.

| Scenario sent to `build_site` | Ready-to-use prompt | App |
| --- | --- | --- |
| `party` | [party.md](../packages/prompts/party.md) | Saturday, sorted |
| `wakeup` | [wakeup.md](../packages/prompts/wakeup.md) | Rise together |
| `boba` | [boba.md](../packages/prompts/boba.md) | The usual? |

The UI calls the morning room `morning`; the backend scenario is `wakeup`.
The server reads these files on demand through `readPrompt`. The model only
chooses a scenario. It cannot rewrite the build prompt. Chat behavior is in
[agent.md](../packages/prompts/agent.md). Fixed input improves consistency;
generative builds can still vary visually. For a repeatable presentation,
use the [verified prebuilt sites](DEMO.md).

## Plan to build approval

Observed with Lovable MCP during this session on 6 October 2026; tool contract
verified from `get_message` and `respond_to_approval` tool discovery.
[Lovable MCP documentation](https://docs.lovable.dev/integrations/lovable-mcp-server).

1. Create once. Save the returned **project ID and top-level user message ID**.
   Poll `get_message` for that same pair. Never use the nested agent message ID.
2. Inspect **`response.status`**, not only the top-level `status` (which can stay
   `running` even after completion). In `create_project`, inspect `agent_response`.
   Scaffold/provisioning `get_project.status=completed` is not proof of a build.
3. `awaiting_input` is a human decision, not a failure. Show the exact proposed
   tool/parameters and plan for review. In this app, open the supplied Lovable
   editor link and decide there. The chat's **Check again** button only reads
   status; it neither approves nor starts a replacement build.
4. When an MCP-operating agent has a human decision on the specific proposal,
   it may use `respond_to_approval` with `project_id`, the original user
   `message_id`, the actual pending `event_id`, and `decision`. Do not fabricate
   identifiers or assume authorization. The earlier approval of two particular
   apps in this session is not blanket approval for later projects or new plans.
5. If `requires_secure_form` is true, or it is a spend/credit check-in, use the
   Lovable editor. Never collect credentials in chat. Do not use `send_message`
   to answer an approval: it can supersede the paused turn.
6. After approval, check the same message until the agent finishes. Read
   `completion_reason` as well: stopped/error/policy/max-iteration outcomes
   are not success. A preview URL alone is not success either.
7. Deployment is separate from generation. This backend returns the completed
   preview; it does not call `deploy_project`. Publish intentionally if needed.

The backend journals live build IDs in ignored `.local/build-jobs.json`, including
paused and uncertain jobs. Reconnects and server restarts keep these receipts.
If creation loses its response before an ID arrives, inspect Lovable manually;
the backend prevents a blind retry. `room.reset` intentionally clears a room's
receipt, so do not use it to resume a paused project. The UI only offers reset in
mock/local demo mode. No automatic approval or automatic replacement project.
