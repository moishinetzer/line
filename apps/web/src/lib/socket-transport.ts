import { ServerEventSchema, type Build, type ChatMessage, type ClientEvent, type Scenario } from "@group-dots/protocol";
import type { AgentTransport, StoreState } from "./transport";
import type { MemberId, Message, Room, RoomId } from "../../shared/protocol";
import { members, seedSnapshot } from "./data";

export const scenarioForRoom: Record<RoomId, Scenario> = { party: "party", morning: "wakeup", boba: "boba" };
export const toMessage = (message: ChatMessage): Message => ({
  id: message.id, author: message.role === "assistant" ? "lines" : message.user.id,
  authorName: message.role === "assistant" ? "Lines" : message.user.name,
  text: message.text, at: message.createdAt,
});
export function applyBuild(room: Room, build: Build): Room {
  if (scenarioForRoom[room.id] !== build.scenario) return room;
  const cardId = `build-${build.id}`;
  const messages = room.messages.filter((message) => message.id !== cardId);
  if (build.status === "ready" && build.url) messages.push({
    id: cardId, author: "lines", text: build.mocked ? "Your prebuilt demo is ready to open." : "Here’s your group’s app.",
    at: room.messages.find((message) => message.id === cardId)?.at ?? new Date().toISOString(), appCard: true,
  });
  return { ...room, messages, appStatus: build.status, appUrl: build.url, editorUrl: build.editorUrl, error: build.error, buildId: build.id };
}

export function createSocketTransport(url: string): AgentTransport {
  const snapshot = seedSnapshot();
  for (const room of Object.values(snapshot.rooms)) Object.assign(room, {
    messages: [], items: [], checkins: [], orders: [], appStatus: "idle",
  });
  let state: StoreState = { snapshot, connection: "connecting", error: null };
  const listeners = new Set<() => void>();
  const sockets = new Map<RoomId, WebSocket>();
  const joined = new Set<RoomId>();
  const identities = new Map<RoomId, MemberId>();
  let activeRoom: RoomId = "party";
  let actor: MemberId = "ao";
  let disposed = false;
  const retries = new Map<RoomId, ReturnType<typeof setTimeout>>();
  const publish = (patch: Partial<StoreState> = {}) => {
    state = { ...state, ...patch, connection: joined.has(activeRoom) ? "connected" : "connecting" };
    for (const listener of listeners) listener();
  };
  const updateRoom = (id: RoomId, room: Room) => publish({ snapshot: { rooms: { ...state.snapshot.rooms, [id]: room } } });
  const emit = (socket: WebSocket, event: ClientEvent) => socket.send(JSON.stringify(event));
  const join = (id: RoomId, member: MemberId) => {
    const socket = sockets.get(id);
    identities.set(id, member);
    if (socket?.readyState === WebSocket.OPEN) emit(socket, { type: "room.join", roomId: id, user: members.find((user) => user.id === member)! });
  };
  function connect(id: RoomId) {
    if (disposed) return;
    let socket: WebSocket;
    try { socket = new WebSocket(url); }
    catch { publish({ error: "Invalid VITE_WS_URL. Use a ws:// or wss:// address." }); return; }
    sockets.set(id, socket);
    socket.onopen = () => join(id, identities.get(id) ?? actor);
    socket.onmessage = ({ data }) => {
      try {
        const event = ServerEventSchema.parse(JSON.parse(data));
        if (event.type === "error") { publish({ error: event.message }); return; }
        if (event.roomId !== id) return;
        let room = state.snapshot.rooms[id];
        if (event.type === "room.snapshot") {
          room = { ...room, messages: event.messages.map(toMessage), appStatus: "idle", appUrl: undefined, editorUrl: undefined, buildId: undefined, error: undefined, thinking: false };
          for (const build of event.builds) room = applyBuild(room, build);
          joined.add(id);
          publish({ error: null, modes: { agent: event.agentMode, lovable: event.lovableMode } });
        } else if (event.type === "chat.message") {
          if (!room.messages.some((message) => message.id === event.message.id)) room = { ...room, messages: [...room.messages, toMessage(event.message)] };
        } else if (event.type === "agent.status") room = { ...room, thinking: event.status === "thinking" };
        else if ("build" in event) room = applyBuild(room, event.build);
        updateRoom(id, room);
      } catch { publish({ error: "The backend sent an incompatible event. Check @group-dots/protocol." }); }
    };
    socket.onerror = () => publish({ error: "Cannot reach Lines. Start npm run dev:server. Reconnecting…" });
    socket.onclose = () => {
      joined.delete(id);
      publish();
      if (!disposed) retries.set(id, setTimeout(() => connect(id), 2000));
    };
  }
  for (const id of Object.keys(snapshot.rooms) as RoomId[]) connect(id);
  return {
    getSnapshot: () => state,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    clearError: () => publish({ error: null }),
    select: (id, member) => { activeRoom = id; actor = member; if (identities.get(id) !== member) join(id, member); publish(); },
    dispose: () => { disposed = true; for (const timer of retries.values()) clearTimeout(timer); for (const socket of sockets.values()) socket.close(); },
    send: (command) => {
      const socket = sockets.get(command.roomId);
      if (!socket || socket.readyState !== WebSocket.OPEN || !joined.has(command.roomId)) { publish({ error: "Wait for the agent to connect before sending." }); return; }
      if (identities.get(command.roomId) !== command.actor) join(command.roomId, command.actor);
      if (command.type === "message.send") emit(socket, { type: "chat.send", id: crypto.randomUUID(), text: command.text });
      else if (command.type === "demo.reset") emit(socket, { type: "room.reset" });
      else if (command.type === "build.check") emit(socket, { type: "build.check", buildId: command.buildId });
      else publish({ error: "Use the generated app to change its data. Chat and app state are separate." });
    },
  };
}
