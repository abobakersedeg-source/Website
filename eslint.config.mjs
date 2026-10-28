import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import golfCartLocal from "./eslint-rules/golf-cart-local.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Phase 02: RTL safety — physical-direction Tailwind utilities are banned in app code.
  // Justified exceptions must use {/* eslint-disable-next-line golf-cart-local/... */}
  // with a comment explaining why (third-party widget anchoring, non-directional layout).
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "golf-cart-local": golfCartLocal },
    rules: { "golf-cart-local/no-physical-direction-classes": "error" },
  },
  // Test fixtures may intentionally contain violations to prove the rule fires.
  {
    files: ["tests/fixtures/**"],
    rules: { "golf-cart-local/no-physical-direction-classes": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — machine output, not our code to lint.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
