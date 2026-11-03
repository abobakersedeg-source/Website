// Phase 03 M2 — SYNTHETIC catalogue fixtures.
// These records are fabricated test scaffolding ONLY. They do not represent
// real products, prices, inventory, certifications, or any business data of
// the Golf Cart Division project (BIZ register remains open). Every entity is
// flagged `isSample: true` where the schema supports it.

import type { FixtureData } from "../../src/core/catalog/memoryRepository";
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
} from "../../src/core/catalog/types";

const T = (iso: string) => new Date(iso);

/** Deterministic "now" used by tests that resolve prices at a fixed instant. */
export const NOW = T("2026-11-03T12:00:00Z");

// ---------------------------------------------------------------------------
// Categories: parent + subcategory, inactive category.
// ---------------------------------------------------------------------------
const categories: CategoryRecord[] = [
  {
    id: "cat-electric", slug: "electric-carts", parentId: null,
    nameEn: "Electric Carts", nameAr: "عربات كهربائية",
    descriptionEn: "Battery-electric carts", descriptionAr: "عربات تعمل بالبطارية",
    imageAssetId: null, sortOrder: 1, isActive: true, isSample: true,
    createdAt: T("2026-01-01T00:00:00Z"), updatedAt: T("2026-01-01T00:00:00Z"),
  },
  {
    id: "cat-utility", slug: "utility-carts", parentId: "cat-electric",
    nameEn: "Utility Carts", nameAr: "عربات متعددة الاستخدام",
    descriptionEn: null, descriptionAr: null,
    imageAssetId: null, sortOrder: 1, isActive: true, isSample: true,
    createdAt: T("2026-01-01T00:00:00Z"), updatedAt: T("2026-01-01T00:00:00Z"),
  },
  {
    id: "cat-gas", slug: "gas-carts", parentId: null,
    nameEn: "Gasoline Carts", nameAr: "عربات بنزين",
    descriptionEn: null, descriptionAr: null,
    imageAssetId: null, sortOrder: 2, isActive: false, isSample: true,
    createdAt: T("2026-01-01T00:00:00Z"), updatedAt: T("2026-01-01T00:00:00Z"),
  },
];

// ---------------------------------------------------------------------------
// Products. Names deliberately include prefix-testable words.
// ---------------------------------------------------------------------------
const products: ProductRecord[] = [
  {
    // ACTIVE, featured; EN tokens: electric/passenger/four/seat …
    id: "prod-alpha", modelCode: "GC-EL4", slug: "electric-passenger-four",
    categoryId: "cat-utility",
    nameEn: "Electric Passenger Cart Four Seat",
    nameAr: "عربة ركاب كهربائية بأربعة مقاعد",
    shortDescEn: "Compact electric people mover", shortDescAr: "نقل أشخاص كهربائي مدمج",
    descriptionEn: "Road-ready electric cart with four passenger seats",
    descriptionAr: "عربة كهربائية جاهزة للطريق بأربعة مقاعد للركاب",
    basePriceMinor: 999_00, currency: "AED", taxCodeId: null,
    status: "ACTIVE", isFeatured: true, isSample: true,
    metaTitleEn: null, metaTitleAr: null, metaDescriptionEn: null, metaDescriptionAr: null,
    createdAt: T("2026-06-01T00:00:00Z"), updatedAt: T("2026-06-01T00:00:00Z"),
  },
  {
    // ACTIVE, unfeatured; priced via product-generic row only
    id: "prod-beta", modelCode: "GC-UT2", slug: "utility-hauler",
    categoryId: "cat-utility",
    nameEn: "Utility Hauler Two Hundred",
    nameAr: "عربة نقل للأمتعة",
    shortDescEn: null, shortDescAr: "عربة شحن خفيفة",
    descriptionEn: "Heavy duty utility bed hauler", descriptionAr: null,
    basePriceMinor: 500_00, currency: "AED", taxCodeId: null,
    status: "ACTIVE", isFeatured: false, isSample: true,
    metaTitleEn: null, metaTitleAr: null, metaDescriptionEn: null, metaDescriptionAr: null,
    createdAt: T("2026-07-01T00:00:00Z"), updatedAt: T("2026-07-01T00:00:00Z"),
  },
  {
    // ACTIVE but NO live price rows anywhere ⇒ MISSING unless base fallback
    id: "prod-unpriced", modelCode: "GC-NP1", slug: "unpriced-scout",
    categoryId: "cat-electric",
    nameEn: "Unpriced Scout Electric", nameAr: "عربة استطلاع غير مسعرة",
    shortDescEn: null, shortDescAr: null, descriptionEn: null, descriptionAr: null,
    basePriceMinor: null, currency: "AED", taxCodeId: null,
    status: "ACTIVE", isFeatured: false, isSample: true,
    metaTitleEn: null, metaTitleAr: null, metaDescriptionEn: null, metaDescriptionAr: null,
    createdAt: T("2026-08-01T00:00:00Z"), updatedAt: T("2026-08-01T00:00:00Z"),
  },
  {
    // DRAFT — hidden from default storefront listing
    id: "prod-draft", modelCode: "GC-DR1", slug: "draft-preview",
    categoryId: "cat-electric",
    nameEn: "Draft Preview Electric", nameAr: "مسودة المعاينة",
    shortDescEn: null, shortDescAr: null, descriptionEn: null, descriptionAr: null,
    basePriceMinor: 100_00, currency: "AED", taxCodeId: null,
    status: "DRAFT", isFeatured: false, isSample: true,
    metaTitleEn: null, metaTitleAr: null, metaDescriptionEn: null, metaDescriptionAr: null,
    createdAt: T("2026-09-01T00:00:00Z"), updatedAt: T("2026-09-01T00:00:00Z"),
  },
  {
    // ARCHIVED
    id: "prod-archived", modelCode: "GC-AR1", slug: "legacy-classic",
    categoryId: "cat-gas",
    nameEn: "Legacy Classic Electric", nameAr: "طراز كلاسيكي مؤرشف",
    shortDescEn: null, shortDescAr: null, descriptionEn: null, descriptionAr: null,
    basePriceMinor: null, currency: "AED", taxCodeId: null,
    status: "ARCHIVED", isFeatured: false, isSample: true,
    metaTitleEn: null, metaTitleAr: null, metaDescriptionEn: null, metaDescriptionAr: null,
    createdAt: T("2025-01-01T00:00:00Z"), updatedAt: T("2026-01-01T00:00:00Z"),
  },
  {
    // Conflicting duplicate price rows (same specificity, overlapping window)
    id: "prod-conflict", modelCode: "GC-CF1", slug: "conflicted-model",
    categoryId: "cat-electric",
    nameEn: "Conflicted Model Cart", nameAr: "طراز تسعيره متنازع عليها",
    shortDescEn: null, shortDescAr: null, descriptionEn: null, descriptionAr: null,
    basePriceMinor: 700_00, currency: "AED", taxCodeId: null,
    status: "ACTIVE", isFeatured: false, isSample: true,
    metaTitleEn: null, metaTitleAr: null, metaDescriptionEn: null, metaDescriptionAr: null,
    createdAt: T("2026-05-01T00:00:00Z"), updatedAt: T("2026-05-01T00:00:00Z"),
  },
  {
    // Data violation: variants exist but NONE is standard
    id: "prod-broken", modelCode: "GC-BR1", slug: "broken-no-standard",
    categoryId: "cat-electric",
    nameEn: "Broken No Standard Variant", nameAr: "طراز بلا نموذج قياسي",
    shortDescEn: null, shortDescAr: null, descriptionEn: null, descriptionAr: null,
    basePriceMinor: null, currency: "AED", taxCodeId: null,
    status: "ACTIVE", isFeatured: false, isSample: true,
    metaTitleEn: null, metaTitleAr: null, metaDescriptionEn: null, metaDescriptionAr: null,
    createdAt: T("2026-04-01T00:00:00Z"), updatedAt: T("2026-04-01T00:00:00Z"),
  },
];

// ---------------------------------------------------------------------------
// Variants (LTR-safe SKUs).
// ---------------------------------------------------------------------------
const variants: VariantRecord[] = [
  {
    id: "var-alpha-std", productId: "prod-alpha", sku: "GC-EL4-BLK-48",
    isStandard: true, nameEn: "Black / 48V", nameAr: "أسود / 48 فولت",
    stockPolicy: "TRACKING", weightKg: 300, dimsCm: null, isActive: true, isSample: true,
    createdAt: T("2026-06-01T00:00:00Z"), updatedAt: T("2026-06-01T00:00:00Z"),
  },
  {
    id: "var-alpha-alt", productId: "prod-alpha", sku: "GC-EL4-WHT-72",
    isStandard: false, nameEn: "White / 72V", nameAr: "أبيض / 72 فولت",
    stockPolicy: "TRACKING", weightKg: 320, dimsCm: null, isActive: true, isSample: true,
    createdAt: T("2026-06-01T00:00:00Z"), updatedAt: T("2026-06-01T00:00:00Z"),
  },
  {
    id: "var-beta-std", productId: "prod-beta", sku: "GC-UT2-STD",
    isStandard: true, nameEn: null, nameAr: null,
    stockPolicy: "NOT_TRACKED", weightKg: null, dimsCm: null, isActive: true, isSample: true,
    createdAt: T("2026-07-01T00:00:00Z"), updatedAt: T("2026-07-01T00:00:00Z"),
  },
  {
    id: "var-unpriced-std", productId: "prod-unpriced", sku: "GC-NP1-STD",
    isStandard: true, nameEn: null, nameAr: null,
    stockPolicy: "TRACKING", weightKg: null, dimsCm: null, isActive: true, isSample: true,
    createdAt: T("2026-08-01T00:00:00Z"), updatedAt: T("2026-08-01T00:00:00Z"),
  },
  {
    id: "var-draft-std", productId: "prod-draft", sku: "GC-DR1-STD",
    isStandard: true, nameEn: null, nameAr: null,
    stockPolicy: "TRACKING", weightKg: null, dimsCm: null, isActive: true, isSample: true,
    createdAt: T("2026-09-01T00:00:00Z"), updatedAt: T("2026-09-01T00:00:00Z"),
  },
  {
    id: "var-conflict-std", productId: "prod-conflict", sku: "GC-CF1-STD",
    isStandard: true, nameEn: null, nameAr: null,
    stockPolicy: "TRACKING", weightKg: null, dimsCm: null, isActive: true, isSample: true,
    createdAt: T("2026-05-01T00:00:00Z"), updatedAt: T("2026-05-01T00:00:00Z"),
  },
  {
    id: "var-broken-a", productId: "prod-broken", sku: "GC-BR1-A",
    isStandard: false, nameEn: null, nameAr: null,
    stockPolicy: "NOT_TRACKED", weightKg: null, dimsCm: null, isActive: true, isSample: true,
    createdAt: T("2026-04-01T00:00:00Z"), updatedAt: T("2026-04-01T00:00:00Z"),
  },
];

// ---------------------------------------------------------------------------
// Attributes (EAV)
// ---------------------------------------------------------------------------
const attributes: AttributeRecord[] = [
  { id: "attr-seating", code: "seating", labelEn: "Seating", labelAr: "المقاعد", type: "SELECT", unit: null, sortOrder: 1, isActive: true },
  { id: "attr-battery", code: "battery", labelEn: "Battery", labelAr: "البطارية", type: "SELECT", unit: null, sortOrder: 2, isActive: true },
  { id: "attr-range", code: "range_km", labelEn: "Range", labelAr: "المدى", type: "NUMBER", unit: "km", sortOrder: 3, isActive: true },
  { id: "attr-foldable", code: "foldable", labelEn: "Foldable", labelAr: "قابل للطي", type: "BOOLEAN", unit: null, sortOrder: 4, isActive: true },
  { id: "color", code: "color", labelEn: "Colour", labelAr: "اللون", type: "SELECT", unit: null, sortOrder: 5, isActive: true },
];

const attributeOptions: AttributeOptionRecord[] = [
  { id: "opt-seat2", attributeId: "attr-seating", valueEn: "2 seats", valueAr: "مقعدان", sortOrder: 1 },
  { id: "opt-seat4", attributeId: "attr-seating", valueEn: "4 seats", valueAr: "٤ مقاعد", sortOrder: 2 },
  { id: "opt-batt48", attributeId: "attr-battery", valueEn: "48V", valueAr: "48 فولت", sortOrder: 1 },
  { id: "opt-batt72", attributeId: "attr-battery", valueEn: "72V", valueAr: "72 فولت", sortOrder: 2 },
  { id: "opt-black", attributeId: "color", valueEn: "Black", valueAr: "أسود", sortOrder: 1 },
  { id: "opt-white", attributeId: "color", valueEn: "White", valueAr: "أبيض", sortOrder: 2 },
];

const productAttributes: ProductAttributeRecord[] = [
  { id: "pa-1", productId: "prod-alpha", attributeId: "attr-seating", optionId: "opt-seat4", textValue: null, numValue: null, boolValue: null },
  { id: "pa-2", productId: "prod-alpha", attributeId: "attr-range", optionId: null, textValue: null, numValue: 100, boolValue: null },
  { id: "pa-3", productId: "prod-alpha", attributeId: "attr-foldable", optionId: null, textValue: null, numValue: null, boolValue: false },
  { id: "pa-4", productId: "prod-beta", attributeId: "attr-seating", optionId: "opt-seat2", textValue: null, numValue: null, boolValue: null },
  { id: "pa-5", productId: "prod-beta", attributeId: "color", optionId: null, textValue: "Matte Grey", numValue: null, boolValue: null },
];

const variantSelections: VariantAttributeSelectionRecord[] = [
  { id: "vs-1", variantId: "var-alpha-std", attributeId: "color", optionId: "opt-black" },
  { id: "vs-2", variantId: "var-alpha-std", attributeId: "attr-battery", optionId: "opt-batt48" },
  { id: "vs-3", variantId: "var-alpha-alt", attributeId: "color", optionId: "opt-white" },
  { id: "vs-4", variantId: "var-alpha-alt", attributeId: "attr-battery", optionId: "opt-batt72" },
];

// ---------------------------------------------------------------------------
// Media & images
// ---------------------------------------------------------------------------
const mediaAssets: MediaAssetRecord[] = [
  { id: "media-a1", key: "synthetic/alpha-1.jpg", kind: "IMAGE", altEn: "Synthetic sample image A1", altAr: "صورة تجريبية A1", widthPx: 1200, heightPx: 800, bytes: 100000, mime: "image/jpeg", createdAt: T("2026-06-01T00:00:00Z") },
  { id: "media-a2", key: "synthetic/alpha-2.jpg", kind: "IMAGE", altEn: "Synthetic sample image A2", altAr: "صورة تجريبية A2", widthPx: 1200, heightPx: 800, bytes: 100000, mime: "image/jpeg", createdAt: T("2026-06-01T00:00:00Z") },
  { id: "media-b1", key: "synthetic/beta-1.jpg", kind: "IMAGE", altEn: null, altAr: null, widthPx: null, heightPx: null, bytes: null, mime: null, createdAt: T("2026-07-01T00:00:00Z") },
];

const productImages: ProductImageRecord[] = [
  { id: "pi-1", productId: "prod-alpha", assetId: "media-a1", sortOrder: 1, isPrimary: true },
  { id: "pi-2", productId: "prod-alpha", assetId: "media-a2", sortOrder: 2, isPrimary: false },
  { id: "pi-3", productId: "prod-beta", assetId: "media-b1", sortOrder: 1, isPrimary: true },
];

// ---------------------------------------------------------------------------
// Pricing: RETAIL default list (active), DEALER list (inactive).
// ---------------------------------------------------------------------------
const priceLists: PriceListRecord[] = [
  { id: "pl-retail", code: "RETAIL", nameEn: "Retail", nameAr: "تجزئة", currency: "AED", isDefault: true, isActive: true, validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
  { id: "pl-dealer", code: "DEALER", nameEn: "Dealer", nameAr: "وكيل", currency: "AED", isDefault: false, isActive: false, validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
];

const priceItems: PriceListItemRecord[] = [
  { id: "pli-a-std", priceListId: "pl-retail", productId: "prod-alpha", variantId: "var-alpha-std", priceMinor: 1200_00, compareAtMinor: 1350_00, currency: "AED", validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
  { id: "pli-a-alt", priceListId: "pl-retail", productId: "prod-alpha", variantId: "var-alpha-alt", priceMinor: 1500_00, compareAtMinor: null, currency: "AED", validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
  { id: "pli-b-gen", priceListId: "pl-retail", productId: "prod-beta", variantId: null, priceMinor: 800_00, compareAtMinor: null, currency: "AED", validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
  // expired row for unpriced product (must NOT resolve) — targets the PRODUCT
  // generically so no live variant row can shadow it during resolution
  { id: "pli-u-expired", priceListId: "pl-retail", productId: "prod-unpriced", variantId: null, priceMinor: 600_00, compareAtMinor: null, currency: "AED", validFrom: T("2025-01-01T00:00:00Z"), validTo: T("2025-12-31T00:00:00Z") },
  // conflict: two simultaneous generic rows for prod-conflict
  { id: "pli-c-1", priceListId: "pl-retail", productId: "prod-conflict", variantId: null, priceMinor: 750_00, compareAtMinor: null, currency: "AED", validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
  { id: "pli-c-2", priceListId: "pl-retail", productId: "prod-conflict", variantId: null, priceMinor: 760_00, compareAtMinor: null, currency: "AED", validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
  // dealer (inactive list) row — proves inactive lists are ignored
  { id: "pli-d-a", priceListId: "pl-dealer", productId: "prod-alpha", variantId: "var-alpha-std", priceMinor: 900_00, compareAtMinor: null, currency: "AED", validFrom: T("2026-01-01T00:00:00Z"), validTo: null },
];

// ---------------------------------------------------------------------------
// Inventory (read-only view tests)
// ---------------------------------------------------------------------------
const warehouses: WarehouseRecord[] = [
  { id: "wh-dxb", code: "DXB-1", nameEn: "Dubai warehouse (synthetic)", nameAr: "مستودع دبي (تجريبي)", isActive: true },
  { id: "wh-rho", code: "RHO-1", nameEn: "Riyadh warehouse (synthetic)", nameAr: "مستودع الرياض (تجريبي)", isActive: true },
];

const stockLevels: StockLevelRecord[] = [
  { id: "sl-1", variantId: "var-alpha-std", warehouseId: "wh-dxb", quantityOnHand: 5, reservedQty: 2 },
  { id: "sl-2", variantId: "var-alpha-std", warehouseId: "wh-rho", quantityOnHand: 4, reservedQty: 4 },
];

export function fixtureData(overrides: Partial<FixtureData> = {}): FixtureData {
  return {
    categories, products, variants, attributes, attributeOptions,
    productAttributes, variantSelections, mediaAssets, productImages,
    priceLists, priceItems, warehouses, stockLevels,
    ...overrides,
  };
}
