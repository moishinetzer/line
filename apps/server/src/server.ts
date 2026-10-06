import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { WebSocket, WebSocketServer } from "ws";
import { ClientEventSchema, type Build, type ChatMessage, type Scenario, type ServerEvent, type User } from "@group-dots/protocol";
import { Agent, agentLayer, type BuildResult, toError } from "./agent.ts";
import type { Config } from "./config.ts";
import { LovableConnection, SiteBuilder, siteBuilderLayer } from "./lovable.ts";
import { readPrompt } from "./prompts.ts";

type Room = {
  id: string;
  messages: ChatMessage[];
  context: ChatMessage[];
  builds: Map<Scenario, Build>;
  users: Map<string, User>;
  seen: Set<string>;
  queue: Promise<void>;
  pending: number;
};
type Membership = { room: Room; user: User };
const astra: User = { id: "astra", name: "Astra" };

export async function startServer(config: Config) {
  const lovable = new LovableConnection(config);
  const runtime = ManagedRuntime.make(Layer.mergeAll(agentLayer(config), siteBuilderLayer(config, lovable)));
  const rooms = new Map<string, Room>();
  const memberships = new Map<WebSocket, Membership>();
  const send = (socket: WebSocket, event: ServerEvent) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  };
  const broadcast = (room: Room, event: ServerEvent) => {
    for (const [socket, membership] of memberships) if (membership.room === room) send(socket, event);
  };
  const snapshot = (room: Room): ServerEvent => ({
    type: "room.snapshot", roomId: room.id, messages: room.messages,
    builds: [...room.builds.values()], participants: [...room.users.values()],
    agentMode: config.agentMode, lovableMode: config.lovableMode,
  });
  const addMessage = (room: Room, message: ChatMessage) => {
    room.messages.push(message);
    broadcast(room, { type: "chat.message", roomId: room.id, message });
  };

  async function buildSite(room: Room, requestId: string, scenario: Scenario): Promise<BuildResult> {
    const existing = room.builds.get(scenario);
    if (existing?.status === "ready" && existing.url) return { url: existing.url, projectId: existing.projectId, mocked: existing.mocked };
    if (existing?.status === "building") throw new Error("This site is already building");
    const build: Build = { id: randomUUID(), scenario, status: "building", mocked: config.lovableMode === "mock" };
    room.builds.set(scenario, build);
    broadcast(room, { type: "site.building", roomId: room.id, requestId, build });
    try {
      const prompt = await readPrompt(scenario);
      const result = await runtime.runPromise(Effect.flatMap(SiteBuilder, (builder) => builder.build(scenario, prompt)));
      Object.assign(build, result, { status: "ready" });
      broadcast(room, { type: "site.ready", roomId: room.id, requestId, build });
      return result;
    } catch (error) {
      build.status = "failed";
      build.error = toError(error).message;
      broadcast(room, { type: "site.failed", roomId: room.id, requestId, build });
      throw error;
    }
  }

  async function respond(room: Room, message: ChatMessage) {
    broadcast(room, { type: "agent.status", roomId: room.id, requestId: message.id, status: "thinking" });
    room.context.push(message);
    try {
      const text = await runtime.runPromise(Effect.flatMap(Agent, (agent) => agent.respond({
        messages: [...room.context],
        buildSite: (scenario) => buildSite(room, message.id, scenario),
      })));
      const reply: ChatMessage = { id: randomUUID(), roomId: room.id, role: "assistant", user: astra, text, replyTo: message.id, createdAt: new Date().toISOString() };
      room.context.push(reply);
      addMessage(room, reply);
    } catch (error) {
      broadcast(room, { type: "error", code: "AGENT_FAILED", message: toError(error).message, requestId: message.id });
      const reply: ChatMessage = { id: randomUUID(), roomId: room.id, role: "assistant", user: astra, text: "I couldn't complete that request. Check the error and send a new message to retry.", replyTo: message.id, createdAt: new Date().toISOString() };
      room.context.push(reply);
      addMessage(room, reply);
    } finally {
      room.pending--;
      broadcast(room, { type: "agent.status", roomId: room.id, requestId: message.id, status: "idle" });
    }
  }

  const http = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", `http://localhost:${config.port}`);
      if (request.method !== "GET") return json(response, 405, { error: "Method not allowed" });
      if (url.pathname === "/health") return json(response, 200, { ok: true, agentMode: config.agentMode, lovableMode: config.lovableMode, model: config.model });
      if (url.pathname === "/auth/lovable") {
        const redirect = await lovable.auth.login();
        if (redirect) { response.writeHead(302, { location: redirect }); response.end(); return; }
        return json(response, 200, { ok: true, message: "Lovable is authenticated" });
      }
      if (url.pathname === "/auth/lovable/callback") {
        await lovable.auth.callback(url.searchParams.get("code") ?? "", url.searchParams.get("state") ?? "");
        await lovable.close();
        return json(response, 200, { ok: true, message: "Lovable connected. Return to the chat and build a site." });
      }
      if (url.pathname === "/lovable/tools") {
        const client = await lovable.connect();
        const tools = await client.listTools();
        return json(response, 200, { tools: tools.tools.map(({ name }) => name) });
      }
      const demo = url.pathname.match(/^\/demo\/(party|wakeup|boba)$/);
      if (demo) {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Mock build receipt</title></head><body style="font:18px system-ui;max-width:650px;margin:80px auto;padding:24px"><h1>Mock build: ${demo[1]}</h1><p>The chat → agent → build → link flow worked.</p><p>This is a build receipt, not a generated mini-app. Set LOVABLE_MODE=mcp to generate a real site, or configure DEMO_${demo[1].toUpperCase()}_URL with a prebuilt demo.</p><a href="http://localhost:5173">Back to chat</a></body></html>`);
        return;
      }
      return json(response, url.pathname === "/" ? 200 : 404, { service: "group-dots", websocket: "/ws", health: "/health", lovableLogin: "/auth/lovable" });
    })().catch((error) => json(response, 500, { error: toError(error).message }));
  });

  const sockets = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  http.on("upgrade", (request, socket, head) => {
    try {
      const origin = request.headers.origin ? new URL(request.headers.origin) : undefined;
      if (request.url !== "/ws" || (origin && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) {
        socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return;
      }
      sockets.handleUpgrade(request, socket, head, (ws) => sockets.emit("connection", ws, request));
    } catch { socket.destroy(); }
  });

  sockets.on("connection", (socket) => {
    socket.on("error", () => socket.close());
    socket.on("close", () => memberships.delete(socket));
    socket.on("message", (raw) => {
      let parsed;
      try { parsed = ClientEventSchema.safeParse(JSON.parse(raw.toString())); }
      catch { send(socket, { type: "error", code: "INVALID_MESSAGE", message: "Send a valid JSON event" }); return; }
      if (!parsed.success) { send(socket, { type: "error", code: "INVALID_MESSAGE", message: parsed.error.message }); return; }
      const event = parsed.data;
      if (event.type === "room.join") {
        let room = rooms.get(event.roomId);
        if (!room) {
          room = { id: event.roomId, messages: [], context: [], builds: new Map(), users: new Map(), seen: new Set(), queue: Promise.resolve(), pending: 0 };
          rooms.set(event.roomId, room);
        }
        room.users.set(event.user.id, event.user);
        memberships.set(socket, { room, user: event.user });
        send(socket, snapshot(room));
        broadcast(room, { type: "room.participants", roomId: room.id, participants: [...room.users.values()] });
        return;
      }
      const membership = memberships.get(socket);
      if (!membership) { send(socket, { type: "error", code: "JOIN_REQUIRED", message: "Send room.join before chatting" }); return; }
      const { room, user } = membership;
      if (event.type === "room.reset") {
        if (room.pending) { send(socket, { type: "error", code: "ROOM_BUSY", message: "Wait for the current turns/builds before resetting" }); return; }
        room.messages = []; room.context = []; room.builds.clear(); room.seen.clear();
        broadcast(room, snapshot(room)); return;
      }
      if (room.seen.has(event.id)) return;
      if (room.pending >= 20) { send(socket, { type: "error", code: "ROOM_BUSY", requestId: event.id, message: "Too many queued turns; wait and retry" }); return; }
      room.seen.add(event.id);
      const message: ChatMessage = { id: event.id, roomId: room.id, user, role: "user", text: event.text, createdAt: new Date().toISOString() };
      addMessage(room, message);
      room.pending++;
      room.queue = room.queue.then(() => respond(room, message));
    });
  });

  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(config.port, config.host, () => { http.off("error", reject); resolve(); });
  });
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("Server did not bind a TCP port");
  config.port = address.port;
  return {
    port: address.port,
    close: async () => {
      for (const socket of sockets.clients) socket.terminate();
      await new Promise<void>((resolve) => sockets.close(() => resolve()));
      await new Promise<void>((resolve, reject) => http.close((error) => error ? reject(error) : resolve()));
      await runtime.dispose();
      await lovable.close();
    },
  };
}

function json(response: ServerResponse, status: number, data: unknown) {
  if (response.headersSent) return;
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(data));
}
