import type { Build, ChatMessage, ClientEvent, ServerEvent } from "@group-dots/protocol";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = element("status");
const messages = element("messages");
const builds = element("builds");
const errors = element("error");
const events = element("events");
const user = element<HTMLSelectElement>("user");
const input = element<HTMLInputElement>("text");
const displayed = new Set<string>();
const buildState = new Map<string, Build>();
let socket: WebSocket;
let joined = false;
let mode = "mock";

function send(event: ClientEvent) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
}
function join() {
  joined = false;
  send({ type: "room.join", roomId: "demo", user: { id: user.value, name: user.selectedOptions[0].text } });
}
function renderMessage(message: ChatMessage) {
  if (displayed.has(message.id)) return;
  displayed.add(message.id);
  const line = document.createElement("div");
  line.className = `message ${message.role}`;
  line.textContent = `${message.user.name}: ${message.text}`;
  messages.append(line);
  messages.scrollTop = messages.scrollHeight;
}
function renderBuilds() {
  builds.replaceChildren();
  for (const build of buildState.values()) {
    const card = document.createElement(build.url ? "a" : "p");
    card.textContent = `${build.mocked ? "Mock · " : ""}${build.scenario}: ${build.status}${build.error ? ` — ${build.error}` : ""}`;
    if (card instanceof HTMLAnchorElement && build.url && /^https?:\/\//.test(build.url)) {
      card.href = build.url; card.target = "_blank"; card.rel = "noopener noreferrer";
    }
    builds.append(card);
  }
}
function connect() {
  socket = new WebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:3001/ws");
  socket.onopen = join;
  socket.onmessage = ({ data }) => {
    const event: ServerEvent = JSON.parse(data);
    events.textContent = `${JSON.stringify(event, null, 2)}\n${events.textContent}`.slice(0, 30000);
    switch (event.type) {
      case "room.snapshot":
        joined = true; mode = event.agentMode;
        status.textContent = `Connected · agent: ${event.agentMode} · Lovable: ${event.lovableMode}`;
        document.querySelectorAll("button").forEach((button) => button.disabled = false);
        messages.replaceChildren(); displayed.clear();
        event.messages.forEach(renderMessage);
        buildState.clear(); event.builds.forEach((build) => buildState.set(build.id, build)); renderBuilds();
        break;
      case "chat.message": renderMessage(event.message); break;
      case "agent.status": status.textContent = event.status === "thinking" ? "Astra is thinking…" : `Connected · agent: ${mode}`; break;
      case "site.building": case "site.ready": case "site.failed":
        buildState.set(event.build.id, event.build); renderBuilds(); break;
      case "error": errors.textContent = `${event.code}: ${event.message}`; break;
    }
  };
  socket.onclose = () => {
    joined = false; status.textContent = "Disconnected. Reconnecting…";
    document.querySelectorAll("button").forEach((button) => button.disabled = true);
    setTimeout(connect, 1000);
  };
}
function chat(text: string) {
  if (!joined) return;
  errors.textContent = "";
  send({ type: "chat.send", id: crypto.randomUUID(), text });
}
element("chat").addEventListener("submit", (event) => {
  event.preventDefault(); if (input.value.trim()) { chat(input.value); input.value = ""; }
});
user.onchange = join;
element("reset").onclick = () => { errors.textContent = ""; send({ type: "room.reset" }); };
document.querySelectorAll<HTMLButtonElement>("[data-scenario]").forEach((button) => {
  button.onclick = () => chat(mode === "mock" ? `@Astra /build ${button.dataset.scenario}` : `@Astra everyone is ready. Please build our ${button.dataset.scenario} app now.`);
});
connect();
