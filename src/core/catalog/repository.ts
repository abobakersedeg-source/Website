// Phase 03 M2 — CatalogRepository port (ADR-002 modular monolith).
// Framework-independent: no Next.js, no Prisma imports. The production
// implementation will be a thin Prisma adapter created once CFG-01 lands
// (Phase 03 M3); the only implementation today is the test-memory repository.

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
  ProductStatus,
  StockLevelRecord,
  VariantAttributeSelectionRecord,
  VariantRecord,
  WarehouseRecord,
} from "./types";

/** Options for listing products at the repository boundary. Services pass
 *  fully-resolved filters; repositories execute them literally. */
export interface ProductListQuery {
  /** Restrict to these product ids (used after search/filter pre-selection). */
  ids?: readonly string[];
  statuses?: readonly ProductStatus[];
  categoryIds?: readonly string[]; // caller expands subtree before calling
  attributeFilters?: readonly { attributeId: string; optionId?: string; textEquals?: string }[];
  priceRange?: { minMinor?: number; maxMinor?: number };
  sort: ProductSortSpec;
  offset: number;
  limit: number;
}

export type ProductSortKey =
  | "name"
  | "price"
  | "newest"
  | "modelCode"
  | "featured";

export interface ProductSortSpec {
  key: ProductSortKey;
  dir: "asc" | "desc";
}

export interface ProductPage {
  items: ProductRecord[];
  total: number;
}

export interface CatalogRepository {
  // ---- taxonomy ----------------------------------------------------------
  listCategories(): Promise<CategoryRecord[]>;
  getCategoryBySlug(slug: string): Promise<CategoryRecord | null>;
  getCategoryById(id: string): Promise<CategoryRecord | null>;

  // ---- products ----------------------------------------------------------
  getProductBySlug(slug: string): Promise<ProductRecord | null>;
  getProductById(id: string): Promise<ProductRecord | null>;
  listProducts(query: ProductListQuery): Promise<ProductPage>;

  // ---- variants ----------------------------------------------------------
  listVariantsForProduct(productId: string): Promise<VariantRecord[]>;
  getVariantBySku(sku: string): Promise<VariantRecord | null>;

  // ---- attributes (EAV) --------------------------------------------------
  listAttributes(): Promise<AttributeRecord[]>;
  listAttributeOptions(attributeId?: string): Promise<AttributeOptionRecord[]>;
  listProductAttributes(productIds: readonly string[]): Promise<ProductAttributeRecord[]>;
  listVariantSelections(variantIds: readonly string[]): Promise<VariantAttributeSelectionRecord[]>;

  // ---- media / images ----------------------------------------------------
  listProductImages(productId: string): Promise<ProductImageRecord[]>;
  getMediaAssets(ids: readonly string[]): Promise<MediaAssetRecord[]>;

  // ---- pricing -----------------------------------------------------------
  listPriceLists(): Promise<PriceListRecord[]>;
  /** Rows targeting the given product ids OR their variant ids. */
  listPriceItemsForProducts(input: {
    productIds: readonly string[];
    variantIds: readonly string[];
  }): Promise<PriceListItemRecord[]>;

  // ---- inventory (read-only in M2; mutations are Phase 04+) ---------------
  listWarehouses(): Promise<WarehouseRecord[]>;
  listStockLevels(variantIds: readonly string[]): Promise<StockLevelRecord[]>;
}
