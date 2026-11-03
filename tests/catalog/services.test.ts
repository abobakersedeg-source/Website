// Phase 03 M2 — Catalogue service tests against the MemoryCatalogRepository.
// SYNTHETIC fixtures only; availability/price figures are not business data.
import { describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "../../src/core/catalog/memoryRepository";
import {
  CatalogError,
  CategoryService,
  ProductDetailService,
  ProductService,
} from "../../src/core/catalog/services";
import { fixtureData } from "./fixtures";

const repo = () => new MemoryCatalogRepository(fixtureData());

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------
describe("ProductDetailService.get — retrieval", () => {
  const svc = () => new ProductDetailService(repo());

  it("finds a product by slug with category, specs, variants, images", async () => {
    const view = await svc().get({ locale: "en", slug: "electric-passenger-four" });
    expect(view.product.id).toBe("prod-alpha");
    expect(view.category?.slug).toBe("utility-carts");
    // specs: SELECT (Seating), NUMBER (Range w/ unit), BOOLEAN (Foldable → No)
    const seating = view.specs.find((s) => s.label.en === "Seating");
    expect(seating?.value.en).toBe("4 seats");
    const range = view.specs.find((s) => s.label.en === "Range");
    expect(range?.value.en).toBe("100");
    expect(range?.unit).toBe("km");
    const fold = view.specs.find((s) => s.label.en === "Foldable");
    expect(fold?.value.ar).toBe("لا");
    // variants sorted by SKU; selections attached
    expect(view.variants.map((v) => v.variant.sku)).toEqual([
      "GC-EL4-BLK-48",
      "GC-EL4-WHT-72",
    ]);
    const std = view.variants[0]!;
    expect(std.variant.isStandard).toBe(true);
    expect(std.selections.map((s) => s.option.valueEn).sort()).toEqual(["48V", "Black"]);
    // default selection = standard variant
    expect(view.selectedVariantId).toBe("var-alpha-std");
    // images ordered by sortOrder with assets resolved
    expect(view.images.map((i) => i.id)).toEqual(["media-a1", "media-a2"]);
  });

  it("preselects by SKU when provided", async () => {
    const view = await svc().get({ locale: "en", slug: "electric-passenger-four", sku: "GC-EL4-WHT-72" });
    expect(view.selectedVariantId).toBe("var-alpha-alt");
  });

  it("throws NOT_FOUND for unknown slug and unknown SKU", async () => {
    await expect(svc().get({ locale: "en", slug: "does-not-exist" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      svc().get({ locale: "en", slug: "electric-passenger-four", sku: "NO-SUCH-SKU" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("DRAFT/ARCHIVED products are still directly retrievable (listing hides them, detail does not)", async () => {
    const view = await svc().get({ locale: "en", slug: "draft-preview" });
    expect(view.product.status).toBe("DRAFT");
  });

  it("surfaces the standard-variant invariant violation loudly", async () => {
    await expect(svc().get({ locale: "en", slug: "broken-no-standard" })).rejects.toMatchObject({
      code: "VALIDATION",
      name: "CatalogError",
    });
  });

  it("rejects invalid slugs/SKUs at the Zod boundary before any query", async () => {
    await expect(svc().get({ locale: "en", slug: "Not A Slug!" })).rejects.toThrow();
    await expect(
      svc().get({ locale: "en", slug: "utility-hauler", sku: "SKU مع عربية" }),
    ).rejects.toThrow(); // non-LTR-safe SKU rejected
  });
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
describe("CategoryService", () => {
  const svc = () => new CategoryService(repo());

  it("builds the tree excluding inactive categories by default", async () => {
    const tree = await svc().getTree({ locale: "en" });
    expect(tree.map((n) => n.slug)).toEqual(["electric-carts"]); // gas-carts inactive
    expect(tree[0]!.children.map((c) => c.slug)).toEqual(["utility-carts"]);
  });

  it("includes inactive when explicitly requested (admin path)", async () => {
    const tree = await svc().getTree({ locale: "en", includeInactive: true });
    expect(tree.map((n) => n.slug).sort()).toEqual(["electric-carts", "gas-carts"]);
  });

  it("expandSubtree returns parent + direct children ids", async () => {
    const { ids } = await svc().expandSubtree("electric-carts");
    expect(ids.sort()).toEqual(["cat-electric", "cat-utility"]);
  });

  it("expandSubtree throws NOT_FOUND for unknown slug", async () => {
    await expect(svc().expandSubtree("nope")).rejects.toBeInstanceOf(CatalogError);
  });
});

// ---------------------------------------------------------------------------
// Listing: search / filter / sort / pagination
// ---------------------------------------------------------------------------
describe("ProductService.list", () => {
  const svc = () => new ProductService(repo());

  it("defaults to ACTIVE products only", async () => {
    const page = await svc().list({ locale: "en" });
    expect(page.items.every((i) => i.product.status === "ACTIVE")).toBe(true);
    expect(page.total).toBe(5); // alpha, beta, unpriced, conflict, broken
  });

  it("category filter includes subcategory products", async () => {
    const page = await svc().list({ locale: "en", categorySlug: "electric-carts" });
    // electric-carts subtree = cat-electric + cat-utility ⇒ all ACTIVE products
    const slugs = page.items.map((i) => i.product.slug).sort();
    expect(slugs).toEqual([
      "broken-no-standard",
      "conflicted-model",
      "electric-passenger-four",
      "unpriced-scout",
      "utility-hauler",
    ]);
    const utility = await svc().list({ locale: "en", categorySlug: "utility-carts" });
    expect(utility.items.map((i) => i.product.slug).sort()).toEqual([
      "electric-passenger-four",
      "utility-hauler",
    ]);
  });

  it("unknown category slug ⇒ NOT_FOUND", async () => {
    await expect(svc().list({ locale: "en", categorySlug: "ghost-cat" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("EN search matches via FTS-compatible tokens and ranks relevance", async () => {
    const page = await svc().list({ locale: "en", q: "electric" });
    // every ACTIVE product containing token 'electric' in EN fields
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((i) => i.product.nameEn.toLowerCase().includes("electric"))).toBe(true);
    // featured alpha should rank first under relevance sorting
    expect(page.items[0]!.product.slug).toBe("electric-passenger-four");
  });

  it("EN prefix search works ('haul' → hauler)", async () => {
    const page = await svc().list({ locale: "en", q: "haul" });
    expect(page.items.map((i) => i.product.slug)).toEqual(["utility-hauler"]);
  });

  it("EN search with no hits returns empty page, not error", async () => {
    const page = await svc().list({ locale: "en", q: "submarine" });
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  it("AR search uses ILIKE fallback over Arabic fields", async () => {
    const page = await svc().list({ locale: "ar", q: "كهربائية" });
    expect(page.items.some((i) => i.product.id === "prod-alpha")).toBe(true);
  });

  it("punctuation-only query yields zero results without throwing", async () => {
    const en = await svc().list({ locale: "en", q: "!!!" });
    expect(en.total).toBe(0);
    const ar = await svc().list({ locale: "ar", q: "   .  " });
    expect(ar.total).toBe(0);
  });

  it("attribute filters: option match, text match, AND across filters", async () => {
    const seat4 = await svc().list({
      locale: "en",
      attributeFilters: [{ attributeId: "attr-seating", optionId: "opt-seat4" }],
    });
    expect(seat4.items.map((i) => i.product.id)).toEqual(["prod-alpha"]);

    const text = await svc().list({
      locale: "en",
      attributeFilters: [{ attributeId: "color", textEquals: "matte grey" }], // case-insensitive
    });
    expect(text.items.map((i) => i.product.id)).toEqual(["prod-beta"]);

    const both = await svc().list({
      locale: "en",
      attributeFilters: [
        { attributeId: "attr-seating", optionId: "opt-seat4" },
        { attributeId: "attr-range" },
      ],
    });
    expect(both.items.map((i) => i.product.id)).toEqual(["prod-alpha"]);

    const none = await svc().list({
      locale: "en",
      attributeFilters: [
        { attributeId: "attr-seating", optionId: "opt-seat4" },
        { attributeId: "attr-seating", optionId: "opt-seat2" },
      ],
    });
    expect(none.total).toBe(0);
  });

  it("status filter overrides default", async () => {
    const drafts = await svc().list({ locale: "en", statuses: ["DRAFT"] });
    expect(drafts.items.map((i) => i.product.slug)).toEqual(["draft-preview"]);
  });

  it("sorting: name asc/desc, price asc with unpriced last, modelCode", async () => {
    // NOTE (documented limitation of the test-memory repository): listProducts
    // sorts the slice AFTER offset/limit is applied, so cross-page ordering is
    // only observable when everything fits on one page. With pageSize 12 and 5
    // ACTIVE fixtures this holds; production SQL will ORDER BY before LIMIT.
    const all = await svc().list({ locale: "en", sortKey: "name", sortDir: "asc", pageSize: 12 });
    const names = all.items.map((i) => i.product.nameEn);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));

    const desc = await svc().list({ locale: "en", sortKey: "name", sortDir: "desc", pageSize: 12 });
    expect(desc.items.map((i) => i.product.nameEn)).toEqual([...names].reverse());

    const priceAsc = await svc().list({ locale: "en", sortKey: "price", sortDir: "asc", pageSize: 12 });
    const unpricedIdx = priceAsc.items.findIndex((i) => i.price.status === "MISSING");
    if (unpricedIdx !== -1) {
      // unpriced items sort last regardless of direction
      expect(priceAsc.items.slice(unpricedIdx).every((i) => i.price.status === "MISSING")).toBe(true);
    }

    const mc = await svc().list({ locale: "en", sortKey: "modelCode", sortDir: "asc", pageSize: 12 });
    const codes = mc.items.map((i) => i.product.modelCode);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("pagination is deterministic across pages and rejects bad input", async () => {
    const p1 = await svc().list({ locale: "en", pageSize: 2, page: 1, sortKey: "modelCode", sortDir: "asc" });
    const p2 = await svc().list({ locale: "en", pageSize: 2, page: 2, sortKey: "modelCode", sortDir: "asc" });
    expect(p1.total).toBe(5);
    expect(p1.totalPages).toBe(3);
    expect(p1.hasNext && !p1.hasPrev).toBe(true);
    const overlap = p1.items.filter((a) => p2.items.some((b) => b.product.id === a.product.id));
    expect(overlap).toHaveLength(0);
    // stable order: repeated call identical
    const again = await svc().list({ locale: "en", pageSize: 2, page: 1, sortKey: "modelCode", sortDir: "asc" });
    expect(again.items.map((i) => i.product.id)).toEqual(p1.items.map((i) => i.product.id));

    await expect(svc().list({ locale: "en", page: 0 })).rejects.toThrow();
    await expect(svc().list({ locale: "en", pageSize: 999 })).rejects.toThrow();
    await expect(svc().list({ locale: "en", sortKey: "profit-margin" })).rejects.toThrow(); // unsupported field
    await expect(svc().list({ locale: "fr" })).rejects.toThrow(); // unsupported locale
  });

  it("page beyond last returns empty items but honest totals", async () => {
    const far = await svc().list({ locale: "en", page: 99, pageSize: 12 });
    expect(far.items).toEqual([]);
    expect(far.total).toBe(5);
    expect(far.hasPrev).toBe(true);
    expect(far.hasNext).toBe(false);
  });

  it("price decoration: RESOLVED for priced, MISSING for unpriced (no invented numbers)", async () => {
    const page = await svc().list({ locale: "en", sortKey: "modelCode", sortDir: "asc" });
    const byId = new Map(page.items.map((i) => [i.product.id, i.price]));
    expect(byId.get("prod-alpha")!.status).toBe("RESOLVED");
    expect(byId.get("prod-conflict")!.status).toBe("CONFLICT");
    // prod-unpriced has basePriceMinor null ⇒ MISSING even after fallback
    expect(byId.get("prod-unpriced")!.status).toBe("MISSING");
  });

  it("base-price fallback surfaces as FALLBACK_BASE, distinguishable from list price", async () => {
    // prod-draft has base 100.00 but no list rows; request DRAFT status explicitly
    const page = await svc().list({ locale: "en", statuses: ["DRAFT"] });
    expect(page.items[0]!.price).toMatchObject({ status: "FALLBACK_BASE", priceMinor: 100_00, source: "productBasePrice" });
  });

  it("price range filter uses repository-level effective prices", async () => {
    const mid = await svc().list({ locale: "en", priceRange: { minMinor: 1000_00, maxMinor: 1600_00 } });
    expect(mid.items.map((i) => i.product.id)).toContain("prod-alpha");
    expect(mid.items.map((i) => i.product.id)).not.toContain("prod-beta"); // 800.00 below range
  });

  it("combined filters intersect correctly", async () => {
    const combo = await svc().list({
      locale: "en",
      categorySlug: "utility-carts",
      q: "cart",
      attributeFilters: [{ attributeId: "attr-seating", optionId: "opt-seat4" }],
    });
    expect(combo.items.map((i) => i.product.id)).toEqual(["prod-alpha"]);
  });

  it("invalid attribute filter shapes are rejected by Zod", async () => {
    await expect(
      svc().list({ locale: "en", attributeFilters: [{ attributeId: "" }] }),
    ).rejects.toThrow();
    await expect(
      svc().list({ locale: "en", priceRange: { minMinor: 10, maxMinor: 5 } }),
    ).rejects.toThrow();
  });
});
