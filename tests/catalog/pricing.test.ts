// Phase 03 M2 — Price resolution unit tests (refinement #4).
// All data is synthetic fixture scaffolding; nothing here represents real
// commercial pricing.
import { describe, expect, it } from "vitest";
import { applyBaseFallback, resolvePrice } from "../../src/core/catalog/pricing";
import { NOW, fixtureData } from "./fixtures";
import type { PriceListContext } from "../../src/core/catalog/pricing";

function ctx(overrides: Partial<PriceListContext> = {}): PriceListContext {
  const f = fixtureData();
  return {
    lists: f.priceLists!,
    items: f.priceItems!,
    basePriceMinor: null,
    baseCurrency: "AED",
    ...overrides,
  };
}

describe("resolvePrice — list selection", () => {
  it("uses the single active default list", () => {
    const res = resolvePrice(
      { productId: "prod-alpha", variantId: "var-alpha-std", currency: "AED", at: NOW },
      ctx(),
    );
    expect(res.status).toBe("RESOLVED");
    if (res.status === "RESOLVED") {
      expect(res.priceMinor).toBe(1200_00);
      expect(res.priceListCode).toBe("RETAIL");
      expect(res.source).toBe("priceListItem");
    }
  });

  it("ignores rows on inactive lists (dealer row must not win)", () => {
    const res = resolvePrice(
      { productId: "prod-alpha", variantId: "var-alpha-std", currency: "AED", at: NOW },
      ctx(),
    );
    expect(res.status === "RESOLVED" && res.priceMinor).not.toBe(900_00);
  });

  it("returns MISSING/NO_ACTIVE_LIST when no active default exists", () => {
    const res = resolvePrice(
      { productId: "prod-alpha", variantId: "var-alpha-std", currency: "AED", at: NOW },
      ctx({ lists: [] }),
    );
    expect(res).toEqual({ status: "MISSING", reason: "NO_ACTIVE_LIST" });
  });

  it("honours an explicit listCode even for non-default lists when active", () => {
    const lists = fixtureData().priceLists!.map((l) =>
      l.code === "DEALER" ? { ...l, isActive: true } : l,
    );
    const res = resolvePrice(
      { productId: "prod-alpha", variantId: "var-alpha-std", currency: "AED", at: NOW, listCode: "DEALER" },
      ctx({ lists }),
    );
    expect(res.status === "RESOLVED" && res.priceMinor).toBe(900_00);
  });
});

describe("resolvePrice — specificity & validity", () => {
  it("variant-specific row beats product-generic row", () => {
    // prod-beta has only a generic row; prod-alpha std has a variant row.
    const beta = resolvePrice(
      { productId: "prod-beta", variantId: "var-beta-std", currency: "AED", at: NOW },
      ctx(),
    );
    expect(beta.status === "RESOLVED" && beta.priceMinor).toBe(800_00);

    const alpha = resolvePrice(
      { productId: "prod-alpha", variantId: "var-alpha-alt", currency: "AED", at: NOW },
      ctx(),
    );
    expect(alpha.status === "RESOLVED" && alpha.priceMinor).toBe(1500_00);
  });

  it("expired rows do not resolve (validFrom ≤ at < validTo)", () => {
    const res = resolvePrice(
      { productId: "prod-unpriced", variantId: "var-unpriced-std", currency: "AED", at: NOW },
      ctx(),
    );
    expect(res).toEqual({ status: "MISSING", reason: "NO_ROWS_FOR_TARGET" });
  });

  it("a row resolves exactly at its validFrom instant", () => {
    const lists = [
      { id: "pl-x", code: "X", nameEn: "X", nameAr: "X", currency: "AED", isDefault: true, isActive: true, validFrom: new Date("2026-01-01T00:00:00Z"), validTo: null },
    ];
    const items = [
      { id: "pli-x", priceListId: "pl-x", productId: "p", variantId: null, priceMinor: 100, compareAtMinor: null, currency: "AED", validFrom: NOW, validTo: null },
    ];
    const res = resolvePrice({ productId: "p", currency: "AED", at: NOW }, { lists, items, basePriceMinor: null, baseCurrency: "AED" });
    expect(res.status === "RESOLVED" && res.priceMinor).toBe(100);
  });

  it("currency mismatch returns CURRENCY_MISMATCH, never converts silently", () => {
    const res = resolvePrice(
      { productId: "prod-alpha", variantId: "var-alpha-std", currency: "SAR", at: NOW },
      ctx(),
    );
    expect(res).toEqual({ status: "MISSING", reason: "CURRENCY_MISMATCH" });
  });

  it("conflicting same-specificity rows yield CONFLICT with candidate ids", () => {
    const res = resolvePrice(
      { productId: "prod-conflict", variantId: "var-conflict-std", currency: "AED", at: NOW },
      ctx(),
    );
    expect(res.status).toBe("CONFLICT");
    if (res.status === "CONFLICT") {
      expect(res.reason).toBe("OVERLAPPING_ROWS");
      expect(res.candidateIds.sort()).toEqual(["pli-c-1", "pli-c-2"]);
    }
  });
});

describe("applyBaseFallback — documented fallback only", () => {
  it("falls back to basePriceMinor when currency matches", () => {
    const res = applyBaseFallback(ctx({ basePriceMinor: 999_00, baseCurrency: "AED" }), "AED");
    expect(res).toEqual({ status: "FALLBACK_BASE", priceMinor: 999_00, currency: "AED", source: "productBasePrice" });
  });

  it("never invents a price when base is null", () => {
    const res = applyBaseFallback(ctx({ basePriceMinor: null }), "AED");
    expect(res).toEqual({ status: "MISSING", reason: "CURRENCY_MISMATCH" });
  });

  it("never mixes currencies in the fallback", () => {
    const res = applyBaseFallback(ctx({ basePriceMinor: 999_00, baseCurrency: "AED" }), "SAR");
    expect(res).toEqual({ status: "MISSING", reason: "CURRENCY_MISMATCH" });
  });
});
