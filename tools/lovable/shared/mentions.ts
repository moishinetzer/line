import type { Command } from "./protocol";

// A standalone chat mention, not part of an email, URL or another handle.
// Keep matching, highlighting and the server wake gate consistent.
const AGENT_MENTION =
  /(?<![\p{L}\p{N}_@./:+-])@lines(?![\p{L}\p{N}_@-]|\.[\p{L}\p{N}_])/giu;

export function agentMentions(text: string) {
  return Array.from(text.matchAll(AGENT_MENTION), (match) => ({
    start: match.index!,
    end: match.index! + match[0].length,
    text: match[0],
  }));
}

export function mentionedAgentIds(text: string): "lines"[] {
  return agentMentions(text).length ? ["lines"] : [];
}

export function shouldWakeAgent(command: Command): boolean {
  return (
    command.type === "message.send" && agentMentions(command.text).length > 0
  );
}

export function agentTask(text: string): string {
  return text
    .replace(AGENT_MENTION, "")
    .replace(/^[\s,.:;!?]+|[\s,.:;!?]+$/g, "")
    .trim();
}

export function mentionQuery(text: string, caret: number) {
  const before = text.slice(0, caret);
  const match = before.match(/(?<![\p{L}\p{N}_@./:+-])@([\p{L}\p{N}_]*)$/u);
  if (!match || !"lines".startsWith(match[1].toLowerCase())) return null;
  // Do not replace a prefix inside an existing unrelated handle.
  if (/^[\p{L}\p{N}_@-]/u.test(text.slice(caret))) return null;
  return { start: match.index!, end: caret };
}

export function messageParts(text: string) {
  const parts: { text: string; mention: boolean }[] = [];
  let cursor = 0;
  for (const match of agentMentions(text)) {
    if (match.start > cursor)
      parts.push({ text: text.slice(cursor, match.start), mention: false });
    parts.push({ text: match.text, mention: true });
    cursor = match.end;
  }
  if (cursor < text.length)
    parts.push({ text: text.slice(cursor), mention: false });
  return parts;
}
