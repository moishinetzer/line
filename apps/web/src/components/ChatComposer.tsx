import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  AtSign,
  LayoutGrid,
  Mic,
  Plus,
  Send,
  Smile,
  X,
} from "lucide-react";
import type { MemberId, RoomId } from "../../shared/protocol";
import { agentMentions, mentionQuery } from "../../shared/mentions";
import { roomMeta, memberName } from "../lib/data";
import { Avatar } from "./MiniApps";

type Props = {
  roomId: RoomId;
  actor: MemberId;
  connected: boolean;
  busy: boolean;
  onSend: (text: string) => void;
  openApp: () => void;
  suggestedDraft?: string;
};
export function ChatComposer({
  roomId,
  actor,
  connected,
  busy,
  onSend,
  openApp,
  suggestedDraft = "",
}: Props) {
  const [draft, setDraft] = useState(suggestedDraft);
  useEffect(() => { setDraft((current) => current || suggestedDraft); }, [suggestedDraft]);
  const [caret, setCaret] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [tray, setTray] = useState<"actions" | "emoji" | "voice" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const query = mentionQuery(draft, caret);
  const showMention = connected && !!query && !dismissed;
  const willWake = agentMentions(draft).length > 0;
  function placeDraft(text: string, position: number) {
    setDraft(text);
    setCaret(position);
    setDismissed(true);
    setTray(null);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(position, position);
    });
  }
  function chooseLines() {
    if (!query) return;
    const suffix = draft.slice(query.end);
    const token = suffix.startsWith(" ") ? "@Lines" : "@Lines ";
    placeDraft(
      draft.slice(0, query.start) + token + suffix,
      query.start + token.length,
    );
  }
  function insert(text: string) {
    const start = input.current?.selectionStart ?? draft.length;
    const end = input.current?.selectionEnd ?? start;
    placeDraft(
      draft.slice(0, start) + text + draft.slice(end),
      start + text.length,
    );
  }
  function submit() {
    if (!draft.trim() || !connected || busy) return;
    onSend(draft.trim());
    setDraft("");
    setCaret(0);
    setDismissed(false);
    setTray(null);
  }
  return (
    <div className="composer-area">
      <div className="composer-anchor">
        {showMention && (
          <div
            className="mention-menu"
            id="agent-mention-options"
            role="listbox"
            aria-label="Mention a group member"
          >
            <button
              id="lines-mention-option"
              role="option"
              aria-selected="true"
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={chooseLines}
            >
              <Avatar id="lines" />
              <span>
                <strong>Lines</strong>
                <span>Your group agent</span>
              </span>
              <span className="mention-handle">@Lines</span>
            </button>
          </div>
        )}
        {tray && !showMention && (
          <div className={`composer-tray tray-${tray}`}>
            {tray === "actions" ? (
              <>
                <button
                  onClick={() =>
                    placeDraft(
                      roomMeta[roomId].prompt,
                      roomMeta[roomId].prompt.length,
                    )
                  }
                >
                  <span className="tray-icon">
                    <AtSign size={22} />
                  </span>
                  <span>
                    Ask Lines<small>Make something for your group</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    openApp();
                    setTray(null);
                  }}
                >
                  <span className="tray-icon app-tray-icon">
                    <LayoutGrid size={22} />
                  </span>
                  <span>
                    Group app<small>{roomMeta[roomId].app}</small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              </>
            ) : tray === "emoji" ? (
              <>
                <span className="tray-title">Smileys & people</span>
                <div className="emoji-grid">
                  {[
                    "😊",
                    "😂",
                    "❤️",
                    "🙌",
                    "👍",
                    "🎉",
                    "🍋",
                    "🧋",
                    "☀️",
                    "🔥",
                    "✨",
                    "🥹",
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      aria-label={`Insert ${emoji}`}
                      onClick={() => insert(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p>
                Voice messages aren’t connected in this demo. Type a message or
                mention @Lines.
              </p>
            )}
          </div>
        )}
        <form
          className={`composer ${willWake ? "has-agent-mention" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <button
            className="composer-plus icon-button"
            type="button"
            aria-label="Attach or ask Lines"
            aria-expanded={tray === "actions"}
            onClick={() => setTray(tray === "actions" ? null : "actions")}
          >
            {tray === "actions" ? <X size={25} /> : <Plus size={27} />}
          </button>
          <div className="composer-input-wrap">
            <button
              className="emoji-button icon-button"
              type="button"
              aria-label="Emoji"
              aria-expanded={tray === "emoji"}
              onClick={() => setTray(tray === "emoji" ? null : "emoji")}
            >
              <Smile size={25} />
            </button>
            <input
              ref={input}
              role="combobox"
              aria-label="Message the group"
              aria-autocomplete="list"
              aria-expanded={showMention}
              aria-controls={showMention ? "agent-mention-options" : undefined}
              aria-activedescendant={
                showMention ? "lines-mention-option" : undefined
              }
              aria-describedby="composer-agent-hint"
              maxLength={2000}
              placeholder="Type a message"
              value={draft}
              disabled={!connected}
              onChange={(e) => {
                setDraft(e.target.value);
                setCaret(e.target.selectionStart ?? e.target.value.length);
                setDismissed(false);
                setTray(null);
              }}
              onSelect={(e) =>
                setCaret(e.currentTarget.selectionStart ?? draft.length)
              }
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (showMention && (e.key === "Enter" || e.key === "Tab")) {
                  e.preventDefault();
                  chooseLines();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setDismissed(true);
                  setTray(null);
                } else if (
                  showMention &&
                  (e.key === "ArrowDown" || e.key === "ArrowUp")
                )
                  e.preventDefault();
              }}
            />
          </div>
          {draft.trim() ? (
            <button
              className="send-button icon-button"
              type="submit"
              aria-label="Send message"
              disabled={!connected}
            >
              <Send size={23} />
            </button>
          ) : (
            <button
              className="icon-button mic-button"
              type="button"
              aria-label="Voice message"
              onClick={() => setTray(tray === "voice" ? null : "voice")}
            >
              <Mic size={24} />
            </button>
          )}
        </form>
      </div>
      <div
        id="composer-agent-hint"
        className={`composer-hint ${willWake ? "will-wake" : ""}`}
        aria-live="polite"
      >
        <span>
          {willWake
            ? "Lines will wake when you send"
            : busy
              ? "Lines is working. Keep chatting."
              : `Message as ${memberName(actor)} · @Lines to wake your group agent`}
        </span>
      </div>
    </div>
  );
}
