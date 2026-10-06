import { readFile } from "node:fs/promises";
import type { Scenario } from "@group-dots/protocol";

export function readPrompt(name: "agent" | Scenario): Promise<string> {
  return readFile(new URL(import.meta.resolve(`@group-dots/prompts/${name}.md`)), "utf8");
}
