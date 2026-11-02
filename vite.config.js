import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), {
    name: "preview-social-image",
    transformIndexHtml(html) {
      // Preview metadata must load the new asset from this deploy, not production.
      const preview = process.env.CONTEXT === "deploy-preview" && process.env.DEPLOY_PRIME_URL;
      return preview ? html.replaceAll(
        "https://thepittzstop.com/images/pittzstop-social-roadtrip.jpg",
        new URL("/images/pittzstop-social-roadtrip.jpg", preview).href
      ) : html;
    },
  }],
  resolve: { alias: [{ find: /^@multiversx\/sdk-core$/, replacement: new URL("./src/features/oox/sdk-core-browser.js", import.meta.url).pathname }] },

  define: {
    global: "globalThis",
  },
});
