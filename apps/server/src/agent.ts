import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { Chat, Tool, Toolkit } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { ScenarioSchema, type ChatMessage, type Scenario, type Build } from "@group-dots/protocol";
import type { Config } from "./config.ts";
import { readPrompt } from "./prompts.ts";

export type BuildResult = Omit<Build, "id" | "scenario" | "status"> & { status?: Build["status"] };
export type AgentTurn = {
  messages: ChatMessage[];
  buildSite: (scenario: Scenario) => Promise<BuildResult>;
};

export class Agent extends Context.Service<Agent, {
  respond: (turn: AgentTurn) => Effect.Effect<string, Error>;
}>()("group-dots/Agent") {}

const BuildSite = Tool.make("build_site", {
  description: "Build the selected group mini-app using one of three fixed Lovable prompts. Choose party, wakeup, or boba when the group is ready.",
  parameters: Schema.Struct({ scenario: Schema.Literals(["party", "wakeup", "boba"]) }),
  success: Schema.String,
});
const SiteTools = Toolkit.make(BuildSite);

export function agentLayer(config: Config) {
  if (config.agentMode === "mock") {
    return Layer.succeed(Agent, {
      respond: ({ messages, buildSite }) => Effect.tryPromise({
        try: async () => {
          const text = messages.at(-1)?.text ?? "";
          const match = text.match(/^(?:@(?:lines|astra)[,:]?\s+)?\/build\s+(party|wakeup|boba)\s*$/i);
          if (match) {
            const result = await buildSite(ScenarioSchema.parse(match[1].toLowerCase()));
            if (result.status === "awaiting_input") return `Lovable is waiting for your plan approval. Review it here: ${result.editorUrl}. Then use Check again in the group app.`;
            if (result.status === "checking") return `Your project is still building: ${result.editorUrl}. Use Check again to refresh the same project.`;
            if (result.status === "failed" || !result.url) return `The build needs attention: ${result.error ?? "Check the project"}. ${result.editorUrl ?? ""}`;
            return `${result.mocked ? "Mock result" : "Your site"}: ${result.url}`;
          }
          return "[Mock Lines] I can help with party planning, a wake-up leaderboard, or a boba order. Send @Lines /build party, @Lines /build wakeup, or @Lines /build boba to test a build.";
        },
        catch: toError,
      }),
    });
  }

  const client = OpenAiClient.layer({ apiKey: Redacted.make(config.apiKey), apiUrl: config.apiUrl }).pipe(
    Layer.provide(FetchHttpClient.layer),
  );
  const model = OpenAiLanguageModel.layer({
    model: config.model,
    config: { reasoning: { effort: "low" }, store: false },
  }).pipe(Layer.provide(client));

  return Layer.succeed(Agent, {
    respond: (turn) => Effect.gen(function* () {
      const instructions = yield* Effect.tryPromise(() => readPrompt("agent"));
      const chat = yield* Chat.fromPrompt([
        { role: "system", content: instructions },
        ...turn.messages.map((message) => ({
          role: message.role,
          content: message.role === "user"
            ? `[${message.user.name}; id=${message.user.id}] ${message.text}`
            : message.text,
        })),
      ]);
      const toolkit = yield* SiteTools.pipe(Effect.provide(SiteTools.toLayer({
        build_site: ({ scenario }) => Effect.tryPromise({
          try: async () => JSON.stringify(await turn.buildSite(scenario)),
          catch: toError,
        }).pipe(Effect.catch((error) => Effect.succeed(JSON.stringify({ error: error.message })))),
      })));
      let response = yield* chat.generateText({ prompt: [], toolkit });
      if (response.toolCalls.length > 0) {
        // Chat preserves reasoning + tool-call items and tool results for Responses.
        response = yield* chat.generateText({ prompt: [], toolkit, toolChoice: "none" });
      }
      return response.text.trim() || "I'm here. What should we do next?";
    }).pipe(Effect.provide(model), Effect.mapError(toError)),
  });
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
