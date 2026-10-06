import type {
  MemberId,
  RoomId,
  Snapshot,
  Message,
} from "../../shared/protocol";

// Verified standalone Lovable demos, 2026-10-06. Their data is separate from this local chat.
export const publishedApps: Partial<Record<RoomId, string>> = {
  party: "https://saturday-sorted-app.lovable.app",
  morning: "https://lines-rise-together.lovable.app",
  boba: "https://the-usual-by-lines.lovable.app",
};

export const members: {
  id: MemberId;
  name: string;
  initials: string;
  color: string;
}[] = [
  { id: "ao", name: "Ao", initials: "A", color: "peach" },
  { id: "maya", name: "Maya", initials: "M", color: "lilac" },
  { id: "leo", name: "Leo", initials: "L", color: "blue" },
  { id: "nina", name: "Nina", initials: "N", color: "pink" },
];
export const memberName = (id: string) =>
  members.find((m) => m.id === id)?.name ?? id;
export const roomMeta: Record<
  RoomId,
  {
    name: string;
    subtitle: string;
    emoji: string;
    app: string;
    prompt: string;
    description: string;
  }
> = {
  party: {
    name: "The Saturday Club",
    subtitle: "A good excuse to get together",
    emoji: "🍋",
    app: "Saturday, sorted",
    prompt: "@Lines, make a shared checklist for Saturday.",
    description: "A little party. Everyone brings a little something.",
  },
  morning: {
    name: "Early birds",
    subtitle: "Mornings are better with company",
    emoji: "🌤️",
    app: "Rise together",
    prompt: "@Lines, make our morning check-in board.",
    description: "One small promise. A brighter start, together.",
  },
  boba: {
    name: "Boba break",
    subtitle: "Important group decisions",
    emoji: "🧋",
    app: "The usual?",
    prompt: "@Lines, make a group order from our demo menu.",
    description: "Your favourite people. Their favourite drinks.",
  },
};
export const drinks = [
  {
    id: "classic",
    name: "Brown sugar",
    subtitle: "Milk tea · tapioca pearls",
    price: 5.5,
    color: "caramel",
  },
  {
    id: "matcha",
    name: "Matcha cloud",
    subtitle: "Matcha · oat milk",
    price: 5.9,
    color: "matcha",
  },
  {
    id: "taro",
    name: "Taro dream",
    subtitle: "Taro milk · tapioca pearls",
    price: 5.7,
    color: "taro",
  },
];
const msg = (
  id: string,
  author: Message["author"],
  text: string,
  minute: number,
  appCard = false,
): Message => ({
  id,
  author,
  text,
  at: `2026-10-06T17:${minute}:00.000Z`,
  appCard,
});
export function seedSnapshot(): Snapshot {
  return {
    rooms: {
      party: {
        id: "party",
        appStatus: "ready",
        checkins: [],
        orders: [],
        items: [
          {
            id: "drinks",
            name: "Something to sip",
            note: "Drinks for 4",
            emoji: "🍹",
            owner: "leo",
            done: true,
          },
          {
            id: "snacks",
            name: "The snack situation",
            note: "Crisps, dips & something salty",
            emoji: "🥨",
            owner: "maya",
            done: false,
          },
          {
            id: "ice",
            name: "Ice, ice, baby",
            note: "Two big bags should do it",
            emoji: "🧊",
            owner: null,
            done: false,
          },
          {
            id: "dessert",
            name: "A sweet ending",
            note: "Something to share",
            emoji: "🍓",
            owner: null,
            done: false,
          },
        ],
        messages: [
          msg(
            "p1",
            "maya",
            "Saturday at mine? Little garden party before it gets too cold 🍋",
            41,
          ),
          msg("p2", "ao", "Very in. Let’s do 5pm? I’ll bring the speaker.", 42),
          msg(
            "p3",
            "leo",
            "I’ve got drinks! Someone save me from buying six bags of crisps again.",
            42,
          ),
          msg(
            "p4",
            "maya",
            "😂 I’ll handle snacks. We still need ice and something sweet.",
            43,
          ),
          msg(
            "p5",
            "ao",
            "@Lines can you keep track of who’s bringing what?",
            44,
          ),
          msg(
            "p6",
            "lines",
            "On it. I made a little home for Saturday’s plan. Drinks and snacks are spoken for. Who’s taking ice?",
            44,
            true,
          ),
        ],
      },
      morning: {
        id: "morning",
        appStatus: "ready",
        items: [],
        orders: [],
        checkins: [],
        messages: [
          msg("m1", "nina", "I need a reason to stop snoozing my alarm ☀️", 31),
          msg(
            "m2",
            "maya",
            "Same. 7:30 club? One week. No heroic 5am nonsense.",
            32,
          ),
          msg(
            "m3",
            "ao",
            "I’m in. @Lines give us a morning check-in and a leaderboard?",
            33,
          ),
          msg(
            "m4",
            "lines",
            "Your little morning club is ready. Check in by 7:30am London time for a point. One check-in a day, on the honour system.",
            34,
            true,
          ),
        ],
      },
      boba: {
        id: "boba",
        appStatus: "ready",
        items: [],
        checkins: [],
        orders: [
          { member: "maya", drinkId: "matcha", sugar: "50%", ice: "Less ice" },
        ],
        messages: [
          msg(
            "b1",
            "leo",
            "Boba run? My brain has officially left the building 🧋",
            35,
          ),
          msg("b2", "nina", "Yes please. Something purple for me.", 36),
          msg(
            "b3",
            "ao",
            "@Lines put together an order sheet? Use the demo menu.",
            37,
          ),
          msg(
            "b4",
            "lines",
            "Three drinks, zero scrolling through everyone’s messages. Pick yours and I’ll keep the order together.",
            38,
            true,
          ),
        ],
      },
    },
  };
}
