import { createSocketTransport } from "./socket-transport";
import {
  commandSchema,
  snapshotSchema,
} from "../../shared/protocol";
import type { Command, Snapshot, RoomId } from "../../shared/protocol";
import { seedSnapshot } from "./data";
import { readSavedSnapshot } from "./persistence";
import { reduceDemo, finishDemoBuild } from "./demo";
import {
  agentTask,
  mentionedAgentIds,
  shouldWakeAgent,
} from "../../shared/mentions";

export type Connection = "demo" | "connecting" | "connected" | "disconnected";
export type StoreState = {
  snapshot: Snapshot;
  connection: Connection;
  error: string | null;
  modes?: { agent: "mock" | "astra"; lovable: "mock" | "mcp" };
};
export interface AgentTransport {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => StoreState;
  send: (command: Command) => void;
  clearError: () => void;
  select?: (room: RoomId, actor: import("../../shared/protocol").MemberId) => void;
  dispose?: () => void;
}

const KEY = "lines-group-demo-v1";
function persistedSeed(): Snapshot {
  try {
    const saved = readSavedSnapshot(localStorage.getItem(KEY));
    if (saved) return saved;
    const legacy = readSavedSnapshot(
      localStorage.getItem("astra-group-demo-v1"),
      true,
    );
    if (legacy) {
      localStorage.setItem(KEY, JSON.stringify(legacy));
      return legacy;
    }
  } catch {
    /* Private browsing can disable storage. */
  }
  return seedSnapshot();
}

export function createTransport(url?: string): AgentTransport {
  if (url) return createSocketTransport(url);
  let state: StoreState = {
    snapshot: url ? seedSnapshot() : persistedSeed(),
    connection: url ? "connecting" : "demo",
    error: null,
  };
  const listeners = new Set<() => void>();
  const timers = new Map<RoomId, ReturnType<typeof setTimeout>>();

  function publish(update: Partial<StoreState>, persist = false) {
    state = { ...state, ...update };
    if (persist)
      try {
        localStorage.setItem(KEY, JSON.stringify(state.snapshot));
      } catch {
        /* UI remains usable in memory. */
      }
    for (const listener of listeners) listener();
  }
  if (!url) {
    window.addEventListener("storage", (event) => {
      if (event.key !== KEY || !event.newValue) return;
      try {
        const data = snapshotSchema.parse(JSON.parse(event.newValue));
        publish({ snapshot: data });
      } catch {
        /* Ignore unrelated or incompatible storage changes. */
      }
    });
  }
  return {
    getSnapshot: () => state,
    subscribe: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    clearError: () => publish({ error: null }),
    send: (input) => {
      const parsed = commandSchema.safeParse(input);
      if (!parsed.success) {
        publish({ error: "Please check your input and try again." });
        return;
      }
      const command =
        parsed.data.type === "message.send"
          ? { ...parsed.data, mentions: mentionedAgentIds(parsed.data.text) }
          : parsed.data;
      if (command.type === "demo.reset") {
        clearTimeout(timers.get(command.roomId));
        timers.delete(command.roomId);
      }
      publish({ snapshot: reduceDemo(state.snapshot, command) }, true);
      const shouldBuild =
        command.type === "message.send" &&
        shouldWakeAgent(command) &&
        !!agentTask(command.text);
      if (shouldBuild && !timers.has(command.roomId)) {
        timers.set(
          command.roomId,
          setTimeout(() => {
            publish(
              { snapshot: finishDemoBuild(state.snapshot, command.roomId) },
              true,
            );
            timers.delete(command.roomId);
          }, 1500),
        );
      }
    },
  };
}
