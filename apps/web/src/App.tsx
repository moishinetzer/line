import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  CheckCheck,
  CircleDashed,
  ExternalLink,
  Info,
  LayoutGrid,
  LoaderCircle,
  MessageCircle,
  MessageSquarePlus,
  MoreVertical,
  Radio,
  RotateCcw,
  Search,
  Settings,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";
import type { MemberId, RoomId, Message } from "../shared/protocol";
import { roomMeta, members, memberName, publishedApps } from "./lib/data";
import { createTransport } from "./lib/transport";
import { messageParts } from "../shared/mentions";
import { ChatComposer } from "./components/ChatComposer";
import {
  Avatar,
  LinesMark,
  PartyApp,
  MorningApp,
  BobaApp,
} from "./components/MiniApps";

const params = new URLSearchParams(window.location.search);
const localDemo = params.get("demo") === "1" || params.has("app") || import.meta.env.VITE_DEMO_MODE === "true";
const transport = createTransport(localDemo ? undefined : import.meta.env.VITE_WS_URL || "ws://localhost:3001/ws");
if (import.meta.hot) import.meta.hot.dispose(() => transport.dispose?.());
const roomIds: RoomId[] = ["party", "morning", "boba"];
const appParam = new URLSearchParams(window.location.search).get("app");
const appOnly = roomIds.includes(appParam as RoomId);
const initialRoom: RoomId = appOnly ? (appParam as RoomId) : "party";
const time = (at: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
const authorName = (id: Message["author"]) =>
  id === "lines" ? "Lines" : memberName(id);
type Panel = "app" | "info" | "search" | null;

export default function App() {
  const { snapshot, connection, error, modes } = useSyncExternalStore(
    transport.subscribe,
    transport.getSnapshot,
  );
  const [roomId, setRoomId] = useState<RoomId>(initialRoom);
  const [actor, setActor] = useState<MemberId>("ao");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [readRooms, setReadRooms] = useState<RoomId[]>(["party"]);
  const [panel, setPanel] = useState<Panel>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const room = snapshot.rooms[roomId];
  const meta = roomMeta[roomId];
  const isDemo = connection === "demo";
  const connected = isDemo || connection === "connected";
  const send = transport.send;

  useEffect(() => { transport.select?.(roomId, actor); }, [roomId, actor]);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [room.messages.length, roomId, room.appStatus, panel]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
  }, [modal]);
  function selectRoom(id: RoomId) {
    setRoomId(id);
    setReadRooms((ids) => [...new Set([...ids, id])]);
    setShowList(false);
    setPanel(null);
    setChatSearch("");
    setMenu(false);
  }
  function openApp() {
    setPanel("app");
    setShowList(false);
    setMenu(false);
  }
  const filtered = roomIds.filter(
    (id) =>
      roomMeta[id].name.toLowerCase().includes(query.toLowerCase()) &&
      (filter !== "Unread" || !readRooms.includes(id)) &&
      (filter !== "Favourites" || id === "party"),
  );
  const miniApp = isDemo ? (
    <div className="demo-board-content" inert={room.appStatus === "building"}>
      {roomId === "party" ? (
        <PartyApp room={room} actor={actor} send={send} />
      ) : roomId === "morning" ? (
        <MorningApp room={room} actor={actor} send={send} />
      ) : (
        <BobaApp key={actor} room={room} actor={actor} send={send} />
      )}
    </div>
  ) : (
    <div className="external-app">
      <LinesMark />
      <h2>
        {room.appStatus === "ready"
          ? "Made for your group."
          : "From a conversation to a little app."}
      </h2>
      <p>
        {room.appStatus === "building"
          ? "Lines is building your group’s app."
          : room.appStatus === "failed"
            ? room.error || "The build failed. Try again."
            : room.appStatus === "awaiting_input"
              ? "Lovable needs your approval to continue. Review the plan in the editor, then check again here."
              : room.appStatus === "checking"
                ? "Lovable is still building. Check again to refresh this project."
                : room.appStatus === "ready"
                  ? "Open the app to join in. Its data is separate from this chat."
                  : "Mention @Lines in the group to make something together."}
      </p>
      {room.appStatus === "ready" && room.appUrl && (
        <a
          className="primary-link"
          href={room.appUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open app <ExternalLink size={16} />
        </a>
      )}
      {room.editorUrl && <a className="primary-link" href={room.editorUrl} target="_blank" rel="noreferrer">Open Lovable editor <ExternalLink size={16} /></a>}
      {room.buildId && room.editorUrl && room.appStatus !== "ready" && <button disabled={room.appStatus === "building"} onClick={() => send({ type: "build.check", roomId, actor, buildId: room.buildId! })}>Check again</button>}

    </div>
  );

  return (
    <div
      className={`wa-app ${appOnly ? "app-only" : ""} ${showList ? "show-list" : ""} ${panel ? "panel-open" : ""}`}
    >
      {!appOnly && (
        <>
          <nav className="navigation-rail" aria-label="WhatsApp navigation">
            <button
              className="rail-button selected"
              aria-label="Chats"
              onClick={() => {
                setShowList(true);
                setPanel(null);
              }}
            >
              <MessageCircle size={23} />
              <span className="rail-dot" />
            </button>
            <button
              className="rail-button"
              aria-label="Status"
              onClick={() => setModal("Status")}
            >
              <CircleDashed size={24} />
            </button>
            <button
              className="rail-button"
              aria-label="Channels"
              onClick={() => setModal("Channels")}
            >
              <Radio size={24} />
            </button>
            <button
              className="rail-button"
              aria-label="Communities"
              onClick={() => {
                setShowList(true);
                setFilter("Groups");
              }}
            >
              <Users size={24} />
            </button>
            <div className="rail-bottom">
              <button
                className="rail-button"
                aria-label="Prototype settings"
                onClick={() => setModal("Settings")}
              >
                <Settings size={23} />
              </button>
              <button
                className="profile-button"
                aria-label="Switch demo member"
                onClick={() => setModal("Settings")}
              >
                <Avatar id={actor} />
              </button>
            </div>
          </nav>
          <aside className="chats-sidebar" aria-label="Chat list">
            <header className="chats-heading">
              <h1>Chats</h1>
              <div>
                <button
                  className="icon-button"
                  aria-label="Choose a group"
                  onClick={() => {
                    setQuery("");
                    setFilter("All");
                    searchInput.current?.focus();
                  }}
                >
                  <MessageSquarePlus size={22} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Chat list menu"
                  onClick={() => setModal("Settings")}
                >
                  <MoreVertical size={22} />
                </button>
              </div>
            </header>
            <label className="search-box">
              <Search size={19} />
              <input
                ref={searchInput}
                aria-label="Search groups"
                placeholder="Search or start a new chat"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={17} />
                </button>
              )}
            </label>
            <div className="chat-filters" aria-label="Filter chats">
              {["All", "Unread", "Favourites", "Groups"].map((item) => (
                <button
                  key={item}
                  aria-pressed={filter === item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              className="archived-row"
              onClick={() => setModal("Archived")}
            >
              <Archive size={21} />
              <span>Archived</span>
            </button>
            <nav className="group-list" aria-label="Group chats">
              {filtered.map((id) => {
                const latest = snapshot.rooms[id].messages.at(-1);
                const unread = !readRooms.includes(id);
                return (
                  <button
                    key={id}
                    className={`group-row ${roomId === id ? "active" : ""}`}
                    onClick={() => selectRoom(id)}
                  >
                    <GroupAvatar id={id} />
                    <span className="group-row-body">
                      <span className="group-row-top">
                        <strong>{roomMeta[id].name}</strong>
                        <time className={unread ? "unread-time" : ""}>
                          {latest ? time(latest.at) : ""}
                        </time>
                      </span>
                      <span className="group-row-bottom">
                        <span className="message-preview">
                          {latest?.author === actor && <CheckCheck size={16} />}
                          {latest
                            ? `${latest.author === actor ? "You" : latest.authorName || authorName(latest.author)}: ${latest.text}`
                            : "Start a conversation"}
                        </span>
                        {id === "party" && (
                          <Star size={14} className="favourite-star" />
                        )}
                        {unread && <span className="unread-count">1</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
              {!filtered.length && (
                <p className="no-results">
                  {filter === "Unread"
                    ? "You’re all caught up."
                    : "No chats found."}
                </p>
              )}
              <p className="chat-list-note">
                Your group plans, all in one place.
              </p>
            </nav>
            <div className="demo-switcher">
              <Avatar id={actor} />
              <div>
                <label htmlFor="actor-select">Demo · chatting as</label>
                <select
                  id="actor-select"
                  value={actor}
                  onChange={(e) => setActor(e.target.value as MemberId)}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.id === "ao" ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="icon-button"
                aria-label="About this demo"
                onClick={() => setModal("Lines")}
              >
                <Info size={19} />
              </button>
            </div>
          </aside>
          <section
            className="chat-panel"
            aria-label={`${meta.name} conversation`}
          >
            <header className="chat-header">
              <button
                className="icon-button mobile-back"
                aria-label="Show groups"
                onClick={() => {
                  setShowList(true);
                  setPanel(null);
                }}
              >
                <ArrowLeft size={23} />
              </button>
              <button
                className="group-details-trigger"
                aria-label="Group info"
                onClick={() => setPanel(panel === "info" ? null : "info")}
              >
                <GroupAvatar id={roomId} />
                <span>
                  <strong>{meta.name}</strong>
                  <span
                    className={
                      room.appStatus === "building" ? "typing-label" : ""
                    }
                  >
                    {room.appStatus === "building" || room.thinking
                      ? "Lines is typing…"
                      : `${members
                          .filter((m) => m.id !== actor)
                          .map((m) => m.name)
                          .join(", ")}, Lines, You`}
                  </span>
                </span>
              </button>
              <div className="chat-header-actions">
                <button
                  className="icon-button video-button"
                  aria-label="Group call"
                  onClick={() => setModal("Group calls")}
                >
                  <Video size={24} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Search messages"
                  onClick={() => setPanel(panel === "search" ? null : "search")}
                >
                  <Search size={22} />
                </button>
                <div className="chat-menu-anchor">
                  <button
                    className="icon-button"
                    aria-label="Group menu"
                    aria-expanded={menu}
                    onClick={() => setMenu(!menu)}
                  >
                    <MoreVertical size={22} />
                  </button>
                  {menu && (
                    <>
                      <button
                        className="menu-dismiss"
                        aria-label="Close group menu"
                        onClick={() => setMenu(false)}
                      />
                      <div className="dropdown-menu">
                        <button
                          onClick={() => {
                            setPanel("info");
                            setMenu(false);
                          }}
                        >
                          Group info
                        </button>
                        <button onClick={openApp}>Open group app</button>
                        <button
                          onClick={() => {
                            setModal("Settings");
                            setMenu(false);
                          }}
                        >
                          Demo settings
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>
            {!connected && (
              <div className="connection-notice" role="status">
                <LoaderCircle
                  size={17}
                  className={connection === "connecting" ? "spin" : ""}
                />
                {connection === "connecting"
                  ? "Connecting to your agent…"
                  : "Agent offline. Reload to reconnect."}
              </div>
            )}
            <div className="conversation">
              <div className="conversation-content">
                <div className="day-divider">
                  <span>Today</span>
                </div>
                <button
                  className="group-system-message"
                  onClick={() => setModal("Lines")}
                >
                  <LinesMark />
                  <span>
                    Lines joined the group. Mention <b>@Lines</b> to get things
                    done together.
                  </span>
                </button>
                <div
                  className="message-list"
                  role="log"
                  aria-label="Messages"
                  aria-live="polite"
                >
                  {room.messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      mine={message.author === actor}
                      grouped={
                        index > 0 &&
                        room.messages[index - 1].author === message.author
                      }
                      roomId={roomId}
                      openApp={openApp}
                    />
                  ))}
                  {!room.messages.length && (
                    <div className="chat-empty">
                      <Users size={26} />
                      <p>
                        {connected
                          ? "Your people, your next plan. Say hello."
                          : "Waiting for your agent to connect."}
                      </p>
                    </div>
                  )}
                  {(room.appStatus === "building" || room.thinking) && (
                    <div className="message-row">
                      <Avatar id="lines" small />
                      <div className="bubble build-bubble">
                        <span className="message-author author-lines">
                          Lines
                        </span>
                        <p>
                          <span className="typing-dots">
                            <i />
                            <i />
                            <i />
                          </span>
                          <span className="sr-only">Lines is working</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {["awaiting_input", "checking", "failed"].includes(room.appStatus) && (
                    <div className="group-system-message" role="status"><LinesMark /><span>{room.appStatus === "awaiting_input" ? "Lovable is waiting for plan approval." : room.appStatus === "checking" ? "Your app is building in Lovable." : "Your app needs attention."} <button className="inline-build-action" onClick={openApp}>View project</button></span></div>
                  )}
                  <div ref={messagesEnd} />
                </div>
              </div>
            </div>
            <ChatComposer
              key={roomId}
              roomId={roomId}
              actor={actor}
              connected={connected}
              busy={room.appStatus === "building"}
              onSend={(text) =>
                send({ type: "message.send", roomId, actor, text })
              }
              openApp={openApp}
            />
          </section>
        </>
      )}
      {(panel || appOnly) && (
        <aside
          className={`detail-panel ${appOnly ? "standalone-panel" : ""}`}
          aria-label={
            panel === "info"
              ? "Group information"
              : panel === "search"
                ? "Search in conversation"
                : "Group app"
          }
        >
          <header className="detail-header">
            {!appOnly && (
              <button
                className="icon-button"
                aria-label="Close side panel"
                onClick={() => setPanel(null)}
              >
                <X size={22} />
              </button>
            )}
            <strong>
              {panel === "info"
                ? "Group info"
                : panel === "search"
                  ? "Search messages"
                  : meta.app}
            </strong>
            {(panel === "app" || appOnly) && (
              <a
                aria-label="Open app in a new tab"
                href={isDemo ? `/?app=${roomId}` : room.appUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={19} />
              </a>
            )}
          </header>
          {(panel === "app" || appOnly) && (
            <>
              <div className="app-panel-subhead">
                <span>
                  <i className="status-dot" />
                  {isDemo ? "Interactive demo" : "Shared app"}
                </span>
                {isDemo && publishedApps[roomId] ? (
                  <a
                    href={publishedApps[roomId]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open published ${meta.app} demo`}
                    title="Standalone published demo · data is separate from this chat"
                  >
                    Lovable demo <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <span>Made with Lines</span>
                )}
              </div>
              {appOnly && (
                <div className="standalone-member">
                  <a href="/">← Back to chat</a>
                  <select
                    aria-label="Demo member"
                    value={actor}
                    onChange={(e) => setActor(e.target.value as MemberId)}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="app-scroll">
                {miniApp}
                {room.appStatus === "building" && isDemo && (
                  <div className="building-overlay" role="status">
                    <LinesMark />
                    <h3>Putting it together.</h3>
                    <p>Preparing your demo app</p>
                    <LoaderCircle className="spin" size={22} />
                  </div>
                )}
              </div>
            </>
          )}
          {panel === "info" && (
            <div className="group-info-content">
              <div className="group-info-hero">
                <GroupAvatar id={roomId} />
                <h2>{meta.name}</h2>
                <p>Group · 5 members</p>
              </div>
              <section className="info-section">
                <small>Description</small>
                <p>{meta.subtitle}</p>
                <p className="info-caption">
                  A shared space for our plans, with a little help from Lines.
                </p>
                <button className="group-app-link" onClick={openApp}>
                  <LayoutGrid size={20} />
                  <span>
                    {meta.app}
                    <small>Open the group’s shared app</small>
                  </span>
                  <ArrowUpRight size={19} />
                </button>
              </section>
              <section className="info-section">
                <small>5 members</small>
                <button
                  className="member-detail"
                  onClick={() => setModal("Lines")}
                >
                  <Avatar id="lines" />
                  <span>
                    Lines<small>Your group agent · @Lines to wake</small>
                  </span>
                </button>
                {members.map((m) => (
                  <div className="member-detail" key={m.id}>
                    <Avatar id={m.id} />
                    <span>
                      {m.id === actor ? "You" : m.name}
                      <small>
                        {m.id === actor ? "Demo identity" : "Group member"}
                      </small>
                    </span>
                  </div>
                ))}
              </section>
            </div>
          )}
          {panel === "search" && (
            <div className="message-search-panel">
              <label className="search-box">
                <Search size={18} />
                <input
                  autoFocus
                  aria-label="Search in conversation"
                  placeholder="Search messages"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                />
              </label>
              {chatSearch ? (
                room.messages
                  .filter((m) =>
                    m.text.toLowerCase().includes(chatSearch.toLowerCase()),
                  )
                  .map((m) => (
                    <div className="search-result" key={m.id}>
                      <strong>
                        {m.authorName || authorName(m.author)}
                        <time>{time(m.at)}</time>
                      </strong>
                      <p>{m.text}</p>
                    </div>
                  ))
              ) : (
                <p className="no-results">
                  Search this conversation with {meta.name}.
                </p>
              )}
              {chatSearch &&
                !room.messages.some((m) =>
                  m.text.toLowerCase().includes(chatSearch.toLowerCase()),
                ) && <p className="no-results">No matching messages.</p>}
            </div>
          )}
        </aside>
      )}
      {error && (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={transport.clearError}>
            <X size={18} />
          </button>
        </div>
      )}
      {modal && (
        <dialog
          ref={dialog}
          className="app-dialog"
          aria-labelledby="dialog-title"
          onCancel={() => setModal(null)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section>
            <button
              className="icon-button modal-close"
              aria-label="Close information"
              onClick={() => setModal(null)}
            >
              <X size={23} />
            </button>
            <div className="dialog-brand">
              <Avatar id="lines" />
            </div>
            <h2 id="dialog-title">
              {modal === "Lines" ? "Meet Lines." : modal}
            </h2>
            {modal === "Lines" ? (
              <>
                <p className="dialog-lead">
                  Connecting the dots. Bringing your people together.
                </p>
                <p>
                  Lines is your group’s agent. Mention <b>@Lines</b> in a
                  conversation to turn a plan into something everyone can use.
                </p>
                <div className="how-it-works">
                  <span>1. Mention @Lines</span>
                  <span>2. Share what you need</span>
                  <span>3. Open your shared app</span>
                </div>
              </>
            ) : modal === "Settings" ? (
              <>
                <p>Try the conversation as any group member.</p>
                <label className="settings-member">
                  Demo member
                  <select
                    value={actor}
                    onChange={(e) => setActor(e.target.value as MemberId)}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                {(isDemo || modes?.lovable === "mock") && (
                  <button
                    className="reset-button"
                    onClick={() => {
                      send({ type: "demo.reset", roomId, actor });
                      setModal(null);
                    }}
                  >
                    <RotateCcw size={17} />
                    Reset this group’s demo
                  </button>
                )}
              </>
            ) : (
              <p>
                {modal === "Archived"
                  ? "No archived chats. The three demo groups are in Chats."
                  : `${modal} aren’t connected in this prototype. You can chat, mention Lines, and use all three shared apps.`}
              </p>
            )}
            <div className="demo-disclosure">
              WhatsApp UI prototype ·{" "}
              {isDemo
                ? "Example conversations and simulated agent replies. Changes stay in this browser and sync across its tabs. The Lovable bridge connects separately."
                : `Connected backend · Agent: ${modes?.agent ?? "connecting"} · Lovable: ${modes?.lovable ?? "connecting"}. Apps keep separate demo data.`}{" "}
              This is not connected to WhatsApp.
            </div>
            <button className="dialog-done" onClick={() => setModal(null)}>
              Got it
            </button>
          </section>
        </dialog>
      )}
    </div>
  );
}

function GroupAvatar({ id }: { id: RoomId }) {
  return (
    <span className={`group-avatar ${id}`} aria-hidden="true">
      <span>{roomMeta[id].emoji}</span>
    </span>
  );
}

function MessageBubble({
  message,
  mine,
  grouped,
  roomId,
  openApp,
}: {
  message: Message;
  mine: boolean;
  grouped: boolean;
  roomId: RoomId;
  openApp: () => void;
}) {
  const meta = roomMeta[roomId];
  return (
    <div
      className={`message-row ${mine ? "mine" : ""} ${grouped ? "grouped" : ""} ${message.author === "lines" ? "from-agent" : ""}`}
    >
      {!mine && (
        <span className={`message-avatar ${grouped ? "invisible" : ""}`}>
          <Avatar id={message.author} small />
        </span>
      )}
      <div
        className={`bubble ${mine ? "my-bubble" : ""} ${message.appCard ? "has-app-card" : ""}`}
      >
        {!mine && !grouped && (
          <div className={`message-author author-${message.author}`}>
            {message.authorName || authorName(message.author)}
          </div>
        )}
        {message.appCard && (
          <button
            className={`app-message-card card-${roomId}`}
            onClick={openApp}
            aria-label={`Open ${meta.app}`}
          >
            <div className="card-art">
              <div>
                <LinesMark />
                <span>Made for your group</span>
              </div>
              <strong>{meta.app}</strong>
              <span className="card-art-emoji">{meta.emoji}</span>
              <span className="card-art-caption">
                {roomId === "party"
                  ? "A little party. All coming together."
                  : roomId === "morning"
                    ? "Small wins. Brighter mornings."
                    : "Your people. Their favourite drinks."}
              </span>
            </div>
            <div className="card-copy">
              <strong>{meta.app}</strong>
              <span>{meta.description}</span>
              <small>
                Open shared app <ArrowUpRight size={13} />
              </small>
            </div>
          </button>
        )}
        <p>
          {messageParts(message.text).map((part, i) =>
            part.mention ? (
              <span key={i} className="mention">
                {part.text}
              </span>
            ) : (
              part.text
            ),
          )}
          <span className="time-spacer" />
        </p>
        <span className="message-time">
          {time(message.at)}
          {mine && <CheckCheck size={16} />}
        </span>
      </div>
    </div>
  );
}
