import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindcssPostcss from "@tailwindcss/postcss";

// Minimal compatible test setup for Phase 02 (ADR-016): Vitest + jsdom.
// Kept separate from next.config so `next build` is untouched.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    // ROOT CAUSE of the document-layout failure: Vitest 4 externalises
    // node_modules by default and loads those modules with NATIVE Node ESM,
    // which rejects next-intl's extensionless `import 'next/navigation'`
    // (Next 16 has no package `exports` map) BEFORE any resolve.alias can
    // apply — hence "Cannot find module ... Did you mean navigation.js?".
    // Processing next-intl through Vite instead makes the aliases below take
    // effect for its internal imports. Only this one dependency is inlined;
    // everything else keeps the fast externalised path.
    server: {
      deps: {
        inline: [/node_modules\/next-intl\//],
      },
    },
    // The layout under test imports the REAL `src/app/globals.css`. In Next's
    // own pipeline that CSS never reaches PostCSS (Turbopack handles Tailwind
    // natively), but Vitest/Vite does load it — and Vite 8's postcss-load-config
    // rejects the string-form plugin name in postcss.config.mjs ("Invalid
    // PostCSS Plugin found at: plugins[0]"). Rather than disabling CSS (which
    // still loads the config), we provide a TEST-ONLY inline PostCSS config
    // with the plugin loaded as an actual function. Production build config
    // (`postcss.config.mjs`, next.config.ts) remains untouched.
    css: {
      postcss: {
        plugins: [tailwindcssPostcss()],
      },
    },
  },
  resolve: {
    // Array form: supports regex `find` for EXACT specifier matching.
    // Plain-string aliases are prefix matches — using one for
    // "next/navigation" also rewrote next-intl's internal deep imports
    // (dist/.../next/navigation.js) to our stub and broke resolution.
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      // next/font is a build-time transform that only works inside the Next
      // pipeline; in unit tests we stub it (ADR-016). Document structure
      // (lang/dir/landmarks) is still exercised against the REAL layout.
      {
        find: /^next\/font\/google$/,
        replacement: path.resolve(__dirname, "tests/__mocks__/next-font.ts"),
      },
      // next-intl's SHARED navigation module (imported by BOTH the
      // react-server and react-client entries) statically imports the
      // extensionless specifier "next/navigation". Next 16 has no package
      // `exports` map, so Node/Vitest ESM resolution rejects the
      // directory-style request ("Did you mean next/navigation.js?"). We
      // alias the bare specifier to the REAL runtime module
      // (next/dist/client/components/navigation.js), which resolves via its
      // own CJS require. Behavioural stubbing stays at test level via
      // vi.mock("next/navigation") — no app logic is masked (ADR-016).
      {
        find: /^next\/navigation$/,
        replacement: path.resolve(
          __dirname,
          "node_modules/next/dist/client/components/navigation.js",
        ),
      },
      // Force the react-server build of next-intl's navigation helpers in
      // tests (identical to how Next.js renders server components). The
      // client build imports "next/navigation" extensionlessly and breaks
      // under Vitest's Node ESM resolution.
      {
        find: /^next-intl\/navigation$/,
        replacement: path.resolve(
          __dirname,
          "node_modules/next-intl/dist/esm/development/navigation.react-server.js",
        ),
      },
    ],
  },
});
