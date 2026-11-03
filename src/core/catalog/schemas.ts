// Phase 03 M2 — Zod validation of service inputs.
// These schemas are the contract for every catalogue read entry point
// (server components / route handlers in M4/M5 call them before services).

import { z } from "zod";

export const localeSchema = z.enum(["en", "ar"]);

export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase alphanumeric with single hyphens");

/** SKUs/model codes must stay LTR-safe so Bdi rendering is predictable. */
export const skuSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._/-]+$/, "sku may contain only [A-Za-z0-9._/-]");

export const productStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const sortKeySchema = z.enum([
  "name",
  "price",
  "newest",
  "modelCode",
  "featured",
]);
export const sortOrderSchema = z.enum(["asc", "desc"]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const attributeFilterSchema = z.object({
  attributeId: z.string().min(1),
  optionId: z.string().min(1).optional(),
  textEquals: z.string().min(1).max(500).optional(),
});

export const priceRangeSchema = z
  .object({
    minMinor: z.number().int().nonnegative().optional(),
    maxMinor: z.number().int().nonnegative().optional(),
  })
  .refine(
    (r) => r.minMinor === undefined || r.maxMinor === undefined || r.minMinor <= r.maxMinor,
    { message: "minMinor must be <= maxMinor" },
  );

/** Full storefront listing input (query-string friendly). */
export const productListInputSchema = z.object({
  locale: localeSchema,
  q: z.string().trim().min(1).max(200).optional(),
  categorySlug: slugSchema.optional(),
  statuses: z.array(productStatusSchema).min(1).default(["ACTIVE"]),
  attributeFilters: z.array(attributeFilterSchema).max(20).default([]),
  priceRange: priceRangeSchema.optional(),
  sortKey: sortKeySchema.default("featured"),
  sortDir: sortOrderSchema.default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type ProductListInput = z.infer<typeof productListInputSchema>;

export const productDetailInputSchema = z.object({
  locale: localeSchema,
  slug: slugSchema,
  /** Optional variant SKU to preselect; validated LTR-safe. */
  sku: skuSchema.optional(),
});

export const categoryTreeInputSchema = z.object({
  locale: localeSchema,
  includeInactive: z.boolean().default(false),
});
