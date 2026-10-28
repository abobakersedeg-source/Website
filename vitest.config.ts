import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Minimal compatible test setup for Phase 02 (ADR-016): Vitest + jsdom.
// Kept separate from next.config so `next build` is untouched.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // next/font is a build-time transform that only works inside the Next
      // pipeline; in unit tests we stub it (ADR-016). Document structure
      // (lang/dir/landmarks) is still exercised against the REAL layout.
      "next/font/google": path.resolve(__dirname, "tests/__mocks__/next-font.ts"),
    },
  },
});
