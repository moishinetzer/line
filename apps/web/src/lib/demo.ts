import type {
  Command,
  Snapshot,
  RoomId,
  MemberId,
} from "../../shared/protocol";
import { seedSnapshot, memberName, drinks } from "./data";
import {
  agentTask,
  mentionedAgentIds,
  shouldWakeAgent,
} from "../../shared/mentions";

export function londonDay(now: Date): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}-${p.find((x) => x.type === "day")!.value}`;
}
export function londonMinutes(now: Date): number {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return (
    Number(p.find((x) => x.type === "hour")!.value) * 60 +
    Number(p.find((x) => x.type === "minute")!.value) +
    Number(p.find((x) => x.type === "second")!.value) / 60 + now.getMilliseconds() / 60_000
  );
}
export function sevenDayWindow(now: Date): Set<string> {
  const today = londonDay(now);
  return new Set(Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - offset);
    return day.toISOString().slice(0, 10);
  }));
}

function addMessage(
  state: Snapshot,
  roomId: RoomId,
  author: MemberId | "lines",
  text: string,
  now: Date,
  appCard = false,
) {
  state.rooms[roomId].messages.push({
    id: crypto.randomUUID(),
    author,
    text,
    at: now.toISOString(),
    appCard,
    mentions: author === "lines" ? [] : mentionedAgentIds(text),
  });
}

// Deterministic domain transitions. Only the demo adapter runs these locally.
// Production must validate identity, permissions and timestamps on the server.
export function reduceDemo(
  previous: Snapshot,
  command: Command,
  now = new Date(),
): Snapshot {
  const state = structuredClone(previous);
  const room = state.rooms[command.roomId];
  const name = memberName(command.actor);
  switch (command.type) {
    case "demo.reset":
      state.rooms[command.roomId] = seedSnapshot().rooms[command.roomId];
      break;
    case "message.send":
      addMessage(state, command.roomId, command.actor, command.text, now);
      if (shouldWakeAgent(command)) {
        if (!agentTask(command.text)) {
          addMessage(
            state,
            room.id,
            "lines",
            `I’m here, ${name}. What would you like me to do for the group?`,
            now,
          );
        } else if (room.appStatus !== "building") {
          room.appStatus = "building";
          room.error = undefined;
          addMessage(
            state,
            room.id,
            "lines",
            `On it, ${name}. I’ll put the group’s ${room.id === "party" ? "party checklist" : room.id === "morning" ? "morning board" : "order sheet"} together.`,
            now,
          );
        }
      }
      break;
    case "party.claim": {
      if (room.id !== "party") return previous;
      const item = room.items.find((i) => i.id === command.itemId);
      if (!item || item.done || (item.owner && item.owner !== command.actor))
        return previous;
      const releasing = item.owner === command.actor;
      item.owner = releasing ? null : command.actor;
      addMessage(
        state,
        room.id,
        "lines",
        releasing
          ? `${name} has released “${item.name}”. It’s available to pick up.`
          : `${name} is bringing “${item.name}”. One less thing to think about.`,
        now,
      );
      break;
    }
    case "party.toggle": {
      if (room.id !== "party") return previous;
      const item = room.items.find((i) => i.id === command.itemId);
      if (!item || item.owner !== command.actor) return previous;
      item.done = !item.done;
      addMessage(
        state,
        room.id,
        "lines",
        item.done
          ? `${name} has picked up “${item.name}”. Saturday is coming together!`
          : `“${item.name}” is back on ${name}’s to-do list.`,
        now,
      );
      break;
    }
    case "party.add":
      if (room.id !== "party") return previous;
      room.items.push({
        id: crypto.randomUUID(),
        name: command.name,
        note: `Added by ${name}`,
        emoji: "🛍️",
        owner: null,
        done: false,
      });
      addMessage(
        state,
        room.id,
        "lines",
        `${name} added “${command.name}” to the list. Any takers?`,
        now,
      );
      break;
    case "morning.checkin": {
      if (room.id !== "morning") return previous;
      const date = londonDay(now);
      if (
        room.checkins.some((c) => c.member === command.actor && c.date === date)
      )
        return previous;
      const onTime = londonMinutes(now) <= 7 * 60 + 30;
      room.checkins.push({
        member: command.actor,
        date,
        at: now.toISOString(),
        onTime,
      });
      addMessage(
        state,
        room.id,
        "lines",
        onTime
          ? `Good morning, ${name}! That’s a point for showing up ☀️`
          : `${name} checked in. Past today’s 7:30am cutoff, but a fresh start awaits tomorrow ☀️`,
        now,
      );
      break;
    }
    case "boba.order": {
      if (room.id !== "boba") return previous;
      room.orders = room.orders.filter((o) => o.member !== command.actor);
      room.orders.push({
        member: command.actor,
        drinkId: command.drinkId,
        sugar: command.sugar,
        ice: command.ice,
      });
      const drink = drinks.find((d) => d.id === command.drinkId)!;
      addMessage(
        state,
        room.id,
        "lines",
        `${name}: ${drink.name}, ${command.sugar} sugar, ${command.ice.toLowerCase()}. ${room.orders.length} of 4 orders are in.`,
        now,
      );
      break;
    }
  }
  return state;
}

export function finishDemoBuild(previous: Snapshot, roomId: RoomId): Snapshot {
  const state = structuredClone(previous);
  state.rooms[roomId].appStatus = "ready";
  addMessage(
    state,
    roomId,
    "lines",
    "Your demo app is ready. Open it here and try it together.",
    new Date(),
    true,
  );
  return state;
}
