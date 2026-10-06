import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  envDir: "../..",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        rehearsal: fileURLToPath(new URL("./rehearsal.html", import.meta.url)),
      },
    },
  },
});
