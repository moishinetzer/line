import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { connectLovable } from "../server/lovable";
import { readPrompt } from "../../../apps/server/src/prompts.ts";
import type { AppSpec } from "../shared/protocol";

const [action, arg, extra] = process.argv.slice(2);
if (!action || action === "help") {
  console.log(`Lines Lovable bridge (local development)

npm run lovable -- login
npm run lovable -- workspaces
npm run lovable -- tools
npm run lovable -- prompt path/to/spec.json
npm run lovable -- create path/to/spec.json WORKSPACE_ID
npm run lovable -- inspect PROJECT_ID
npm run lovable -- messages PROJECT_ID
npm run lovable -- message PROJECT_ID MESSAGE_ID
npm run lovable -- deploy PROJECT_ID

Login opens a local OAuth callback on 127.0.0.1:8766.
Create consumes your Lovable build credits. Deploy publishes the selected app.
Neither create nor deploy runs automatically. Credentials stay in ignored .local/.
Create uses the fixed packages/prompts scenario file. Prompt prints that same fixed file unchanged.
The CLI uses .local/lovable-cli/; backend OAuth is separate.`);
  process.exit(0);
}

const allowed = [
  "login",
  "workspaces",
  "tools",
  "prompt",
  "create",
  "inspect",
  "messages",
  "message",
  "deploy",
];
if (!allowed.includes(action))
  throw new Error("Unknown command. Run npm run lovable -- help.");
if (
  ["prompt", "create", "inspect", "messages", "message", "deploy"].includes(
    action,
  ) &&
  !arg
)
  throw new Error("Missing argument. Run npm run lovable -- help.");
if (["create", "message"].includes(action) && !extra)
  throw new Error("Missing workspace or message ID.");
let spec: AppSpec | undefined;
if (action === "prompt" || action === "create") {
  spec = JSON.parse(await readFile(arg, "utf8")) as AppSpec;
  if (
    !spec.requestId ||
    !spec.groupId ||
    !["party", "morning", "boba"].includes(spec.kind) ||
    !Array.isArray(spec.participants)
  )
    throw new Error("Invalid AppSpec. See shared/protocol.ts.");
  const prompt = await readPrompt(spec.kind === "morning" ? "wakeup" : spec.kind);
  if (action === "prompt") {
    console.log(prompt);
    process.exit(0);
  }
}
const client = await connectLovable();
try {
  let result: unknown;
  if (action === "tools") result = await client.listTools();
  else if (action === "create")
    result = await client.callTool({ name: "create_project", arguments: { workspace_id: extra, initial_message: await readPrompt(spec!.kind === "morning" ? "wakeup" : spec!.kind), wait: false } });
  else {
    const name = {
      login: "get_me",
      workspaces: "list_workspaces",
      inspect: "get_project",
      messages: "list_messages",
      message: "get_message",
      deploy: "deploy_project",
    }[action]!;
    const args =
      action === "login" || action === "workspaces"
        ? {}
        : action === "message"
          ? { project_id: arg, message_id: extra }
          : { project_id: arg };
    result = await client.callTool({ name, arguments: args }, undefined, {
      timeout: 600_000,
    });
  }
  await mkdir(".local", { recursive: true });
  const resultPath = resolve(".local", `lovable-${action}-${Date.now()}.json`);
  await writeFile(resultPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  const isError = !!(
    result &&
    typeof result === "object" &&
    "isError" in result &&
    result.isError
  );
  console.log(
    `${isError ? "Lovable returned a tool error" : "MCP response received"}. Inspect the result before treating the operation as complete:\n${resultPath}`,
  );
  if (isError) process.exitCode = 1;
} finally {
  await client.close();
}
