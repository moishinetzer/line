import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { BuildSchema, type Build } from "@group-dots/protocol";

// Only live build receipts persist. Chat and standalone app data remain separate.
export async function buildJournal(directory: string) {
  const path = join(directory, "build-jobs.json");
  const schema = z.record(z.string(), z.array(BuildSchema));
  let saved: Record<string, Build[]> = {};
  try { saved = schema.parse(JSON.parse(await readFile(path, "utf8"))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Cannot read ${path}; preserve and inspect it before creating more projects.`);
  }
  for (const builds of Object.values(saved)) for (const build of builds) {
    if (build.status === "building") {
      build.status = build.projectId ? "checking" : "failed";
      build.error = build.projectId ? undefined : "The server stopped during creation. Inspect Lovable before resetting this job.";
    }
  }
  let writes = Promise.resolve();
  return {
    get: (roomId: string): Build[] => saved[roomId] ?? [],
    save: (roomId: string, builds: Build[]) => {
      saved[roomId] = builds.filter((build) => !build.mocked).map((build) => ({ ...build }));
      const contents = JSON.stringify(saved, null, 2);
      writes = writes.then(async () => {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(`${path}.tmp`, contents, { mode: 0o600 });
        await rename(`${path}.tmp`, path);
      });
      return writes;
    },
  };
}
