// Phase 03 M2 — Test-memory CatalogRepository implementation.
// FOR CONTROLLED UNIT TESTS ONLY (approved plan §M2). It is NOT a caching
// layer and must never be wired into production code paths; the production
// adapter arrives with Prisma in M3 (blocked on CFG-01). All data loaded
// into it comes from clearly-labelled synthetic fixtures.

import type {
  CatalogRepository,
  ProductListQuery,
  ProductPage,
} from "./repository";
import type {
  AttributeOptionRecord,
  AttributeRecord,
  CategoryRecord,
  MediaAssetRecord,
  PriceListItemRecord,
  PriceListRecord,
  ProductAttributeRecord,
  ProductImageRecord,
  ProductRecord,
  StockLevelRecord,
  VariantAttributeSelectionRecord,
  VariantRecord,
  WarehouseRecord,
} from "./types";

export interface FixtureData {
  categories?: CategoryRecord[];
  products?: ProductRecord[];
  variants?: VariantRecord[];
  attributes?: AttributeRecord[];
  attributeOptions?: AttributeOptionRecord[];
  productAttributes?: ProductAttributeRecord[];
  variantSelections?: VariantAttributeSelectionRecord[];
  mediaAssets?: MediaAssetRecord[];
  productImages?: ProductImageRecord[];
  priceLists?: PriceListRecord[];
  priceItems?: PriceListItemRecord[];
  warehouses?: WarehouseRecord[];
  stockLevels?: StockLevelRecord[];
}

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

export class MemoryCatalogRepository implements CatalogRepository {
  private readonly categories: Map<string, CategoryRecord>;
  private readonly products: Map<string, ProductRecord>;
  private readonly variants: Map<string, VariantRecord>;
  private readonly attributes: Map<string, AttributeRecord>;
  private readonly attributeOptions: AttributeOptionRecord[];
  private readonly productAttributes: ProductAttributeRecord[];
  private readonly variantSelections: VariantAttributeSelectionRecord[];
  private readonly mediaAssets: Map<string, MediaAssetRecord>;
  private readonly productImages: ProductImageRecord[];
  private readonly priceLists: PriceListRecord[];
  private readonly priceItems: PriceListItemRecord[];
  private readonly warehouses: WarehouseRecord[];
  private readonly stockLevels: StockLevelRecord[];

  constructor(data: FixtureData = {}) {
    this.categories = byId(data.categories ?? []);
    this.products = byId(data.products ?? []);
    this.variants = byId(data.variants ?? []);
    this.attributes = byId(data.attributes ?? []);
    this.attributeOptions = data.attributeOptions ?? [];
    this.productAttributes = data.productAttributes ?? [];
    this.variantSelections = data.variantSelections ?? [];
    this.mediaAssets = byId(data.mediaAssets ?? []);
    this.productImages = data.productImages ?? [];
    this.priceLists = data.priceLists ?? [];
    this.priceItems = data.priceItems ?? [];
    this.warehouses = data.warehouses ?? [];
    this.stockLevels = data.stockLevels ?? [];
  }

  // ---- taxonomy ----------------------------------------------------------
  async listCategories(): Promise<CategoryRecord[]> {
    return [...this.categories.values()];
  }
  async getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
    return [...this.categories.values()].find((c) => c.slug === slug) ?? null;
  }
  async getCategoryById(id: string): Promise<CategoryRecord | null> {
    return this.categories.get(id) ?? null;
  }

  // ---- products ----------------------------------------------------------
  async getProductBySlug(slug: string): Promise<ProductRecord | null> {
    return [...this.products.values()].find((p) => p.slug === slug) ?? null;
  }
  async getProductById(id: string): Promise<ProductRecord | null> {
    return this.products.get(id) ?? null;
  }

  async listProducts(query: ProductListQuery): Promise<ProductPage> {
    let rows = [...this.products.values()];
    if (query.ids) {
      const allow = new Set(query.ids);
      rows = rows.filter((p) => allow.has(p.id));
    }
    if (query.statuses && query.statuses.length > 0) {
      const s = new Set(query.statuses);
      rows = rows.filter((p) => s.has(p.status));
    }
    if (query.categoryIds && query.categoryIds.length > 0) {
      const c = new Set(query.categoryIds);
      rows = rows.filter((p) => c.has(p.categoryId));
    }
    for (const f of query.attributeFilters ?? []) {
      rows = rows.filter((p) =>
        this.productAttributes.some(
          (pa) =>
            pa.productId === p.id &&
            pa.attributeId === f.attributeId &&
            (f.optionId === undefined || pa.optionId === f.optionId) &&
            (f.textEquals === undefined ||
              (pa.textValue !== null &&
                pa.textValue.toLowerCase() === f.textEquals.toLowerCase())),
        ),
      );
    }
    if (query.priceRange) {
      const { minMinor, maxMinor } = query.priceRange;
      rows = rows.filter((p) => {
        const v = this.listVariantsSync(p.id);
        const candidates = [
          ...(v.length > 0 ? v.map((x) => this.effectivePriceMinor(x.id, p)) : [this.effectivePriceMinor("", p)]),
        ];
        const anyInRange = candidates.some(
          (price) =>
            price !== null &&
            (minMinor === undefined || price >= minMinor) &&
            (maxMinor === undefined || price <= maxMinor),
        );
        return anyInRange;
      });
    }

    const total = rows.length;
    rows = this.sortRows(rows, query);
    const items = rows.slice(query.offset, query.offset + query.limit);
    return { items, total };
  }

  private sortRows(rows: ProductRecord[], query: ProductListQuery): ProductRecord[] {
    // Deterministic tie-break (product id) applied on EVERY key so equal
    // values never produce unstable orderings across pages.
    // Tie-break is collation-independent and applied AFTER multiplying the
    // primary comparison by direction, so descending sorts remain exact
    // reversals of ascending ones (matches Postgres ORDER BY semantics).
    const byId = (a: ProductRecord, b: ProductRecord) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    const dirMul = query.sortDir === "asc" ? 1 : -1;
    const cmp = (a: ProductRecord, b: ProductRecord): number => {
      switch (query.sort.key) {
        case "name": {
          const d = a.nameEn.localeCompare(b.nameEn, "en") || byId(a, b);
          return dirMul * d;
        }
        case "modelCode": {
          const d = a.modelCode.localeCompare(b.modelCode, "en") || byId(a, b);
          return dirMul * d;
        }
        case "newest": {
          const d = a.createdAt.getTime() - b.createdAt.getTime() || byId(a, b);
          return dirMul * d;
        }
        case "featured": {
          const fa = (a.isFeatured ? 1 : 0) - (b.isFeatured ? 1 : 0) || byId(a, b);
          return dirMul * fa;
        }
        case "price": {
          const pa = this.minEffectivePrice(a);
          const pb = this.minEffectivePrice(b);
          // unpriced products sort last regardless of direction
          if (pa === null && pb === null) return byId(a, b);
          if (pa === null) return 1;
          if (pb === null) return -1;
          return dirMul * (pa - pb || byId(a, b));
        }
      }
    };
    return [...rows].sort(cmp);
  }

  private minEffectivePrice(p: ProductRecord): number | null {
    const variants = this.listVariantsSync(p.id);
    const prices = variants
      .map((v) => this.effectivePriceMinor(v.id, p))
      .filter((n): n is number => n !== null);
    if (prices.length > 0) return Math.min(...prices);
    return this.effectivePriceMinor("", p);
  }

  /** Default-list price for (variant|product) valid now; used only for
   *  repository-level price sorting/ranges. Full resolution lives in the
   *  pricing service (resolvePrice) — kept simple here by design. */
  private effectivePriceMinor(variantId: string, p: ProductRecord): number | null {
    const list = this.priceLists.find((l) => l.isActive && l.isDefault);
    if (!list) return p.basePriceMinor;
    const rows = this.priceItems.filter(
      (i) =>
        i.priceListId === list.id &&
        i.currency === p.currency &&
        ((variantId !== "" && i.variantId === variantId) ||
          (variantId === "" && i.productId === p.id && i.variantId === null)),
    );
    if (rows.length === 0) return p.basePriceMinor;
    return rows[0]!.priceMinor;
  }

  private listVariantsSync(productId: string): VariantRecord[] {
    return [...this.variants.values()].filter((v) => v.productId === productId);
  }

  // ---- variants ----------------------------------------------------------
  async listVariantsForProduct(productId: string): Promise<VariantRecord[]> {
    return this.listVariantsSync(productId);
  }
  async getVariantBySku(sku: string): Promise<VariantRecord | null> {
    return [...this.variants.values()].find((v) => v.sku === sku) ?? null;
  }

  // ---- attributes --------------------------------------------------------
  async listAttributes(): Promise<AttributeRecord[]> {
    return [...this.attributes.values()];
  }
  async listAttributeOptions(attributeId?: string): Promise<AttributeOptionRecord[]> {
    return attributeId
      ? this.attributeOptions.filter((o) => o.attributeId === attributeId)
      : [...this.attributeOptions];
  }
  async listProductAttributes(productIds: readonly string[]): Promise<ProductAttributeRecord[]> {
    const s = new Set(productIds);
    return this.productAttributes.filter((pa) => s.has(pa.productId));
  }
  async listVariantSelections(variantIds: readonly string[]): Promise<VariantAttributeSelectionRecord[]> {
    const s = new Set(variantIds);
    return this.variantSelections.filter((vs) => s.has(vs.variantId));
  }

  // ---- media / images ----------------------------------------------------
  async listProductImages(productId: string): Promise<ProductImageRecord[]> {
    return this.productImages
      .filter((img) => img.productId === productId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  }
  async getMediaAssets(ids: readonly string[]): Promise<MediaAssetRecord[]> {
    const s = new Set(ids);
    return [...this.mediaAssets.values()].filter((m) => s.has(m.id));
  }

  // ---- pricing -----------------------------------------------------------
  async listPriceLists(): Promise<PriceListRecord[]> {
    return [...this.priceLists];
  }
  async listPriceItemsForProducts(input: {
    productIds: readonly string[];
    variantIds: readonly string[];
  }): Promise<PriceListItemRecord[]> {
    const pids = new Set(input.productIds);
    const vids = new Set(input.variantIds);
    return this.priceItems.filter(
      (i) =>
        (i.productId !== null && pids.has(i.productId)) ||
        (i.variantId !== null && vids.has(i.variantId)),
    );
  }

  // ---- inventory (read-only) ---------------------------------------------
  async listWarehouses(): Promise<WarehouseRecord[]> {
    return [...this.warehouses];
  }
  async listStockLevels(variantIds: readonly string[]): Promise<StockLevelRecord[]> {
    const s = new Set(variantIds);
    return this.stockLevels.filter((sl) => s.has(sl.variantId));
  }
}
