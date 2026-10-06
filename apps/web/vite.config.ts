import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  envDir: "../..",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        rehearsal: fileURLToPath(new URL("./rehearsal.html", import.meta.url)),
        teleprompter: fileURLToPath(new URL("./teleprompter.html", import.meta.url)),
      },
    },
  },
});
