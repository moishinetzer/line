import { useEffect, useState } from "react";
import {
  Check,
  Plus,
  ArrowUpRight,
  Sun,
  Trophy,
  ShoppingBag,
  CheckCheck,
  Circle,
  Undo2,
} from "lucide-react";
import type { Command, MemberId, Room } from "../../shared/protocol";
import { drinks, members, memberName } from "../lib/data";
import { londonDay, sevenDayWindow } from "../lib/demo";
import { LinesMark } from "./LinesMark";
export { LinesMark } from "./LinesMark";

type Props = { room: Room; actor: MemberId; send: (command: Command) => void };

export function Avatar({
  id,
  small = false,
}: {
  id: string;
  small?: boolean;
}) {
  if (id === "lines")
    return (
      <span
        className={`avatar lines-avatar ${small ? "small" : ""}`}
        aria-label="Lines"
      >
        <LinesMark />
      </span>
    );
  const member = members.find((m) => m.id === id) ?? { name: id, color: "peach", initials: id.slice(0, 2).toUpperCase() };
  return (
    <span
      className={`avatar ${member.color} ${small ? "small" : ""}`}
      aria-label={member.name}
    >
      {member.initials}
    </span>
  );
}

function PartyArt() {
  return (
    <svg className="party-art" viewBox="0 0 180 195" aria-hidden="true">
      <g transform="rotate(14 110 100)">
        <path
          d="M75 61h76l-38 53z"
          fill="#e9ee9a"
          stroke="#454c2d"
          strokeWidth="2"
        />
        <path d="M88 78h51l-26 34z" fill="#b3c95a" />
        <path
          d="M113 114v42m-21 0h42"
          stroke="#454c2d"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M126 79l12-48" stroke="#624573" strokeWidth="4" />
        <circle cx="85" cy="60" r="17" fill="#edbb4c" />
        <path
          d="M75 50l20 21m-20 0l21-20M85 45v30M70 59h30"
          stroke="#ffe79a"
          strokeWidth="2"
        />
      </g>
      <path
        d="M23 122c3-17 15-22 28-19s17 16 13 29c-6 16-29 31-29 31s-15-24-12-41"
        fill="#f2755e"
      />
      <path
        d="M32 100l5 12 9-12 6 9 10-7"
        fill="none"
        stroke="#486e48"
        strokeWidth="4"
      />
      <g stroke="#704e8c" strokeWidth="2.5" strokeLinecap="round">
        <path d="M25 35l5 9m14-12l-4 9M17 51l9 2M153 145l8 5m-6 11l7-2" />
      </g>
      <path
        d="M50 67q10-11 16 0t13 0"
        fill="none"
        stroke="#9f81bb"
        strokeWidth="2"
      />
    </svg>
  );
}

export function PartyApp({ room, actor, send }: Props) {
  const [adding, setAdding] = useState(false);
  const [itemName, setItemName] = useState("");
  const claimed = room.items.filter((i) => i.owner).length;
  const bought = room.items.filter((i) => i.done).length;
  return (
    <div className="mini-app party-app">
      <div className="party-hero">
        <div className="party-date">
          <span className="date-dot" /> Saturday, 10 October · 5pm
        </div>
        <h2>
          Saturday,
          <br />
          sorted.
        </h2>
        <p>
          A little party.
          <br />A little something from everyone.
        </p>
        <PartyArt />
        <div className="party-location">
          <span>At Maya’s place</span>
          <span>🍋</span>
        </div>
      </div>
      <div className="mini-body">
        <div className="together-row">
          <div className="avatar-stack">
            {members.map((m) => (
              <Avatar key={m.id} id={m.id} small />
            ))}
          </div>
          <span>Good company, good plan.</span>
        </div>
        <div className="list-heading">
          <h3>Who’s bringing what</h3>
          <span>
            {claimed}/{room.items.length} claimed
          </span>
        </div>
        <div className="progress-track">
          <span
            style={{
              width: `${room.items.length ? (claimed / room.items.length) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="items-list">
          {room.items.map((item) => (
            <div
              key={item.id}
              className={`party-item ${item.done ? "item-done" : ""}`}
            >
              <span className="item-emoji">{item.emoji}</span>
              <div className="item-copy">
                <strong>{item.name}</strong>
                <span>{item.note}</span>
                {item.owner && (
                  <span className="item-person">
                    {item.done ? <CheckCheck size={12} /> : <Circle size={9} />}{" "}
                    {memberName(item.owner)}
                    {item.done ? " · picked up" : " is bringing this"}
                  </span>
                )}
              </div>
              {!item.owner ? (
                <button
                  className="claim-button"
                  onClick={() =>
                    send({
                      type: "party.claim",
                      roomId: "party",
                      actor,
                      itemId: item.id,
                    })
                  }
                  aria-label={`Claim ${item.name}`}
                >
                  <Plus size={14} />
                  <span>I’ll bring it</span>
                </button>
              ) : item.owner === actor ? (
                <div className="item-actions">
                  <button
                    className={`check-button ${item.done ? "checked" : ""}`}
                    title={item.done ? "Mark not purchased" : "Mark purchased"}
                    aria-label={`${item.done ? "Undo purchase of" : "Mark purchased:"} ${item.name}`}
                    onClick={() =>
                      send({
                        type: "party.toggle",
                        roomId: "party",
                        actor,
                        itemId: item.id,
                      })
                    }
                  >
                    <Check size={17} />
                  </button>
                  {!item.done && (
                    <button
                      className="release-button"
                      title="Release item"
                      aria-label={`Release ${item.name}`}
                      onClick={() =>
                        send({
                          type: "party.claim",
                          roomId: "party",
                          actor,
                          itemId: item.id,
                        })
                      }
                    >
                      <Undo2 size={12} />
                    </button>
                  )}
                </div>
              ) : (
                <Avatar id={item.owner} small />
              )}
            </div>
          ))}
        </div>
        {adding ? (
          <form
            className="add-item-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!itemName.trim()) return;
              send({
                type: "party.add",
                roomId: "party",
                actor,
                name: itemName.trim(),
              });
              setItemName("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              aria-label="New item name"
              placeholder="What else do we need?"
              maxLength={60}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <button aria-label="Add item" type="submit">
              <Plus size={18} />
            </button>
          </form>
        ) : (
          <button className="add-item" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add something to the list
          </button>
        )}
        <div className="app-note">
          <span>✳</span>
          <p>
            {room.items.length - claimed
              ? `${room.items.length - claimed} little ${room.items.length - claimed === 1 ? "thing still needs" : "things still need"} a volunteer.`
              : "Everyone has a part. You’re all set."}
            <br />
            <span>{bought} picked up. The group chat is in the loop.</span>
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

export function MorningApp({ room, actor, send }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const today = londonDay(now);
  const days = sevenDayWindow(now);
  const checkedIn = room.checkins.some(
    (c) => c.member === actor && c.date === today,
  );
  const checkedToday = room.checkins.filter((c) => c.date === today).length;
  const ranked = members
    .map((member) => ({
      ...member,
      points: room.checkins.filter((c) => c.member === member.id && c.onTime && days.has(c.date))
        .length,
      checked: room.checkins.some(
        (c) => c.member === member.id && c.date === today,
      ),
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return (
    <div className="mini-app morning-app">
      <div className="morning-hero">
        <span className="club-pill">
          <Sun size={13} /> The 7:30 club
        </span>
        <div className="sun-art">
          <div className="sun-face">
            <i />
            <i />
            <b />
          </div>
        </div>
        <h2>
          Rise
          <br />
          together.
        </h2>
        <p>
          A small promise.
          <br />A brighter start.
        </p>
      </div>
      <div className="mini-body">
        <div className="morning-date">
          {new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/London",
          }).format(new Date())}
          <span>London time</span>
        </div>
        <button
          className={`wake-button ${checkedIn ? "is-awake" : ""}`}
          disabled={checkedIn}
          onClick={() =>
            send({ type: "morning.checkin", roomId: "morning", actor })
          }
        >
          {checkedIn ? <Check size={20} /> : <Sun size={21} />}{" "}
          {checkedIn ? "You showed up. Nice." : "I’m up!"}
          {!checkedIn && <ArrowUpRight size={19} />}
        </button>
        <p className="wake-hint">
          {checkedToday} of 4 checked in today. One point by 7:30am. Last seven days.
        </p>
        <div className="list-heading">
          <h3>Your morning people</h3>
          <Trophy size={16} />
        </div>
        <div className="leaderboard">
          {ranked.map((member) => (
            <div
              className={`leader-row ${member.id === actor ? "is-you" : ""}`}
              key={member.id}
            >
              <span className="rank">{ranked.findIndex((entry) => entry.points === member.points) + 1}</span>
              <Avatar id={member.id} small />
              <span className="leader-name">
                {member.name}
                {member.id === actor && <small>You</small>}
                <span>
                  {member.checked ? "Checked in today" : "A fresh start awaits"}
                </span>
              </span>
              <strong>
                {member.points}
                <small>pts</small>
              </strong>
            </div>
          ))}
        </div>
        <div className="app-note">
          <Sun size={19} />
          <p>
            Showing up counts.
            <br />
            <span>Self-reported check-ins. No alarm-clock policing.</span>
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

function BobaCup({ color }: { color: string }) {
  return (
    <div className={`boba-cup ${color}`} aria-hidden="true">
      <div className="boba-straw" />
      <div className="boba-lid" />
      <div className="boba-liquid">
        <span>
          little
          <br />
          joys
        </span>
        <div className="pearls">
          {Array.from({ length: 11 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BobaApp({ room, actor, send }: Props) {
  const existing = room.orders.find((o) => o.member === actor);
  const [selected, setSelected] = useState(existing?.drinkId ?? "classic");
  const [sugar, setSugar] = useState(existing?.sugar ?? "50%");
  const [ice, setIce] = useState(existing?.ice ?? "Less ice");
  const [summary, setSummary] = useState(false);
  const total = room.orders.reduce(
    (sum, order) =>
      sum + (drinks.find((d) => d.id === order.drinkId)?.price ?? 0),
    0,
  );
  const unchanged =
    existing?.drinkId === selected &&
    existing?.sugar === sugar &&
    existing?.ice === ice;
  return (
    <div className="mini-app boba-app">
      <div className="boba-hero">
        <span className="club-pill">A very good group decision</span>
        <h2>The usual?</h2>
        <p>A little pick-me-up for everyone.</p>
        <span className="boba-hero-star">✳</span>
        <div className="menu-label">
          Demo menu <span>3 happy little options</span>
        </div>
      </div>
      <div className="mini-body">
        <div className="drinks-grid">
          {drinks.map((drink) => (
            <button
              key={drink.id}
              className={`drink-option ${selected === drink.id ? "selected" : ""}`}
              onClick={() => setSelected(drink.id)}
              aria-pressed={selected === drink.id}
            >
              <div className={`drink-picture ${drink.color}`}>
                <BobaCup color={drink.color} />
                {selected === drink.id && (
                  <span className="drink-selected">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <strong>{drink.name}</strong>
              <span>£{drink.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
        <p className="drink-description">
          {drinks.find((d) => d.id === selected)?.subtitle}
        </p>
        <div className="order-options">
          <label>
            Sweetness
            <select value={sugar} onChange={(e) => setSugar(e.target.value)}>
              <option>0%</option>
              <option>50%</option>
              <option>100%</option>
            </select>
          </label>
          <label>
            Ice
            <select value={ice} onChange={(e) => setIce(e.target.value)}>
              <option>No ice</option>
              <option>Less ice</option>
              <option>Regular</option>
            </select>
          </label>
        </div>
        <button
          className="order-button"
          disabled={unchanged}
          onClick={() =>
            send({
              type: "boba.order",
              roomId: "boba",
              actor,
              drinkId: selected as "classic" | "matcha" | "taro",
              sugar: sugar as "0%" | "50%" | "100%",
              ice: ice as "No ice" | "Less ice" | "Regular",
            })
          }
        >
          {unchanged ? <Check size={17} /> : <Plus size={17} />}{" "}
          {unchanged
            ? "Your drink is on the list"
            : existing
              ? "Update my drink"
              : "Add my drink"}
        </button>
        <div className="list-heading order-heading">
          <h3>The group order</h3>
          <span>{room.orders.length}/4 picked</span>
        </div>
        <div className="order-list">
          {room.orders.length ? (
            room.orders.map((order) => (
              <div className="order-row" key={order.member}>
                <Avatar id={order.member} small />
                <div>
                  <strong>{memberName(order.member)}</strong>
                  <span>
                    {drinks.find((d) => d.id === order.drinkId)?.name} ·{" "}
                    {order.sugar} · {order.ice}
                  </span>
                </div>
                <span>
                  £
                  {drinks.find((d) => d.id === order.drinkId)?.price.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <p className="empty-orders">
              First round’s on the list. Pick your drink above.
            </p>
          )}
        </div>
        <button
          className="order-total"
          disabled={!room.orders.length}
          onClick={() => setSummary(!summary)}
        >
          <span>
            <ShoppingBag size={16} />{" "}
            {summary ? "Hide summary" : "View order summary"}
          </span>
          <strong>£{total.toFixed(2)}</strong>
        </button>
        {summary && (
          <div className="order-summary">
            <strong>Ready to pass to the person ordering</strong>
            <p>
              {room.orders
                .map(
                  (o) =>
                    `${memberName(o.member)}: ${drinks.find((d) => d.id === o.drinkId)?.name}, ${o.sugar} sugar, ${o.ice.toLowerCase()}.`,
                )
                .join("\n")}
            </p>
            <small>This is an order list. No purchase has been placed.</small>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}

function AppFooter() {
  return (
    <div className="app-footer">
      <LinesMark /> A little app by Lines. Made for your people.
    </div>
  );
}
