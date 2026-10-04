import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /^@multiversx\/sdk-core$/, replacement: new URL("./src/features/oox/sdk-core-browser.js", import.meta.url).pathname }] },

  define: {
    global: "globalThis",
  },
});
