# Optional standalone Lovable CLI

Retained from Ao's original frontend workspace, 6 October 2026. The application's
primary integration lives in `apps/server`; use the root README for that route.
This CLI is a developer tool for inspecting projects and intentional publication.

```sh
npm run lovable -- help
npm run lovable -- login
npm run lovable -- tools
npm run lovable -- workspaces
npm run lovable -- prompt tools/lovable/party-spec.example.json
npm run lovable -- create tools/lovable/party-spec.example.json WORKSPACE_ID
npm run lovable -- inspect PROJECT_ID
npm run lovable -- messages PROJECT_ID
npm run lovable -- message PROJECT_ID MESSAGE_ID
npm run lovable -- deploy PROJECT_ID
```

Run from the repository root. OAuth callback is `127.0.0.1:8766`; credentials go
in `.local/lovable-cli/`, separate from backend OAuth on port 3001. No credentials
are copied from the old workspace. Raw tool responses are saved in ignored
`.local/`; inspect them before treating an operation as successful.
`create` consumes credits; `deploy` publishes. Neither runs automatically.
`prompt` and `create` read the same fixed file from `packages/prompts/`; the JSON
spec is retained for scenario selection, but its custom details are not inserted.
There is no CLI auto-approval. See [the approval workflow](../../docs/FIXED_PROMPTS.md).

The original `buildPrompt(AppSpec)` generator is preserved in `server/lovable.ts`
as an experimental future shared-data integration and has its existing tests.
It is **not used by this hackathon's create commands**. Its proposed HTTPS
`/groups/:id/state` and `/groups/:id/commands` endpoints are not implemented in
this repository. `shared/protocol.ts` here documents that old local contract;
use `@group-dots/protocol` for the application's actual WebSocket events.
