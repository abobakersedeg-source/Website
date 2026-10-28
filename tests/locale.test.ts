import { describe, it, expect } from "vitest";
import { negotiateLocale } from "@/i18n/locale";

// Accept-Language negotiation policy (docs/ARCHITECTURE.md §i18n):
//   * RFC 9110 parsing: implicit q=1, explicit q values, whitespace tolerant.
//   * Candidates sorted by DESCENDING q; stable for ties (header order wins).
//   * Language-subtag lookup against supported locales ["en","ar"].
//   * Default locale ("en") when nothing matches or input is garbage.
//
// NOTE on the historical failure: "@formatjs/intl-localematcher" was dropped
// because Node 20's Intl.Locale ICU build rejects bare subtags like "ar"
// (RangeError), which made every Arabic candidate silently fall back to "en".
// The implementation in src/i18n/locale.ts is a dependency-free lookup.

describe("negotiateLocale (Accept-Language -> locale)", () => {
  it("defaults to English with no header", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
  });

  it("matches Arabic region variants (ar-AE, ar-SA, ar)", () => {
    expect(negotiateLocale("ar-AE")).toBe("ar");
    expect(negotiateLocale("ar-SA,ar;q=0.9")).toBe("ar");
    expect(negotiateLocale("ar")).toBe("ar");
  });

  it("honours explicit quality weights over implicit ones", () => {
    // NOTE: per RFC 9110 an unweighted entry carries implicit q=1, so a bare
    // "en-US" in the list OUTRANKS an explicit "ar-AE;q=0.9". The original
    // Phase-02 assertion expected "ar" for that header — it was wrong on two
    // counts (RFC semantics AND the fact en-US would win even under the old
    // buggy parser). Correct behaviour asserted below.
    expect(negotiateLocale("ar-AE;q=0.9,en-US;q=0.5,en;q=0.5")).toBe("ar");
    // Implicit q=1 beats explicit lower weights regardless of position:
    expect(negotiateLocale("ar-AE;q=0.9,en-US,en;q=0.5")).toBe("en");
    // Tolerates sloppy spacing around ';' as sent by some clients.
    expect(negotiateLocale("ar-AE; q=0.9, en-US; q=0.5")).toBe("ar");
  });

  it("applies RFC 9110 precedence: higher weight wins regardless of position", () => {
    // A later entry with an explicit HIGHER q outranks an earlier lower-q one.
    expect(negotiateLocale("en;q=0.3,ar;q=0.7")).toBe("ar");
    // Implicit q=1 always beats any explicit q<1.
    expect(negotiateLocale("ar;q=0.5,en-US")).toBe("en");
    expect(negotiateLocale("en-US,en;q=0.5,ar-AE;q=0.9")).toBe("en");
  });

  it("first-wins at equal effective preference (stable ties)", () => {
    expect(negotiateLocale("ar,en;q=0.9")).toBe("ar"); // ar implicit 1 > en .9
    expect(negotiateLocale("en,ar;q=1.0")).toBe("en"); // tie at 1.0 -> header order
    expect(negotiateLocale("ar;q=0.8,en;q=0.8")).toBe("ar"); // tie -> first listed
    expect(negotiateLocale("en;q=0.8,ar;q=0.8")).toBe("en"); // tie -> first listed
  });

  it("handles whitespace and case variations", () => {
    expect(negotiateLocale(" AR-AE ; Q = 0.9 , en-US ; q = 0.5 ")).toBe("ar");
    expect(negotiateLocale("ar-ae")).toBe("ar"); // lowercase tags
    expect(negotiateLocale("AR")).toBe("ar"); // uppercase language subtag
  });

  it("drops entries with missing or invalid quality values", () => {
    // Malformed q parameter ("q=" without digits) -> whole entry dropped.
    expect(negotiateLocale("ar;q=,en")).toBe("en");
    // Garbage q value -> entry dropped entirely; next valid entry wins.
    expect(negotiateLocale("ar;q=abc,en")).toBe("en");
    // Out-of-range q (>1) is invalid RFC syntax -> entry dropped.
    expect(negotiateLocale("ar;q=1.5,en")).toBe("en");
    // q=0 means "not acceptable" -> entry dropped (RFC 9110 §12.4.2).
    expect(negotiateLocale("ar;q=0,en")).toBe("en");
    // If ALL entries are invalid, fall back to default.
    expect(negotiateLocale("ar;q=xyz")).toBe("en");
  });

  it("falls back to default for unsupported languages", () => {
    expect(negotiateLocale("fr-FR")).toBe("en");
    expect(negotiateLocale("de,hi;q=0.8")).toBe("en");
  });

  it("treats wildcard '*' as acceptance of the default locale", () => {
    expect(negotiateLocale("*")).toBe("en");
    // "*" expands to default "en" at its declared weight; ties keep header order.
    expect(negotiateLocale("*,ar;q=0.8")).toBe("en");
    expect(negotiateLocale("ar,*;q=0.5")).toBe("ar");
  });

  it("survives garbage input without throwing", () => {
    expect(() => negotiateLocale(",,,,")).not.toThrow();
    expect(() => negotiateLocale("not a language tag!!")).not.toThrow();
    expect(negotiateLocale(",,,,")).toBe("en");
    expect(negotiateLocale(";q=0.9")).toBe("en");
  });
});
