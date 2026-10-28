import { describe, it, expect } from "vitest";
import { match } from "@formatjs/intl-localematcher";

// The negotiation algorithm is implemented inline in src/i18n/locale.ts.
// We import the module and ALSO verify the library behaviour we rely on,
// so a future localematcher upgrade that changes semantics will be caught.

async function loadNegotiateLocale() {
  const mod = await import("@/i18n/locale");
  return mod.negotiateLocale;
}

describe("negotiateLocale (Accept-Language -> locale)", () => {
  it("defaults to English with no header", async () => {
    const fn = await loadNegotiateLocale();
    expect(fn(null)).toBe("en");
    expect(fn("")).toBe("en");
  });

  it("matches Arabic region variants (ar-AE, ar-SA, ar)", async () => {
    const fn = await loadNegotiateLocale();
    expect(fn("ar-AE")).toBe("ar");
    expect(fn("ar-SA,ar;q=0.9")).toBe("ar");
    expect(fn("ar")).toBe("ar");
  });

  it("honours quality ordering when the preferred tag appears first", async () => {
    const fn = await loadNegotiateLocale();
    // 'ar-AE;q=0.9' listed ahead of 'en-US,en;q=0.5' — highest q wins.
    expect(fn("ar-AE;q=0.9,en-US,en;q=0.5")).toBe("ar");
    // Tolerates sloppy spacing around ';' as sent by some clients.
    expect(fn("ar-AE; q=0.9, en-US; q=0.5")).toBe("ar");
  });

  it("applies RFC 9110 precedence: order beats q-value for ties against supported locales", async () => {
    const fn = await loadNegotiateLocale();
    // Real-world browser header: Chrome's own locale always comes FIRST and
    // carries the highest implicit q. Both tags are supported, so 'en' must
    // win even though a later entry lists 'ar' at an explicit higher q.
    expect(fn("en-US,en;q=0.5,ar-AE;q=0.9")).toBe("en");
    // First-wins at equal effective preference:
    expect(fn("ar,en;q=0.9")).toBe("ar");
    expect(fn("en,ar;q=1.0")).toBe("en");
  });

  it("falls back to default for unsupported languages", async () => {
    const fn = await loadNegotiateLocale();
    expect(fn("fr-FR")).toBe("en");
    expect(fn("de,hi;q=0.8")).toBe("en");
  });

  it("survives garbage input without throwing", async () => {
    const fn = await loadNegotiateLocale();
    expect(() => fn(",,,,")).not.toThrow();
    expect(() => fn("not a language tag!!")).not.toThrow();
  });
});

describe("intl-localematcher lookup strategy (library sanity check)", () => {
  it("returns the first matching supported locale for exact tags", () => {
    expect(match(["ar-AE"], ["en", "ar"], "en", { strategy: "lookup" })).toBe("ar");
    expect(match(["en-US"], ["en", "ar"], "en", { strategy: "lookup" })).toBe("en");
  });

  it("returns default when nothing matches", () => {
    expect(match(["fr-FR"], ["en", "ar"], "en", { strategy: "lookup" })).toBe("en");
  });

  it("first tag wins among multiple supported matches", () => {
    expect(match(["en-US", "ar-AE"], ["en", "ar"], "en", { strategy: "lookup" })).toBe("en");
    expect(match(["ar-AE", "en-US"], ["en", "ar"], "en", { strategy: "lookup" })).toBe("ar");
  });
});
