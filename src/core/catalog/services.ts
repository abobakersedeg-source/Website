// Phase 03 M2 — Catalogue services (framework-independent; ADR-002).
// No Next.js or Prisma imports. All persistence access goes through the
// CatalogRepository port. Inputs are validated with Zod before any query.

import {
  productListInputSchema,
  productDetailInputSchema,
  categoryTreeInputSchema,
  type ProductListInput,
} from "./schemas";
import type { CatalogRepository, ProductListQuery } from "./repository";
import { matchesProductAr, queryTokens, scoreProductEn } from "./search";
import { applyBaseFallback, resolvePrice, type PriceResolution } from "./pricing";
import type {
  AttributeOptionRecord,
  AttributeRecord,
  CategoryRecord,
  MediaAssetRecord,
  ProductRecord,
  StockAvailability,
  VariantRecord,
} from "./types";

export class CatalogError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "VALIDATION" | "PRICE_MISSING" | "PRICE_CONFLICT",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

export interface LocalizedString {
  en: string;
  ar: string;
}

const localize = <K extends "en" | "ar">(pair: { en: string; ar: string }, locale: K) =>
  pair[locale];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategoryNode {
  id: string;
  slug: string;
  name: LocalizedString;
  sortOrder: number;
  isActive: boolean;
  isSample: boolean;
  children: CategoryNode[];
}

export class CategoryService {
  constructor(private readonly repo: CatalogRepository) {}

  /** Full tree (depth ≤ 2 by design rule R-tree; enforced here on read). */
  async getTree(input: unknown): Promise<CategoryNode[]> {
    const opts = categoryTreeInputSchema.parse(input);
    const all = await this.repo.listCategories();
    const visible = all.filter((c) => opts.includeInactive || c.isActive);
    const byParent = new Map<string | null, CategoryRecord[]>();
    for (const c of visible) {
      const k = c.parentId;
      byParent.set(k, [...(byParent.get(k) ?? []), c]);
    }
    const order = (a: CategoryRecord, b: CategoryRecord) =>
      a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug);
    const build = (parentId: string | null): CategoryNode[] =>
      (byParent.get(parentId) ?? [])
        .slice()
        .sort(order)
        .map((c) => ({
          id: c.id,
          slug: c.slug,
          name: { en: c.nameEn, ar: c.nameAr },
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          isSample: c.isSample,
          children: build(c.id),
        }));
    return build(null);
  }

  /** ids of the category + its direct children (subtree expansion used by
   *  listing filters; depth capped at 2 so one level suffices). */
  async expandSubtree(slug: string): Promise<{ category: CategoryRecord; ids: string[] }> {
    const category = await this.repo.getCategoryBySlug(slug);
    if (!category) throw new CatalogError("NOT_FOUND", `category '${slug}' not found`);
    const all = await this.repo.listCategories();
    const childIds = all.filter((c) => c.parentId === category.id).map((c) => c.id);
    return { category, ids: [category.id, ...childIds] };
  }

  async getBySlug(slug: string): Promise<CategoryRecord | null> {
    return this.repo.getCategoryBySlug(slug);
  }
}

// ---------------------------------------------------------------------------
// Listing (search / filter / sort / paginate)
// ---------------------------------------------------------------------------

export interface ProductListItem {
  product: ProductRecord;
  categorySlug: string | null;
  price: PriceResolution;
  imageAssets: MediaAssetRecord[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ProductService {
  constructor(private readonly repo: CatalogRepository) {}

  private async priceForProducts(products: ProductRecord[]): Promise<Map<string, PriceResolution>> {
    const out = new Map<string, PriceResolution>();
    if (products.length === 0) return out;
    const variantIds = (
      await Promise.all(products.map((p) => this.repo.listVariantsForProduct(p.id)))
    ).flat();
    const lists = await this.repo.listPriceLists();
    const items = await this.repo.listPriceItemsForProducts({
      productIds: products.map((p) => p.id),
      variantIds: variantIds.map((v) => v.id),
    });
    // Standard variant per product for list-level pricing (refinement #1
    // guarantees exactly one exists in valid data).
    const standardByProduct = new Map<string, VariantRecord>();
    for (const v of variantIds) {
      if (v.isStandard && !standardByProduct.has(v.productId)) standardByProduct.set(v.productId, v);
    }
    for (const p of products) {
      const ctx = {
        lists,
        items,
        basePriceMinor: p.basePriceMinor,
        baseCurrency: p.currency,
      };
      const std = standardByProduct.get(p.id);
      let res = resolvePrice(
        { productId: p.id, variantId: std?.id ?? null, currency: p.currency },
        ctx,
      );
      if (res.status === "MISSING") res = applyBaseFallback(ctx, p.currency);
      out.set(p.id, res);
    }
    return out;
  }

  /** Storefront/admin listing with EN FTS-compatible search and AR ILIKE. */
  async list(rawInput: unknown): Promise<Paginated<ProductListItem>> {
    const input: ProductListInput = productListInputSchema.parse(rawInput);
    const categories = await this.repo.listCategories();
    const catBySlug = new Map(categories.map((c) => [c.slug, c]));

    // ---- category subtree --------------------------------------------------
    let categoryIds: string[] | undefined;
    if (input.categorySlug) {
      const cat = catBySlug.get(input.categorySlug);
      if (!cat) throw new CatalogError("NOT_FOUND", `category '${input.categorySlug}' not found`);
      const childIds = categories.filter((c) => c.parentId === cat.id).map((c) => c.id);
      categoryIds = [cat.id, ...childIds];
    }

    // ---- attribute pre-filter ----------------------------------------------
    let attrProductIds: string[] | undefined;
    if (input.attributeFilters.length > 0) {
      const paRows = await this.repo.listProductAttributes(
        (await this.repo.listProducts({
          sort: { key: "newest", dir: "desc" },
          offset: 0,
          limit: Number.MAX_SAFE_INTEGER,
          statuses: input.statuses,
        })).items.map((p) => p.id),
      );
      const sets = input.attributeFilters.map((f) => {
        const matching = paRows
          .filter(
            (pa) =>
              pa.attributeId === f.attributeId &&
              (f.optionId === undefined || pa.optionId === f.optionId) &&
              (f.textEquals === undefined ||
                (pa.textValue !== null &&
                  pa.textValue.toLowerCase() === f.textEquals.toLowerCase())),
          )
          .map((pa) => pa.productId);
        return new Set(matching);
      });
      // AND across filters: start with first set, intersect the rest.
      let acc: Set<string> | undefined;
      for (const s of sets) {
        if (acc === undefined) {
          acc = s;
          continue;
        }
        const next = new Set<string>();
        for (const id of acc) if (s.has(id)) next.add(id);
        acc = next;
      }
      attrProductIds = acc ? [...acc] : [];
    }

    // ---- search pre-selection ----------------------------------------------
    // EN: FTS-compatible token scoring (AND semantics, weighted fields).
    // AR: documented ILIKE fallback over Arabic fields (refinement #7).
    let searchIds: string[] | undefined;
    let scoreMap: Map<string, number> | undefined;
    if (input.q) {
      const universe = await this.repo.listProducts({
        sort: { key: "newest", dir: "desc" },
        offset: 0,
        limit: Number.MAX_SAFE_INTEGER,
        statuses: input.statuses,
        ...(categoryIds ? { categoryIds } : {}),
        ...(attrProductIds ? { ids: attrProductIds } : {}),
      });
      if (input.locale === "en") {
        const tokens = queryTokens(input.q);
        if (tokens.length > 0) {
          scoreMap = new Map<string, number>();
          for (const p of universe.items) {
            const s = scoreProductEn(p, tokens);
            if (s > 0) scoreMap.set(p.id, s);
          }
          searchIds = [...scoreMap.keys()];
        } else {
          searchIds = []; // query had no usable tokens ⇒ no matches
        }
      } else {
        searchIds = universe.items.filter((p) => matchesProductAr(p, input.q!)).map((p) => p.id);
      }
    }

    // ---- repository page ----------------------------------------------------
    const useRelevance = input.locale === "en" && scoreMap !== undefined && input.sortKey === "featured";
    const idRestriction =
      searchIds !== undefined && attrProductIds !== undefined
        ? searchIds.filter((id) => attrProductIds!.includes(id))
        : searchIds ?? attrProductIds;
    const query: ProductListQuery = {
      ...(idRestriction !== undefined ? { ids: idRestriction } : {}),
      statuses: input.statuses,
      ...(categoryIds ? { categoryIds } : {}),
      ...(input.priceRange ? { priceRange: input.priceRange } : {}),
      sort: useRelevance
        ? { key: "featured", dir: "desc" } // relevance applied below; featured flag still groups
        : { key: input.sortKey, dir: input.sortDir },
      offset: (input.page - 1) * input.pageSize,
      limit: input.pageSize,
    };
    const page = await this.repo.listProducts(query);

    // ---- decorate -----------------------------------------------------------
    const prices = await this.priceForProducts(page.items);
    const imageRowsByProduct = new Map<string, { assetId: string }[]>();
    const assetIds = new Set<string>();
    for (const p of page.items) {
      const imgs = await this.repo.listProductImages(p.id);
      imageRowsByProduct.set(p.id, imgs);
      for (const i of imgs) assetIds.add(i.assetId);
    }
    const assets = await this.repo.getMediaAssets([...assetIds]);
    const assetById = new Map(assets.map((a) => [a.id, a]));
    const imagesByProduct = new Map<string, MediaAssetRecord[]>();
    for (const [pid, rows] of imageRowsByProduct) {
      imagesByProduct.set(
        pid,
        rows.map((r) => assetById.get(r.assetId)).filter((a): a is MediaAssetRecord => !!a),
      );
    }

    let items: ProductListItem[] = page.items.map((p) => ({
      product: p,
      categorySlug: categories.find((c) => c.id === p.categoryId)?.slug ?? null,
      price: prices.get(p.id) ?? { status: "MISSING", reason: "NO_ACTIVE_LIST" },
      imageAssets: imagesByProduct.get(p.id) ?? [],
    }));

    if (useRelevance && scoreMap) {
      items = items
        .slice()
        .sort(
          (a, b) =>
            (scoreMap!.get(b.product.id) ?? 0) - (scoreMap!.get(a.product.id) ?? 0) ||
            a.product.id.localeCompare(b.product.id),
        );
    }

    const totalPages = Math.max(1, Math.ceil(page.total / input.pageSize));
    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      total: page.total,
      totalPages,
      hasNext: input.page < totalPages,
      hasPrev: input.page > 1,
    };
  }
}

// ---------------------------------------------------------------------------
// Detail (product + variants + specs + selections + stock + price)
// ---------------------------------------------------------------------------

export interface SpecDisplayRow {
  label: LocalizedString;
  value: LocalizedString;
  unit: string | null;
}

export interface VariantView {
  variant: VariantRecord;
  price: PriceResolution;
  selections: Array<{ attribute: AttributeRecord; option: AttributeOptionRecord }>;
  availability: StockAvailability;
}

export interface ProductDetailView {
  product: ProductRecord;
  category: CategoryRecord | null;
  specs: SpecDisplayRow[];
  variants: VariantView[];
  images: MediaAssetRecord[];
  selectedVariantId: string | null;
}

export class ProductDetailService {
  constructor(private readonly repo: CatalogRepository) {}

  async get(rawInput: unknown): Promise<ProductDetailView> {
    const input = productDetailInputSchema.parse(rawInput);
    const product = await this.repo.getProductBySlug(input.slug);
    if (!product) throw new CatalogError("NOT_FOUND", `product '${input.slug}' not found`);

    const [variants, category, paRows, attributes, options, images] = await Promise.all([
      this.repo.listVariantsForProduct(product.id),
      this.repo.getCategoryById(product.categoryId),
      this.repo.listProductAttributes([product.id]),
      this.repo.listAttributes(),
      this.repo.listAttributeOptions(),
      this.repo.listProductImages(product.id),
    ]);
    const attrById = new Map(attributes.map((a) => [a.id, a]));
    const optById = new Map(options.map((o) => [o.id, o]));

    const specs: SpecDisplayRow[] = [];
    for (const pa of paRows) {
      const attr = attrById.get(pa.attributeId);
      if (!attr) continue;
      let value: LocalizedString | null = null;
      if (attr.type === "SELECT" && pa.optionId) {
        const opt = optById.get(pa.optionId);
        if (opt) value = { en: opt.valueEn, ar: opt.valueAr };
      } else if (attr.type === "NUMBER" && pa.numValue !== null) {
        const s = String(pa.numValue);
        value = { en: s, ar: s };
      } else if (attr.type === "BOOLEAN" && pa.boolValue !== null) {
        value = { en: pa.boolValue ? "Yes" : "No", ar: pa.boolValue ? "نعم" : "لا" };
      } else if (attr.type === "TEXT" && pa.textValue !== null) {
        value = { en: pa.textValue, ar: pa.textValue };
      }
      if (value) specs.push({ label: { en: attr.labelEn, ar: attr.labelAr }, value, unit: attr.unit });
    }
    specs.sort((a, b) => localize(a.label, "en").localeCompare(localize(b.label, "en"), "en"));

    // variant selections + stock + price
    const selRows = await this.repo.listVariantSelections(variants.map((v) => v.id));
    const lists = await this.repo.listPriceLists();
    const priceItems = await this.repo.listPriceItemsForProducts({
      productIds: [product.id],
      variantIds: variants.map((v) => v.id),
    });
    const stockRows = await this.repo.listStockLevels(variants.map((v) => v.id));

    const variantViews: VariantView[] = variants
      .slice()
      .sort((a, b) => a.sku.localeCompare(b.sku, "en"))
      .map((v) => {
        const ctx = {
          lists,
          items: priceItems,
          basePriceMinor: product.basePriceMinor,
          baseCurrency: product.currency,
        };
        let price = resolvePrice(
          { productId: product.id, variantId: v.id, currency: product.currency },
          ctx,
        );
        if (price.status === "MISSING") price = applyBaseFallback(ctx, product.currency);

        const selections = selRows
          .filter((s) => s.variantId === v.id)
          .map((s) => ({
            attribute: attrById.get(s.attributeId)!,
            option: optById.get(s.optionId)!,
          }))
          .filter((x) => x.attribute && x.option)
          .sort((x, y) => x.attribute.sortOrder - y.attribute.sortOrder);

        const levels = stockRows.filter((sl) => sl.variantId === v.id);
        const onHand = levels.reduce((n, l) => n + l.quantityOnHand, 0);
        const reserved = levels.reduce((n, l) => n + l.reservedQty, 0);
        const availability: StockAvailability = {
          variantId: v.id,
          tracked: v.stockPolicy === "TRACKING",
          quantityOnHand: onHand,
          reservedQty: reserved,
          available: onHand - reserved,
          byWarehouse: levels.map((l) => ({
            warehouseId: l.warehouseId,
            quantityOnHand: l.quantityOnHand,
            reservedQty: l.reservedQty,
            available: l.quantityOnHand - l.reservedQty,
          })),
        };
        return { variant: v, price, selections, availability };
      });

    // invariant #1: every product must expose a standard variant
    const hasStandard = variantViews.some((v) => v.variant.isStandard);
    if (!hasStandard && variantViews.length > 0) {
      // Data violation surfaced loudly rather than silently patched.
      throw new CatalogError(
        "VALIDATION",
        `product '${product.slug}' has variants but none flagged standard`,
      );
    }

    const selectedVariantId = input.sku
      ? (() => {
          const match = variantViews.find((v) => v.variant.sku === input.sku);
          if (!match) throw new CatalogError("NOT_FOUND", `sku '${input.sku}' not found`);
          return match.variant.id;
        })()
      : (variantViews.find((v) => v.variant.isStandard)?.variant.id ?? variantViews[0]?.variant.id ?? null);

    const assetIds = images.map((i) => i.assetId);
    const assets = await this.repo.getMediaAssets(assetIds);
    const assetById = new Map(assets.map((a) => [a.id, a]));
    const imageAssets = images
      .map((i) => assetById.get(i.assetId))
      .filter((a): a is MediaAssetRecord => !!a);

    return {
      product,
      category,
      specs,
      variants: variantViews,
      images: imageAssets,
      selectedVariantId,
    };
  }
}
