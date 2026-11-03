// Phase 03 M2 — Price resolution (refinement #4: PriceListItem is the
// authoritative selling price; Product.basePriceMinor is a documented
// fallback ONLY, never silently averaged or mixed across currencies).
//
// Resolution order for (product, variant?, list?, at, currency):
//   1. Pick the price list: the single active default list (isDefault), else
//      none (⇒ fallback path). Customer-segment/dealer lists arrive with
//      auth in Phase 04+; resolvePrice accepts an explicit `listCode` then.
//   2. Candidate rows in that list valid at `at` (validFrom ≤ at < validTo)
//      and matching `currency`:
//        a. rows targeting this VARIANT (specific beats general)
//        b. rows targeting this PRODUCT generically (variantId === null)
//   3. Exactly one winner ⇒ resolved price.
//      More than one row at the same specificity level ⇒ CONFLICT: we do not
//      guess; return an explicit conflict reason and no price.
//   4. No rows at all ⇒ basePriceMinor fallback IF it matches the requested
//      currency; otherwise MISSING (with reason). Checkout/tax code remains
//      out of scope (Phase 05+).

import type { PriceListItemRecord, PriceListRecord } from "./types";

export interface PriceResolveInput {
  productId: string;
  variantId?: string | null;
  /** ISO-4217 code the caller needs (e.g. storefront locale default). */
  currency: string;
  /** Moment the price applies at (now by default). */
  at?: Date;
  /** Reserved for Phase 04+ (dealer/project lists). Overrides default-list
   *  selection when provided. */
  listCode?: string | null;
}

export interface PriceListContext {
  lists: PriceListRecord[];
  items: PriceListItemRecord[]; // rows already scoped to product/variants
  /** Fallback seed on the product record itself (may be null). */
  basePriceMinor: number | null;
  baseCurrency: string;
}

export type PriceResolution =
  | {
      status: "RESOLVED";
      priceMinor: number;
      compareAtMinor: number | null;
      currency: string;
      source: "priceListItem";
      priceListItemId: string;
      priceListCode: string;
    }
  | {
      status: "FALLBACK_BASE";
      priceMinor: number;
      currency: string;
      source: "productBasePrice";
    }
  | {
      status: "MISSING";
      reason: "NO_ACTIVE_LIST" | "NO_ROWS_FOR_TARGET" | "CURRENCY_MISMATCH";
    }
  | {
      status: "CONFLICT";
      reason: "OVERLAPPING_ROWS";
      candidateIds: string[];
    };

// (validity helper below)

function isValidAt(row: { validFrom: Date; validTo: Date | null }, at: Date): boolean {
  // half-open interval [validFrom, validTo)
  return row.validFrom.getTime() <= at.getTime() && (row.validTo === null || at.getTime() < row.validTo.getTime());
}

export function resolvePrice(
  input: PriceResolveInput,
  ctx: PriceListContext,
): PriceResolution {
  const at = input.at ?? new Date();

  // 1. choose list -----------------------------------------------------------
  const activeLists = ctx.lists.filter((l) => l.isActive && isValidAt(l, at));
  const list = input.listCode
    ? activeLists.find((l) => l.code === input.listCode)
    : activeLists.find((l) => l.isDefault);
  if (!list) return { status: "MISSING", reason: "NO_ACTIVE_LIST" };

  // 2. candidate rows --------------------------------------------------------
  // Rows must belong to the chosen list AND be effective at `at` (refinement
  // #9: PriceListItem is authoritative, respecting currency and dates).
  const inList = ctx.items.filter((i) => i.priceListId === list.id && isValidAt(i, at));
  const currencyRows = inList.filter((i) => i.currency === input.currency);
  if (inList.length > 0 && currencyRows.length === 0) {
    return { status: "MISSING", reason: "CURRENCY_MISMATCH" };
  }

  const variantRows = input.variantId
    ? currencyRows.filter((i) => i.variantId === input.variantId)
    : [];
  const productRows = currencyRows.filter(
    (i) => i.productId === input.productId && i.variantId === null,
  );

  // 3. specificity: variant rows beat product rows ---------------------------
  const tier = variantRows.length > 0 ? variantRows : productRows;
  if (tier.length === 0) return { status: "MISSING", reason: "NO_ROWS_FOR_TARGET" };
  if (tier.length > 1) {
    return {
      status: "CONFLICT",
      reason: "OVERLAPPING_ROWS",
      candidateIds: tier.map((t) => t.id),
    };
  }
  const row = tier[0]!;
  return {
    status: "RESOLVED",
    priceMinor: row.priceMinor,
    compareAtMinor: row.compareAtMinor,
    currency: row.currency,
    source: "priceListItem",
    priceListItemId: row.id,
    priceListCode: list.code,
  };
}

/** Only called when the caller explicitly allows the documented fallback. */
export function applyBaseFallback(ctx: PriceListContext, currency: string): PriceResolution {
  if (ctx.basePriceMinor !== null && ctx.baseCurrency === currency) {
    return {
      status: "FALLBACK_BASE",
      priceMinor: ctx.basePriceMinor,
      currency,
      source: "productBasePrice",
    };
  }
  return { status: "MISSING", reason: "CURRENCY_MISMATCH" };
}
