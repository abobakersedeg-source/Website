// Phase 03 M2 — Search semantics unit tests.
import { describe, expect, it } from "vitest";
import { matchesProductAr, queryTokens, scoreProductEn, tokenizeSimple } from "../../src/core/catalog/search";
import { fixtureData } from "./fixtures";
import type { ProductRecord } from "../../src/core/catalog/types";

const products = new Map(fixtureData().products!.map((p) => [p.id, p]));
const alpha = products.get("prod-alpha")!;
const beta = products.get("prod-beta")!;

describe("tokenizeSimple / queryTokens", () => {
  it("lowercases and splits on non-alphanumerics (Unicode aware)", () => {
    expect(tokenizeSimple("Road-Ready ELECTRIC cart!")).toEqual(["road", "ready", "electric", "cart"]);
  });
  it("deduplicates query tokens", () => {
    expect(queryTokens("electric electric CART")).toEqual(["electric", "cart"]);
  });
  it("strips punctuation-only and empty queries to no tokens", () => {
    expect(queryTokens("   !!!   ")).toEqual([]);
    expect(queryTokens("")).toEqual([]);
  });
});

describe("scoreProductEn — FTS 'simple' compatible semantics", () => {
  it("exact token match scores higher than prefix match", () => {
    const exact = scoreProductEn(alpha, queryTokens("electric"));
    const prefix = scoreProductEn(alpha, queryTokens("electr")); // prefix of "electric"
    expect(exact).toBeGreaterThan(0);
    expect(prefix).toBeGreaterThan(0);
    expect(exact).toBeGreaterThan(prefix);
  });

  it("prefix matching works (to_tsquery word:* emulation)", () => {
    expect(scoreProductEn(beta, queryTokens("haul"))).toBeGreaterThan(0); // "hauler"
  });

  it("AND semantics: one unmatched token zeroes the score", () => {
    expect(scoreProductEn(alpha, queryTokens("electric submarine"))).toBe(0);
  });

  it("field weighting: name beats description for the same token", () => {
    // "four" appears in both name (A-weight) and description (C-weight)
    const s = scoreProductEn(alpha, ["four"]);
    expect(s).toBeGreaterThan(0);
    // a token only present in description should score lower than one in name
    const nameOnly = scoreProductEn(alpha, ["passenger"]);
    const descOnly = scoreProductEn(alpha, ["road"]); // "road-ready" is description-only
    expect(nameOnly).toBeGreaterThan(descOnly);
    expect(descOnly).toBeGreaterThan(0);
  });

  it("no tokens ⇒ no score", () => {
    expect(scoreProductEn(alpha, [])).toBe(0);
  });

  it("case-insensitive", () => {
    expect(scoreProductEn(alpha, queryTokens("ELECTRIC"))).toBe(scoreProductEn(alpha, queryTokens("electric")));
  });
});

describe("matchesProductAr — ILIKE fallback", () => {
  it("substring match over nameAr", () => {
    expect(matchesProductAr(alpha, "كهربائية")).toBe(true);
  });
  it("matches shortDescAr when nameAr does not contain the needle", () => {
    expect(matchesProductAr(beta, "شحن")).toBe(true); // only in shortDescAr
  });
  it("is case-insensitive-ish for Latin fragments embedded in Arabic text", () => {
    const withLatin: ProductRecord = { ...alpha, nameAr: "طراز GC-EL4 الكهربائي" };
    expect(matchesProductAr(withLatin, "gc-el4")).toBe(true);
  });
  it("empty/whitespace query never matches", () => {
    expect(matchesProductAr(alpha, "   ")).toBe(false);
    expect(matchesProductAr(alpha, "")).toBe(false);
  });
  it("null Arabic fields are skipped safely", () => {
    const unpriced = products.get("prod-unpriced")!;
    expect(matchesProductAr(unpriced, "عربة")).toBe(true); // nameAr present
    const sparse: ProductRecord = { ...unpriced, nameAr: "", shortDescAr: null, descriptionAr: null };
    expect(matchesProductAr(sparse, "abc")).toBe(false);
  });
  it("documented limitation: no diacritic normalisation (fake test would be dishonest)", () => {
    // Tashkeel-different forms do NOT match under plain substring fallback.
    expect(matchesProductAr(alpha, "كَهْرَبَائِيَّة")).toBe(false);
  });
});
