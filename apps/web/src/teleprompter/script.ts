export type Speaker = "Moishi" | "Ao";
export type Section = {
  id: string;
  title: string;
  speaker: Speaker;
  start: number;
  end: number;
  text: string;
  cue: string;
};

export const TOTAL_SECONDS = 60;
export const DEFAULT_SCRIPT: Section[] = [
  { id: "intro", title: "Meet Line", speaker: "Moishi", start: 0, end: 9,
    text: "Your group chat has ideas.\n\nMeet Line. With Astra and Lovable, friends turn those ideas into shared apps.",
    cue: "Open warmly. Give “Meet Line” a little space." },
  { id: "party", title: "Plan together", speaker: "Moishi", start: 9, end: 24,
    text: "Planning a party? Tag Astra. It asks what you need, then brings a working app back to the chat. Everyone claims what they're bringing, and the plan comes together.",
    cue: "The party planner. Stay conversational." },
  { id: "morning", title: "A little competition", speaker: "Ao", start: 24, end: 36,
    text: "Trying to wake up earlier? Make it a competition. Friends check in each morning, build streaks, and keep each other going.",
    cue: "Your turn, Ao. A little energy on “competition”." },
  { id: "boba", title: "One shared order", speaker: "Ao", start: 36, end: 48,
    text: "Doing a boba run? Everyone picks their drink. One shared list keeps every order clear, so nobody has to scroll through the chat.",
    cue: "Keep going, Ao. Let the useful part land." },
  { id: "future", title: "What comes next", speaker: "Moishi", start: 48, end: 57,
    text: "Imagine trip planners, study challenges, neighbourhood guides. Software shaped by the people who use it, made together through conversation.",
    cue: "Back to Moishi. Open up the possibilities." },
  { id: "close", title: "The last line", speaker: "Ao", start: 57, end: 60,
    text: "Line. Build something together.",
    cue: "Ao closes. Finish by 59 seconds and hold." },
];

export const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);
export const clock = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, "0")}:${Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, "0")}`;
export function sectionAt(script: Section[], elapsed: number): Section {
  return script.find(section => elapsed < section.end) ?? script[script.length - 1];
}
export function nextHandoff(script: Section[], elapsed: number): Section | undefined {
  const current = sectionAt(script, elapsed);
  return script.find(section => section.start > elapsed && section.speaker !== current.speaker);
}
export function wordAt(section: Section, elapsed: number): number {
  // Leave a short breath at each entrance and a clean handoff at each end.
  const lead = section.id === "intro" ? 0.15 : 0.3;
  const tail = section.id === "close" ? 1 : 0.6;
  const progress = Math.max(0, Math.min(1, (elapsed - section.start - lead) / (section.end - section.start - lead - tail)));
  return Math.min(words(section.text).length - 1, Math.floor(progress * words(section.text).length));
}
export function restoreScript(raw: string | null): Section[] {
  try {
    const stored: unknown = JSON.parse(raw ?? "null");
    if (!Array.isArray(stored)) return DEFAULT_SCRIPT;
    return DEFAULT_SCRIPT.map(section => {
      const saved = stored.find(value => value?.id === section.id);
      return { ...section,
        text: typeof saved?.text === "string" && saved.text.trim() ? saved.text.slice(0, 5000) : section.text,
        speaker: saved?.speaker === "Moishi" || saved?.speaker === "Ao" ? saved.speaker : section.speaker,
      };
    });
  } catch { return DEFAULT_SCRIPT; }
}
