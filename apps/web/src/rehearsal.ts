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
const roomId = "prompt-rehearsal";
let socket: WebSocket;
let joined = false;
let busy = false;
let selectedUser = user.value;

type Line = { user: string; text: string };
const scenes: Record<Scenario, { goal: string; lines: Line[] }> = {
  party: {
    goal: "Help → shared supplies list → friends claim items in the app.",
    lines: [
      { user: "sam", text: "Birthday party at mine this weekend?" },
      { user: "jo", text: "I'm in! We need to work out who's bringing what." },
      { user: "alex", text: "@Astra can you help us organise the party?" },
      { user: "sam", text: "@Astra yes, let everyone claim things themselves." },
    ],
  },
  wakeup: {
    goal: "Help → daily check-in with a leaderboard → friendly competition.",
    lines: [
      { user: "alex", text: "I snoozed my alarm five times again." },
      { user: "sam", text: "Same. We need to hold each other accountable." },
      { user: "jo", text: "@Astra help us actually get up in the mornings." },
      { user: "alex", text: "@Astra yes, a bit of competition would help." },
    ],
  },
  boba: {
    goal: "Help → shared demo menu → one list of everyone's drink choices.",
    lines: [
      { user: "jo", text: "Boba run? I'm getting something this afternoon." },
      { user: "alex", text: "Yes please. We always lose everyone's order in this chat." },
      { user: "sam", text: "@Astra can you sort out our boba order?" },
      { user: "jo", text: "@Astra yes, that's exactly what we need." },
    ],
  },
};

function scene(scenario: Scenario) {
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
    button.onclick = () => { user.value = line.user; input.value = line.text; input.focus(); };
    return button;
  }));
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
function emptyState() {
  if (displayed.size) return;
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "Start with a message between friends. Tag @Astra when you want it to join in.";
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
    switch (event.type) {
      case "room.snapshot":
        joined = true;
        status.textContent = busy ? "Astra is thinking…" : "Connected · tag @Astra to get a reply";
        element("mode").textContent = event.lovableMode === "mock"
          ? `Agent: ${event.agentMode}. Builds use fixed demo links or local receipts; no new Lovable projects.`
          : `Agent: ${event.agentMode}. Live Lovable builds are enabled and create real projects.`;
        displayed.clear(); messages.replaceChildren(); event.messages.forEach(renderMessage); emptyState();
        builds.clear(); event.builds.forEach((build) => builds.set(build.id, build)); renderBuilds();
        controls(); break;
      case "chat.message": renderMessage(event.message); break;
      case "agent.status":
        busy = event.status === "thinking";
        status.textContent = busy ? "Astra is thinking…" : "Connected · tag @Astra to get a reply";
        controls(); break;
      case "site.building": case "site.ready": case "site.failed":
        builds.set(event.build.id, event.build); renderBuilds(); break;
      case "error": error.textContent = event.message; break;
    }
  };
  socket.onclose = () => {
    joined = false; busy = false; controls();
    status.textContent = "Reconnecting…"; setTimeout(connect, 1000);
  };
}
element("chat").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!joined || busy || !input.value.trim()) return;
  if (selectedUser !== user.value) join();
  error.textContent = "";
  send({ type: "chat.send", id: crypto.randomUUID(), text: input.value.trim() });
  input.value = ""; input.focus();
});
resetButton.onclick = () => { error.textContent = ""; send({ type: "room.reset" }); };
document.querySelectorAll<HTMLButtonElement>("[data-scenario]").forEach((button) => {
  button.onclick = () => scene(button.dataset.scenario as Scenario);
});
scene("party"); emptyState(); connect();
