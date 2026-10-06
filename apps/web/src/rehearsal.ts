import type { Build, ChatMessage, ClientEvent, Scenario, ServerEvent } from "@group-dots/protocol";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const user = element<HTMLSelectElement>("user");
const input = element<HTMLInputElement>("text");
const messages = element("messages");
const status = element("status");
const error = element("error");
const sendButton = element<HTMLButtonElement>("send");
const resetButton = element<HTMLButtonElement>("reset");
const builds = new Map<string, Build>();
const displayed = new Set<string>();
let activeScenario: Scenario = "party";
let roomId = "prompt-rehearsal-party";
let socket: WebSocket;
let joined = false;
let busy = false;
let selectedUser = user.value;
const seedingRooms = new Set<string>();
const drafts = new Map<Scenario, Line>();
const astraTag = /(^|[\s([{])@lines(?=$|[\s.,!?;:)\]}])/i;

type Line = { user: string; text: string };
const scenes: Record<Scenario, { title: string; goal: string; opening: Line[]; lines: Line[] }> = {
  party: {
    title: "Weekend party",
    goal: "Ask for help → Lines clarifies → agree → open the shared supplies list.",
    opening: [
      { user: "maya", text: "Party at mine this weekend?" },
      { user: "leo", text: "I'm in. Who's bringing what?" },
    ],
    lines: [
      { user: "ao", text: "@Lines help us organise the party?" },
      { user: "maya", text: "@Lines yes, make it." },
    ],
  },
  wakeup: {
    title: "Morning challenge",
    goal: "Request the leaderboard → open the app → tap “I'm up”.",
    opening: [
      { user: "ao", text: "Snoozed my alarm again." },
      { user: "maya", text: "We need some competition." },
    ],
    lines: [
      { user: "leo", text: "@Lines build us a morning check-in leaderboard." },
    ],
  },
  boba: {
    title: "Boba run",
    goal: "Request the shared order list → pick a drink → show the group summary.",
    opening: [
      { user: "leo", text: "Boba run?" },
      { user: "ao", text: "Yes! Everyone's order gets lost here." },
    ],
    lines: [
      { user: "maya", text: "@Lines make us a shared boba order list." },
    ],
  },
};

function scene(scenario: Scenario) {
  element("group-name").textContent = scenes[scenario].title;
  element("scene").textContent = scenes[scenario].goal;
  document.querySelectorAll<HTMLButtonElement>("[data-scenario]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scenario === scenario));
  });
  element("lines").replaceChildren(...scenes[scenario].lines.map((line, index) => {
    const button = document.createElement("button");
    button.className = "line";
    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${line.user[0].toUpperCase()}${line.user.slice(1)}`;
    button.append(title, line.text);
    button.onclick = () => { fillDraft(line); input.focus(); };
    return button;
  }));
}

function fillDraft(line: Line) {
  user.value = line.user;
  input.value = line.text;
}
function switchChat(scenario: Scenario) {
  if (scenario === activeScenario) return;
  drafts.set(activeScenario, { user: user.value, text: input.value });
  activeScenario = scenario;
  roomId = `prompt-rehearsal-${scenario}`;
  joined = false; busy = false;
  error.textContent = ""; status.textContent = "Opening chat…";
  displayed.clear(); messages.replaceChildren(); builds.clear(); renderBuilds();
  scene(scenario);
  fillDraft(drafts.get(scenario) ?? scenes[scenario].lines[0]);
  controls(); join();
}

function send(event: ClientEvent) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
}
function join() {
  selectedUser = user.value;
  send({ type: "room.join", roomId, user: { id: user.value, name: user.selectedOptions[0].text } });
}
function controls() {
  sendButton.disabled = !joined || busy;
  resetButton.disabled = !joined || busy;
}
function seedOpening(snapshot: Extract<ServerEvent, { type: "room.snapshot" }>) {
  const opening = scenes[activeScenario].opening;
  const id = (index: number) => `recording-opening-${activeScenario}-${index}`;
  const existing = new Set(snapshot.messages.map((message) => message.id));
  if (opening.every((_, index) => existing.has(id(index)))) {
    seedingRooms.delete(roomId);
    return;
  }
  if (seedingRooms.has(roomId)) return;
  seedingRooms.add(roomId);
  joined = false;
  opening.forEach((line, index) => {
    if (existing.has(id(index))) return;
    send({ type: "room.join", roomId, user: { id: line.user, name: line.user[0].toUpperCase() + line.user.slice(1) } });
    send({ type: "chat.send", id: id(index), text: line.text });
  });
  join();
}
function emptyState() {
  if (displayed.size) return;
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "Loading the opening messages…";
  messages.replaceChildren(empty);
}
function renderMessage(message: ChatMessage) {
  if (displayed.has(message.id)) return;
  if (!displayed.size) messages.replaceChildren();
  displayed.add(message.id);
  const bubble = document.createElement("div");
  bubble.className = `message ${message.role}`;
  const name = document.createElement("strong");
  name.textContent = message.user.name;
  const text = document.createElement("p");
  text.textContent = message.text;
  bubble.append(name, text);
  messages.append(bubble);
  messages.scrollTop = messages.scrollHeight;
}
function renderBuilds() {
  element("builds").replaceChildren(...[...builds.values()].map((build) => {
    const link = build.url && /^https?:\/\//.test(build.url);
    const card = document.createElement(link ? "a" : "div");
    card.className = "build";
    card.textContent = `${build.scenario} · ${build.mocked ? "rehearsal" : "Lovable"} · ${build.status}${build.error ? `: ${build.error}` : ""}${link ? " — open demo ↗" : ""}`;
    if (card instanceof HTMLAnchorElement) {
      card.href = build.url!; card.target = "_blank"; card.rel = "noopener noreferrer";
    }
    return card;
  }));
}
function connect() {
  socket = new WebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:3001/ws");
  socket.onopen = join;
  socket.onmessage = ({ data }) => {
    const event: ServerEvent = JSON.parse(data);
    if ("roomId" in event && event.roomId !== roomId) return;
    switch (event.type) {
      case "room.snapshot":
        joined = true;
        // Rejoining a chat may happen after its thinking event was sent.
        busy = event.messages.some((message) => message.role === "user" && astraTag.test(message.text)
          && !event.messages.some((reply) => reply.replyTo === message.id));
        status.textContent = busy ? "Lines is thinking…" : "Connected · tag @Lines to get a reply";
        element("mode").textContent = event.lovableMode === "mock"
          ? `Agent: ${event.agentMode}. Builds use fixed demo links or local receipts; no new Lovable projects.`
          : `Agent: ${event.agentMode}. Live Lovable builds are enabled and create real projects.`;
        displayed.clear(); messages.replaceChildren(); event.messages.forEach(renderMessage); emptyState();
        builds.clear(); event.builds.forEach((build) => builds.set(build.id, build)); renderBuilds();
        seedOpening(event);
        if (seedingRooms.has(roomId)) joined = false;
        controls(); break;
      case "chat.message": renderMessage(event.message); break;
      case "agent.status":
        busy = event.status === "thinking";
        status.textContent = busy ? "Lines is thinking…" : "Connected · tag @Lines to get a reply";
        controls(); break;
      case "site.building": case "site.ready": case "site.failed":
        builds.set(event.build.id, event.build); renderBuilds(); break;
      case "error": error.textContent = event.message; break;
    }
  };
  socket.onclose = () => {
    joined = false; busy = false; seedingRooms.clear(); controls();
    status.textContent = "Reconnecting…"; setTimeout(connect, 1000);
  };
}
element("chat").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!joined || busy || !input.value.trim()) return;
  if (selectedUser !== user.value) join();
  error.textContent = "";
  const text = input.value.trim();
  const index = scenes[activeScenario].lines.findIndex((line) => line.user === user.value && line.text === text);
  send({ type: "chat.send", id: crypto.randomUUID(), text });
  if (astraTag.test(text)) { busy = true; controls(); }
  const next = index < 0 ? undefined : scenes[activeScenario].lines[index + 1];
  if (next) fillDraft(next); else input.value = "";
  input.focus();
});
resetButton.onclick = () => {
  error.textContent = "";
  fillDraft(scenes[activeScenario].lines[0]);
  send({ type: "room.reset" });
};
document.querySelectorAll<HTMLButtonElement>("[data-scenario]").forEach((button) => {
  button.onclick = () => switchChat(button.dataset.scenario as Scenario);
});
scene(activeScenario); fillDraft(scenes[activeScenario].lines[0]); emptyState(); connect();
