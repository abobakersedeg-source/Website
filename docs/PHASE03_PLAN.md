# Phase 03 — Product Catalogue & Database Foundation: Implementation Plan

**Status:** PLAN ONLY — awaiting owner approval. No implementation has started.
**Date prepared:** 2026-11-01
**Depends on:** Phase 01 (✅ complete, `c60607b`) · Phase 02 (🚧 deferred-not-complete — maintenance checkpoint recorded in IMPLEMENTATION_STATUS §6) · CFG-01 (PostgreSQL URL — ❌ open, gates migration execution only)

---

## 1. Technical Assessment — What Already Exists (verified this turn)

| Area | Current state | Reuse decision |
|---|---|---|
| Locale routing `/[locale]`, negotiation (`proxy.ts`), RTL `<html dir>` | Implemented & committed (Phase 01/02) | **Reuse as-is.** New catalogue routes register in existing route registry (`src/i18n/paths.ts`) so locale switching preserves them. |
| Translation catalogues `messages/en.json` + `ar.json` | Working static-import map | Extend with catalogue namespaces (`catalog.*`). Arabic copy for UI strings only — never invented product data. |
| `Bdi` component | Done, tested | Use for SKU/model codes on all catalogue surfaces. |
| Metadata/hreflang generator (`src/lib/metadata.ts`) | Done; suppressed without CFG-06 | Wire product/category pages into it; canonicals activate automatically once `NEXT_PUBLIC_SITE_URL` is set. |
| Prisma 7 setup | `prisma/schema.prisma` has bootstrap `MetaVersion` only; connections via `prisma.config.ts` + `@prisma/adapter-pg` (ADR-003 amended); client generates to `src/generated/prisma` (gitignored) | Extend schema per DATA_MODEL.md §2–4. No new ORM/driver. |
| Zod env validation (`src/lib/env.ts`) | Active | Add catalogue-related vars only if needed (none planned). |
| ESLint logical-property rule, CI workflow, test stack (Vitest/jsdom 26.1.0 pin) | Active | Enforce on all new components; extend CI job list unchanged (lint/typecheck/test/build already run). |
| Data model spec | Fully authored in `docs/DATA_MODEL.md` (§2 Catalog & Variants, §3 Pricing, §4 Inventory, §12 Migration sequence) | **Do not re-design.** Implement migrations 0001→0003 subset relevant to catalogue. |
| Application code for products/categories/orders/admin | **None exists** | Nothing to duplicate; greenfield within existing shell. |

**Key architectural decisions preserved:** modular monolith with framework-free service layer (`src/core/<module>`), provider adapters, DB-paired translation columns (`nameEn`/`nameAr` style per DATA_MODEL), strict TS, Tailwind v4 logical properties, next-intl, Auth.js deferred to Phase 04.

---

## 2. Scope Boundaries

**In scope (proposed):** categories/subcategories, products with unique SKUs, EN/AR descriptions, specifications/attributes, media/gallery records, pricing structures (price lists, tax rates), inventory structures (warehouse, stock levels, movements), storefront listing/detail/search/filter/sort pages, admin-ready architecture (service layer + repository interfaces + RBAC-aware guards designed but UI deferred to Phase 08).

**Explicitly out of scope:** cart/checkout (P06), payments (P07), auth implementation (P04 — schema tables may land early per migration sequence), CRM/quotation/service modules (P09/P10), CMS page builder (P11), real product content (BIZ-02 — unknown; only clearly-flagged sample seeds allowed), admin dashboard UI (P08).

---

## 3. Milestones

### M0 — Pre-flight (no DB required)
- Resume/close the Phase 02 maintenance checkpoint (48/48 tests, lint/typecheck/build, runtime verification, ADR-016, final commit). **Recommended before M1** because catalogue tests build on the same Vitest setup.
- Confirm Prisma version pin (7.x stable) and regenerate client baseline.

**Files:** none new; fixes per Phase 02 checklist.
**Acceptance:** Phase 02 tracker flips ✅; suite 48/48.

### M1 — Schema Authoring (offline, no DATABASE_URL needed)
- Write full catalogue portion of `prisma/schema.prisma`: `Category` (self-referential parent, slugEn/slugAr, sortOrder, isActive), `Product` (unique `sku`, categoryId, nameEn/nameAr, descriptionEn/Ar, status enum DRAFT/ACTIVE/HIDDEN, warranty fields left nullable), `Attribute` + `AttributeValue` + `ProductAttribute`, `ProductVariant` (sellable SKU, nullable link to parent product variant-of semantics per DATA_MODEL §2), `Media` (storageKey placeholder pattern, altEn/altAr, gallery sort), pricing/tax models (`Market`, `Currency`, `PriceList`, `PricePoint`, `TaxRate`), inventory models (`Warehouse`, `StockLevel`, `StockMovement`, `Reservation`).
- Constraints: unique slugs per locale pair, unique SKU, check constraints for price ≥ 0, decimal(12,2) money columns, `@@index` on listing hot paths (categoryId+status, sku, slug).
- Generate migration SQL files offline (`prisma migrate diff --from-empty --to-schema-datamodel --script`) → hand-named `0001_identity`…`0003_pricing_inventory` per DATA_MODEL §12 sequence (identity tables included here since Phase 04 reuses them; their *behavior* still lands in P04).
- Zod schemas mirroring Prisma types in `src/core/catalog/{schemas,types}.ts`.

**Files:** `prisma/schema.prisma`, `prisma/migrations/000{1,2,3}_*/migration.sql` (authored, unapplied), `src/core/catalog/*`, `src/lib/db.ts` (PrismaClient singleton w/ pg adapter).
**Acceptance:** `prisma validate` ✔ · `prisma generate` ✔ · `tsc` clean · migration SQL reviewed by human reading DATA_MODEL cross-check table added to plan doc.

### M2 — Service Layer + Repository (no DB execution needed; unit-testable with injected fake client)
- `src/core/catalog/service/{products,categories,variants,media,pricing,inventory}.ts` — pure functions/classes, framework-free (ADR: modular monolith), input validated by Zod, output typed.
- Search/filter/sort query builder: text (name/sku, PG `pg_trgm`/`ilike` fallback documented), category tree filter, attribute facets, price range, sort (newest/price asc-desc/name), pagination (cursor-based default; offset for SEO pages).
- Translation-completeness helper: `needsTranslation()` report queries (per DATA_MODEL cross-cutting rules).
- Admin-ready: every mutation goes through service with `ActorContext {userId, roles}` parameter; RBAC guard stubs (enforced properly in P04/P08) — architecture only, no UI.

**Files:** as above + `tests/core/catalog/*.test.ts` against a fake-prisma unit harness (no live DB).
**Acceptance:** unit tests pass under `npx vitest run` without DATABASE_URL; lint enforces logical utilities in any presentational helpers.

### M3 — Apply Migrations (**REQUIRES CFG-01**)
- Point `DATABASE_URL` at provided Postgres; `prisma migrate deploy`; smoke test per DATA_MODEL §12: insert/read representative rows in both locales (generic structural fixtures — e.g. category "Sample / عينة" flagged `isSample=true`, never fabricated real models/prices presented as genuine).
- Seed script `prisma/seed.ts` guarded: refuses to run against production flag env; samples carry `isSample` marker for later deletion (BIZ-02 import path).

**Acceptance:** `migrate deploy` exit 0 on dev DB; smoke tests green; seed idempotent.

### M4 — Storefront Read Paths (ISR pages, work against M3 or local dev DB)
- Routes: `/[locale]/products/page.tsx` (listing + filters + pagination), `/[locale]/products/[categorySlug]/page.tsx`, `/[locale]/products/[categorySlug]/[productSlug]/page.tsx` (detail: gallery, variants, specs table, price display via `Intl.NumberFormat` per locale region, Bdi-wrapped SKU).
- Rendering: `generateStaticParams` for locales only; pages dynamic-with-ISR (`revalidate = 3600`, on-demand invalidation hook reserved for admin P08). Not-found/locale-validation via existing routing.
- Components: `ProductCard`, `Gallery`, `SpecTable`, `FilterPanel` (server-action friendly), `SortSelect`, `Pagination` — all logical-property CSS, keyboard accessible, RTL-mirrored, focus-visible states.
- Register `products`, `products/[...]` in route registry so LocaleSwitcher preserves them; extend metadata generator per-page (title/description from DB paired fields, OG images from Media when present).
- Message keys added to `messages/*.json` (UI chrome only).

**Acceptance:** empty-but-valid catalogue renders placeholder state in both locales ("no products yet" — factual, not invented claims); sample seed visible only when `?showSamples=1` or dev flag; Lighthouse-style manual checks logged honestly; horizontal-overflow check on `/ar` detail page.

### M5 — Search/Filter/Sort Integration + SEO
- Wire query builder to URL search params (`q`, `cat`, `attr:*`, `minPrice/maxPrice`, `sort`, `page`) with Zod-parsed safe values; preserve allowlist in locale switch (extend existing `paths.ts` allowlist deliberately).
- Category sitemap (`app/sitemap.ts`) locale-aware; robots already scaffolded? verify; hreflang pairs for catalogue pages (only when CFG-06 set — otherwise remain suppressed).

**Acceptance:** deep-linkable filtered URLs identical across reloads; malformed params ignored gracefully; no open-redirect via params (tests).

### M6 — Quality Gate & Close-out
- Full battery: `npx vitest run` (incl. new core + component + route-registry tests), `npm run lint` (custom RTL rule active), `npm run typecheck`, `npm run build`, production server :3111 HTTP verification of new routes in both locales.
- Docs update: IMPLEMENTATION_STATUS (M-results, actual numbers), DECISIONS (any new ADR — e.g. cursor-vs-offset pagination choice), PHASE03_PLAN marked completed/blocked sections.
- Commit(s): `Phase 03: catalogue schema + services`, `Phase 03: storefront catalogue pages`. No push/deploy.

---

## 4. Dependency Matrix — CFG-01 Split (explicit)

| Work | Needs PostgreSQL (CFG-01)? | Notes |
|---|---|---|
| M0, M1 (schema authoring + offline migration SQL), M2 (services + unit tests with fake client), M4/M5 code authoring & type/lint/test cycle against mocks | **No** | Majority of Phase 03 proceeds without credentials. |
| M3 apply/deploy, integration tests hitting real DB, seeding, ISR pages rendering real rows, M5 sitemaps from DB | **Yes — hard block** | Cannot fabricate a connection string; CFG-01 stays ❌ until owner provides URL. |
| Canonical/hreflang activation | CFG-06 | Remains suppressed by design; do not invent domain. |
| Product images binaries | CFG-05 (storage) | Schema + placeholders now; uploads later. Media rows reference `storageKey` strings only. |

**Risk note:** writing M4 pages that assume a live DB risks silent breakage at M3. Mitigation: data-access layer behind `src/lib/db.ts` interface with a `CatalogRepository` port; pages consume the port; a `MemoryCatalogRepository` fixture powers dev/tests until CFG-01 lands (this is a testing seam, not invented business data).

---

## 5. Business Inputs Still Missing (must NOT be invented)
- BIZ-01 brand/legal entity name (header placeholder remains).
- BIZ-02 real product list, prices, stock counts, warranty terms → sample-only seeds with `isSample=true`.
- BIZ-03 VAT/tax registration numbers & rates per market → `TaxRate` rows seeded only after confirmation; storefront shows "prices exclude VAT" legal-note pending (existing footer placeholder).
- BIZ-05 Arabic content ownership/translation workflow → `needsTranslation` report provided, no auto-machine-translated content shipped silently.
- BIZ-06 shipping/fulfilment policies → does not affect read-only catalogue pages.
- CFG-06 site URL → canonical/hreflang stay suppressed.

## 6. Acceptance Criteria (Phase 03 overall)
1. All catalogue/pricing/inventory entities exist as Prisma models matching DATA_MODEL §2–4 field-for-field (deviation log kept in PR notes).
2. Migration SQL authored offline; applied successfully the moment CFG-01 is available (or earlier if provided during the phase).
3. Zero fabricated business data reachable in production builds; sample data unmistakably flagged.
4. `/en` & `/ar` listing + detail pages render, mirror correctly, pass custom RTL lint rule, keyboard-accessible, bidi-safe SKUs.
5. Locale switch preserves catalogue routes incl. allowlisted query params; unknown routes fall back safely.
6. Full suite passes (count reported honestly), lint/typecheck/build green, runtime HTTP checks recorded with actual outputs.
7. Admin-ready boundaries proven: mutations require ActorContext; no direct Prisma access from route handlers/UI components (lint-enforced import boundary).
8. Documentation updated; CFG/BIZ registers reflect reality; Phase 02 checkpoint either closed or explicitly carried.

## 7. Suggested Execution Order After Approval
M0 (close Phase 02 debt) → M1 → M2 → **[await CFG-01]** → M3 → M4 → M5 → M6.
If CFG-01 arrives mid-phase, M3 can interleave after M2. If it does not arrive, deliverables stop at M2 + mock-backed M4/M5 preview mode, and the blocker is reported rather than worked around with fake infrastructure.
