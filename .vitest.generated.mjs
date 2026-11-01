import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
const dev = "/workspace/node_modules/next-intl/dist/esm/development";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"], setupFiles: ["tests/setup.ts"] },
  css: false, // layout imports globals.css; Tailwind v4 PostCSS plugin is incompatible with Vite's loader — CSS is not under test here (ADR-016)
  resolve: { alias: [
    { find: "@", replacement: path.resolve("/workspace", "src") },
    { find: /^next\/font\/google$/, replacement: "/workspace/tests/__mocks__/next-font.ts" },
    { find: /^next\/navigation$/, replacement: "/workspace/tests/__mocks__/next-navigation.ts" },
    { find: /^next\/headers$/, replacement: "/workspace/tests/__mocks__/next-headers.ts" },
    { find: /^next-intl$/, replacement: dev + "/index.react-server.js" },
    { find: /^next-intl\/server$/, replacement: dev + "/server.react-server.js" },
    { find: /^next-intl\/routing$/, replacement: dev + "/routing.js" },
    { find: /^next-intl\/config$/, replacement: dev + "/config.js" },
    { find: /^next-intl\/middleware$/, replacement: dev + "/middleware.js" },
    { find: /^next-intl\/navigation$/, replacement: dev + "/navigation.react-server.js" },
    { find: /^next-intl\/(.*)$/, replacement: dev + "/$1" },
  ]},
});
