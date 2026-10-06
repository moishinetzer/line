import { snapshotSchema, type Snapshot } from "../../shared/protocol";

// Only the previous local demo format is migrated. Network events must use Lines.
export function readSavedSnapshot(
  saved: string | null,
  legacy = false,
): Snapshot | null {
  if (!saved) return null;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (legacy && parsed && typeof parsed === "object" && "rooms" in parsed) {
      const rooms = (
        parsed as { rooms: Record<string, { messages?: unknown[] }> }
      ).rooms;
      for (const room of Object.values(rooms)) {
        for (const value of room.messages ?? []) {
          if (!value || typeof value !== "object") continue;
          const message = value as {
            author?: string;
            text?: string;
            mentions?: string[];
          };
          if (message.author === "astra") message.author = "lines";
          if (typeof message.text === "string")
            message.text = message.text.replace(/\bAstra\b/gi, "Lines");
          if (Array.isArray(message.mentions))
            message.mentions = message.mentions.map((id) =>
              id === "astra" ? "lines" : id,
            );
        }
      }
    }
    const result = snapshotSchema.safeParse(parsed);
    if (!result.success) return null;
    for (const room of Object.values(result.data.rooms)) {
      if (room.messages.some((message) => !["ao", "maya", "leo", "nina", "lines"].includes(message.author))) return null;
      if (room.appStatus === "building") room.appStatus = "ready";
    }
    return result.data;
  } catch {
    return null;
  }
}
