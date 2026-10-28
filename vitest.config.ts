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
      // next-intl's CLIENT navigation entry imports "next/navigation", which
      // fails to resolve under Vitest on Next 16 (extensionless subpath import:
      // Node suggests "next/navigation.js"). Tests run the SERVER condition
      // (react-server exports never touch next/navigation), and we stub the
      // client entry as a fallback so the REAL layout tree renders (ADR-016).
      "next/navigation": path.resolve(__dirname, "tests/__mocks__/next-navigation.ts"),
      // Force the react-server build of next-intl's navigation helpers in
      // tests (identical to how Next.js renders server components). The
      // client build imports "next/navigation" extensionlessly and breaks
      // under Vitest's Node ESM resolution.
      "next-intl/navigation": path.resolve(
        __dirname,
        "node_modules/next-intl/dist/esm/development/navigation.react-server.js",
      ),
    },
  },
});
