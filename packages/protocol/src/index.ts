import { z } from "zod";

export const ScenarioSchema = z.enum(["party", "wakeup", "boba"]);
export type Scenario = z.infer<typeof ScenarioSchema>;
export const UserSchema = z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(100) });
export type User = z.infer<typeof UserSchema>;

export const ClientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("room.join"), roomId: z.string().min(1).max(100), user: UserSchema }),
  z.object({ type: z.literal("chat.send"), id: z.string().min(1).max(100), text: z.string().trim().min(1).max(12000) }),
  z.object({ type: z.literal("room.reset") }),
  z.object({ type: z.literal("build.check"), buildId: z.string().min(1).max(100) }),
]);
export type ClientEvent = z.infer<typeof ClientEventSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(), roomId: z.string(), user: UserSchema,
  role: z.enum(["user", "assistant"]), text: z.string(),
  createdAt: z.string().datetime({ offset: true }), replyTo: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
const HttpUrl = z.string().url().refine((url) => /^https?:\/\//.test(url));
export const BuildSchema = z.object({
  id: z.string(), scenario: ScenarioSchema,
  status: z.enum(["building", "ready", "failed", "awaiting_input", "checking"]),
  url: HttpUrl.optional(), projectId: z.string().optional(), messageId: z.string().optional(),
  editorUrl: HttpUrl.optional(), error: z.string().optional(), mocked: z.boolean(),
});
export type Build = z.infer<typeof BuildSchema>;

export const ServerEventSchema = z.union([
  z.object({ type: z.literal("room.snapshot"), roomId: z.string(), messages: z.array(ChatMessageSchema), builds: z.array(BuildSchema), participants: z.array(UserSchema), agentMode: z.enum(["mock", "astra"]), lovableMode: z.enum(["mock", "mcp"]) }),
  z.object({ type: z.literal("room.participants"), roomId: z.string(), participants: z.array(UserSchema) }),
  z.object({ type: z.literal("chat.message"), roomId: z.string(), message: ChatMessageSchema }),
  z.object({ type: z.literal("agent.status"), roomId: z.string(), requestId: z.string(), status: z.enum(["thinking", "idle"]) }),
  z.object({ type: z.enum(["site.building", "site.ready", "site.failed", "site.waiting"]), roomId: z.string(), requestId: z.string(), build: BuildSchema }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string(), requestId: z.string().optional() }),
]);
export type ServerEvent = z.infer<typeof ServerEventSchema>;

// A standalone @Lines mention, not an email, URL, or longer handle.
export const hasLinesMention = (text: string): boolean =>
  /(?<![\p{L}\p{N}_@./:+-])@lines(?![\p{L}\p{N}_@-]|\.[\p{L}\p{N}_])/iu.test(text);
