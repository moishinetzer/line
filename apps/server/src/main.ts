import { readConfig } from "./config.ts";
import { startServer } from "./server.ts";

const config = readConfig();
const server = await startServer(config);
console.log(`Group Dots: http://localhost:${server.port} | ws://localhost:${server.port}/ws`);
console.log(`Agent: ${config.agentMode}${config.agentMode === "astra" ? ` (${config.model})` : " (scripted)"} | Lovable: ${config.lovableMode}`);
if (config.lovableMode === "mcp") console.log(`Lovable login: http://localhost:${server.port}/auth/lovable`);

let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    void server.close().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
  });
}
