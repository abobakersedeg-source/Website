// Phase 03 M2 — Catalogue domain types (framework-independent).
// Field names mirror the Prisma schema camelCase surface so the future
// Prisma adapter is a thin mapping (docs/PHASE03_PLAN.md §M2, ADR-002:
// core services must not import Next.js or Prisma).
//
// IMPORTANT: nothing here represents real business data. All concrete
// values used in tests come from clearly-labelled synthetic fixtures.

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type StockPolicy = "TRACKING" | "NOT_TRACKED"; // refinement #6
export type AttributeType = "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";
export type MediaKind = "IMAGE" | "DOCUMENT";

/** Paired En/Ar localisation shape used across the catalogue (ADR-004). */
export interface LocalizedField {
  en: string;
  ar: string;
}

export interface CategoryRecord {
  id: string;
  slug: string;
  parentId: string | null;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageAssetId: string | null;
  sortOrder: number;
  isActive: boolean;
  isSample: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRecord {
  id: string;
  modelCode: string; // unique natural key; LTR-safe charset enforced by services
  slug: string; // unique
  categoryId: string;
  nameEn: string;
  nameAr: string;
  shortDescEn: string | null;
  shortDescAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  /** FALLBACK ONLY — authoritative selling price is PriceListItem (refinement #4). */
  basePriceMinor: number | null;
  currency: string; // ISO-4217
  taxCodeId: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  isSample: boolean;
  metaTitleEn: string | null;
  metaTitleAr: string | null;
  metaDescriptionEn: string | null;
  metaDescriptionAr: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantRecord {
  id: string;
  productId: string;
  sku: string; // unique; LTR-safe charset enforced by services
  isStandard: boolean;
  nameEn: string | null;
  nameAr: string | null;
  stockPolicy: StockPolicy;
  weightKg: number | null; // plain number keeps core free of Decimal libs
  dimsCm: { l: number; w: number; h: number } | null;
  isActive: boolean;
  isSample: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttributeRecord {
  id: string;
  code: string;
  labelEn: string;
  labelAr: string;
  type: AttributeType;
  unit: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface AttributeOptionRecord {
  id: string;
  attributeId: string;
  valueEn: string;
  valueAr: string;
  sortOrder: number;
}

/** Product-level spec value (EAV row). Exactly one value column set per type. */
export interface ProductAttributeRecord {
  id: string;
  productId: string;
  attributeId: string;
  optionId: string | null; // SELECT values reference an option
  textValue: string | null;
  numValue: number | null;
  boolValue: boolean | null;
}

/** Variant-level SELECT selections (refinement #2). */
export interface VariantAttributeSelectionRecord {
  id: string;
  variantId: string;
  attributeId: string;
  optionId: string;
}

export interface MediaAssetRecord {
  id: string;
  key: string; // storage object key — provider-agnostic (adapter resolves URLs)
  kind: MediaKind;
  altEn: string | null;
  altAr: string | null;
  widthPx: number | null;
  heightPx: number | null;
  bytes: number | null;
  mime: string | null;
  createdAt: Date;
}

export interface ProductImageRecord {
  id: string;
  productId: string;
  assetId: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface PriceListRecord {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  validFrom: Date;
  validTo: Date | null;
}

/** Authoritative selling price row (refinement #4). Targets either a whole
 *  product (productId, variantId null) or one specific variant. */
export interface PriceListItemRecord {
  id: string;
  priceListId: string;
  productId: string | null;
  variantId: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  currency: string;
  validFrom: Date;
  validTo: Date | null;
}

export interface WarehouseRecord {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
}

export interface StockLevelRecord {
  id: string;
  variantId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQty: number;
}

/** Read-only view of availability. available = onHand − reserved, computed in
 *  the service layer only — never stored (DATA_MODEL §Inventory). */
export interface StockAvailability {
  variantId: string;
  tracked: boolean; // false ⇒ StockPolicy NOT_TRACKED (availability unknown)
  quantityOnHand: number;
  reservedQty: number;
  available: number;
  byWarehouse: Array<{
    warehouseId: string;
    quantityOnHand: number;
    reservedQty: number;
    available: number;
  }>;
}
