import { z } from "zod";

export const ScenarioSchema = z.enum(["party", "wakeup", "boba"]);
export type Scenario = z.infer<typeof ScenarioSchema>;
export const UserSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
});
export type User = z.infer<typeof UserSchema>;

// Join once per socket (or again to switch participant/room).
export const ClientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("room.join"), roomId: z.string().min(1).max(100), user: UserSchema }),
  z.object({ type: z.literal("chat.send"), id: z.string().min(1).max(100), text: z.string().trim().min(1).max(12000) }),
  z.object({ type: z.literal("room.reset") }),
]);
export type ClientEvent = z.infer<typeof ClientEventSchema>;

export type ChatMessage = {
  id: string;
  roomId: string;
  user: User;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  replyTo?: string;
};

export type Build = {
  id: string;
  scenario: Scenario;
  status: "building" | "ready" | "failed";
  url?: string;
  projectId?: string;
  error?: string;
  mocked: boolean;
};

export type ServerEvent =
  | { type: "room.snapshot"; roomId: string; messages: ChatMessage[]; builds: Build[]; participants: User[]; agentMode: "mock" | "astra"; lovableMode: "mock" | "mcp" }
  | { type: "room.participants"; roomId: string; participants: User[] }
  | { type: "chat.message"; roomId: string; message: ChatMessage }
  | { type: "agent.status"; roomId: string; requestId: string; status: "thinking" | "idle" }
  | { type: "site.building" | "site.ready" | "site.failed"; roomId: string; requestId: string; build: Build }
  | { type: "error"; code: string; message: string; requestId?: string };
