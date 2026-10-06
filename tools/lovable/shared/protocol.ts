import { z } from "zod";

export const roomIdSchema = z.enum(["party", "morning", "boba"]);
export const memberIdSchema = z.enum(["ao", "maya", "leo", "nina"]);
export type RoomId = z.infer<typeof roomIdSchema>;
export type MemberId = z.infer<typeof memberIdSchema>;
export const messageSchema = z.object({
  id: z.string(),
  author: z.union([memberIdSchema, z.literal("lines")]),
  text: z.string(),
  at: z.string().datetime({ offset: true }),
  appCard: z.boolean().optional(),
  mentions: z.array(z.literal("lines")).optional(),
});
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  emoji: z.string(),
  owner: memberIdSchema.nullable(),
  done: z.boolean(),
});
export const checkinSchema = z.object({
  member: memberIdSchema,
  date: z.string(),
  at: z.string().datetime({ offset: true }),
  onTime: z.boolean(),
});
export const orderSchema = z.object({
  member: memberIdSchema,
  drinkId: z.string(),
  sugar: z.string(),
  ice: z.string(),
});
export const roomSchema = z.object({
  id: roomIdSchema,
  messages: z.array(messageSchema),
  appStatus: z.enum(["idle", "building", "ready", "failed"]),
  appUrl: z
    .string()
    .url()
    .refine(
      (url) => /^https?:\/\//i.test(url),
      "App URLs must use HTTPS or HTTP",
    )
    .optional(),
  error: z.string().optional(),
  items: z.array(itemSchema),
  checkins: z.array(checkinSchema),
  orders: z.array(orderSchema),
});
export const snapshotSchema = z.object({
  rooms: z.object({ party: roomSchema, morning: roomSchema, boba: roomSchema }),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Message = z.infer<typeof messageSchema>;

const base = { roomId: roomIdSchema, actor: memberIdSchema };
export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("message.send"),
    text: z.string().trim().min(1).max(2000),
    mentions: z.array(z.literal("lines")).optional(),
  }),
  z.object({ ...base, type: z.literal("party.claim"), itemId: z.string() }),
  z.object({ ...base, type: z.literal("party.toggle"), itemId: z.string() }),
  z.object({
    ...base,
    type: z.literal("party.add"),
    name: z.string().trim().min(1).max(60),
  }),
  z.object({ ...base, type: z.literal("morning.checkin") }),
  z.object({
    ...base,
    type: z.literal("boba.order"),
    drinkId: z.enum(["classic", "matcha", "taro"]),
    sugar: z.enum(["0%", "50%", "100%"]),
    ice: z.enum(["No ice", "Less ice", "Regular"]),
  }),
  z.object({ ...base, type: z.literal("demo.reset") }),
]);
export type Command = z.infer<typeof commandSchema>;
export const serverEventSchema = z.discriminatedUnion("type", [
  z.object({
    version: z.literal(1),
    type: z.literal("snapshot"),
    data: snapshotSchema,
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("error"),
    message: z.string(),
  }),
]);

// Internal builder contract; this is not a Lovable API request body.
export type AppSpec = {
  requestId: string;
  groupId: string;
  kind: RoomId;
  title: string;
  participants: { id: string; name: string }[];
  initialData: Record<string, unknown>;
  rules: Record<string, unknown>;
  dataApiBaseUrl: string;
};
