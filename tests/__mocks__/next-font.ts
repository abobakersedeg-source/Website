// Test stub for `next/font/google` (see vitest.config.ts alias note).
// next/font is a compile-time transform inside the Next build; Vitest does
// not run it. We emulate its runtime contract: each font export is a
// function returning { variable, className } so components/layouts that
// consume font variables keep working in unit tests. Actual font delivery
// is verified at HTTP level against the production build instead.

interface FontResult {
  variable: string;
  className: string;
}

function fakeFont(options?: { variable?: string }): FontResult {
  return {
    variable: options?.variable ?? "--font-stub",
    className: "font-stub",
  };
}

export const Inter = fakeFont;
export const IBM_Plex_Sans_Arabic = fakeFont;

// Generic catch-all so future fonts don't break the suite unexpectedly.
const handler = {
  get(target: Record<string, unknown>, prop: string) {
    if (prop in target) return target[prop];
    if (typeof prop === "string" && /^[A-Z0-9_]+$/.test(prop)) {
      return fakeFont;
    }
    return undefined;
  },
};

export default new Proxy({ Inter, IBM_Plex_Sans_Arabic }, handler);
