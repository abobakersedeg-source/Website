# Golf Cart GCC — Architecture

**Status:** Approved-for-build (pending owner confirmation of open items) · **Date:** 2026-10-28
**Companion docs:** `PROJECT_PLAN.md`, `DATA_MODEL.md`, `DECISIONS.md`, `IMPLEMENTATION_STATUS.md`

---

## 1. System Overview

```
                        ┌──────────────────────────────┐
   Browsers (EN/AR)     │        Edge / CDN            │
  ─────────────────────►│  (Vercel Edge or Cloudflare) │
                        └──────────────┬───────────────┘
                                       ▼
                     ┌─────────────────────────────────────┐
                     │        Next.js 16 App Router        │
                     │  ┌───────────────┐ ┌─────────────┐  │
                     │  │ RSC Pages     │ │ Route       │  │
                     │  │ /[locale]/**  │ │ Handlers    │  │
                     │  └──────┬────────┘ │ /api/*,webhook│ │
                     │         │          └──────┬──────┘  │
                     │         ▼                 ▼         │
                     │  ┌───────────────────────────────┐  │
                     │  │  Service layer (src/lib/**)   │  │
                     │  │  catalog·cart·order·payment·  │  │
                     │  │  quote·service·crm·notify     │  │
                     │  └───────────────────────────────┘  │
                     └───────┬───────────┬─────────┬───────┘
                             ▼           ▼         ▼
                    ┌────────────┐ ┌──────────┐ ┌─────────────────┐
                    │ PostgreSQL │ │ Object   │ │ External APIs   │
                    │ + Prisma   │ │ Storage  │ │ Stripe/Telr,    │
                    │            │ │ (R2/S3)  │ │ Resend/SES,     │
                    └────────────┘ └──────────┘ │ GA4, Maps, SMS  │
                                                └─────────────────┘
```

**Model:** Modular monolith. One deployable Next.js app containing storefront and admin (`/[locale]/admin`), talking to Postgres via Prisma. Side-effects (emails, webhooks processing) run in Route Handlers with a persistent job pattern; if volume grows, extract workers without changing module boundaries.

**Why not micro-headless-commerce (Medusa/SaleStore/Shopify)?** Requirements are domain-specific (quotations, service requests, fleet CRM) and bilingual RTL is first-class. A monolith with clean module seams is faster to build, cheaper to host, and still decomposable later. Recorded as ADR-001.

---

## 2. Repository Layout (target state after Phase 01–03)

```
/workspace
├── main                          # pre-existing file, preserved untouched
├── docs/                         # this document set
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                   # demo catalogue, both locales, NO invented business prices → flagged sample data
├── messages/
│   ├── en.json                   # UI dictionary English
│   └── ar.json                   # UI dictionary Arabic
├── src/
│   ├── app/
│   │   ├── [locale]/             # locale-prefixed public site
│   │   │   ├── layout.tsx        # <html lang dir> injection
│   │   │   ├── page.tsx          # home (CMS blocks)
│   │   │   ├── products/…
│   │   │   ├── categories/[slug]/
│   │   │   ├── cart/  checkout/
│   │   │   ├── account/…         # orders, addresses, quotes, service requests
│   │   │   ├── quote-request/    # RFQ
│   │   │   ├── service/request/
│   │   │   └── admin/            # back office (role-guarded)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── webhooks/stripe/route.ts
│   │   │   └── health/route.ts
│   │   └── sitemap.ts  robots.ts
│   ├── core/                     # framework-free domain logic
│   │   ├── catalog/  pricing/  inventory/  cart/  order/
│   │   ├── payment/              # PaymentProvider interface + adapters
│   │   ├── quotation/  service/  crm/  notification/
│   │   └── shared/               # money, ids, state machines, errors
│   ├── db/                       # prisma client singleton, repositories
│   ├── lib/                      # auth config, env (zod-validated), i18n config, storage adapter
│   ├── components/               # ui/, layout/, commerce/, admin/
│   └── middleware.ts             # locale negotiation, route guards
├── .env.example                  # names only, no values
├── next.config.ts  tailwind.config*  tsconfig.json  eslint.config.*
```

*(Tailwind v4 uses CSS-first config; final form decided at scaffold time.)*

Layering rule: `app/ → components/ → core/ → db/`. UI never imports Prisma directly except Server Components calling `core` services; `core` has zero Next.js imports → testable without a browser.

---

## 3. Frontend Architecture

### 3.1 Rendering strategy
| Surface | Strategy | Reason |
|---|---|---|
| Home, category, product pages | SSG/ISR (`revalidateTag` on admin publish) | SEO, speed, cheap hosting |
| Cart, checkout, account | Dynamic Server Components + Server Actions | Fresh state, auth-aware |
| Admin | Dynamic, `noindex` | Private |
| Search | DB-backed full-text (Postgres `tsvector`) at launch; Meilisearch/Typesense only if catalogue > ~5k SKUs | Avoid infra before needed |

Caching tags: `product:{id}`, `category:{slug}`, `pricelist:{market}` — invalidated by admin mutations via `revalidateTag`.

### 3.2 State management
- Server state = RSC/Server Actions (default).
- Client ephemeral state = Zustand stores (`cartStore` hydrated from server cart cookie; `uiStore`).
- Forms = React Hook Form + Zod resolver (schema shared with server).

## 4. Internationalization & RTL Design (first-class requirement)

### 4.1 Routing & negotiation
- `next-intl` with locale-prefixed paths: `/en/...`, `/ar/...`; default `en`, redirect `/` by `Accept-Language` (GCC visitors land correctly on `/ar`).
- `middleware.ts`: locale detection → rewrite; sets `x-locale` for server code.
- hreflang alternates + per-locale canonical emitted from metadata API; localized slugs for key routes (e.g. `/ar/المنتجات/...` optional — decision: keep Latin slugs in both locales for operational simplicity, documented ADR-007).

### 4.2 Direction handling
- Root layout renders `<html lang={locale} dir={dir}>` where `dir = locale === 'ar' ? 'rtl' : 'ltr'`.
- **Logical CSS everywhere:** Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-0`, `end-0`, `text-start`) instead of left/right; mirrored icons/arrows via `rtl:-scale-x-100`.
- `rtl:` / `ltr:` variants for the rare non-flippable cases (carousels, maps overlays).
- Numbers/currency/dates via `Intl.NumberFormat(locale)` — Arabic uses Eastern Arabic numerals setting configurable per market preference (**business input**: GCC e-commerce commonly keeps Western numerals; do not assume — expose as setting).
- Fonts: Latin stack + Arabic stack (e.g. IBM Plex Sans Arabic / Noto Kufi Arabic via `next/font`); line-height tuned for Arabic diacritic space.
- Bidirectional text safety: product names/prices inside Arabic sentences wrapped with isolation (`unicode-bidi: isolate`) to prevent mirroring of model codes like "GX-200".

### 4.3 Content vs UI translation
- **UI strings:** JSON dictionaries `messages/{en,ar}.json` namespaced by module.
- **Domain content** (product names, descriptions, categories, CMS blocks): stored in DB with per-locale columns (`nameEn/nameAr`, or i18n JSON map — see DATA_MODEL §3). Fallback rule: missing Arabic shows English with an admin "needs translation" report; never blank.

## 5. Backend Architecture

### 5.1 Service layer contracts (illustrative)
```ts
// core/payment/provider.ts
interface PaymentProvider {
  createIntent(order: OrderDraft): Promise<IntentResult>;   // returns client token/url
  confirmReference(ref: string): Promise<PaymentStatus>;
  handleWebhook(req: Request): Promise<WebhookEvent>;
  refund(paymentId: string, amount: Money): Promise<RefundResult>;
}
// adapters: stripeAdapter (build first), telrAdapter/hyperpayAdapter/tapAdapter (on credentials),
// codAdapter + bankTransferAdapter (manual confirmation, no external creds)
```
Same adapter pattern for `NotificationChannel` (email, whatsapp), `StorageProvider` (R2/S3), `IdGenerator`.

### 5.2 Key flows
- **Checkout:** Server Action validates cart → creates `Order(placed)` + `PaymentIntent` → redirect to gateway → webhook marks `paid` → reservation converts to stock movement → emails queued.
- **Quotation:** RFQ form → CRM lead + `Quote(draft)` → rep edits lines/discount in admin → send (PDF via headless render) → customer accepts via signed link → converts to Order.
- **Service request:** form (asset serial, issue type, photos upload to storage) → `ServiceTicket(new)` → dispatch in admin → status emails.

### 5.3 IDs & money conventions
- Public IDs: prefixed ULIDs (`gct_…`) to avoid enumerable PKs.
- Money: integer minor units + `currency` column; all arithmetic in `core/shared/money.ts`; rounding policy documented (round half-up at line level, VAT computed per line then summed).

### 5.4 API surface
- Server Actions for all form mutations (CSRF-safe by default).
- REST-like route handlers only for: webhooks, health, optional future mobile/API consumers (`/api/v1/*`, versioned).

## 6. Security & Authorization
- Auth.js credentials (bcrypt/argon2 hash), HttpOnly sessions; role claims (`CUSTOMER, SALES, SERVICE_TECH?, WAREHOUSE, ADMIN`) enforced in every server entrypoint (helper `requireRole()`), not just UI hiding.
- Rate limiting on auth/RFQ/contact endpoints (Upstash Redis optional; simple DB-token bucket first).
- Input validation with Zod at every boundary; Prisma parameterizes queries.
- Webhook signature verification per provider; idempotency keys on event processing.
- CSP headers, secure cookies, audit log table for admin mutations.
- PII minimization; privacy stance aligned to KSA PDPL/UAE PDPL pending legal input.

## 7. Observability & Quality
- Sentry (client+server) once DSN provided; structured JSON logs with request id.
- CI (GitHub Actions): install → lint → typecheck → unit tests (Vitest on `core/`) → `next build` → (with DB secret) `prisma migrate diff` drift check.
- E2E smoke (Playwright) added Phase 06+: browse EN+AR, add to cart, mock checkout.

## 8. Performance Targets
- LCP < 2.5s on 4G mid-tier; images AVIF/WebP via `next/image` with remote loader for storage CDN; ISR for catalogue; bundle budgets enforced in CI (size-limit) — storefront JS < 170KB gz initial.

## 9. Environments & Config
| Env | Purpose | DB | Notes |
|---|---|---|---|
| local dev | coding | managed Postgres (Neon branch) *or* Docker on host — **blocked until one is available** | `.env.local` |
| staging | UAT w/ business owner | separate DB | test-mode gateways |
| production | live | managed Postgres w/ PITR backups | real keys, least-privilege |

All configuration through zod-validated `src/lib/env.ts`; every variable listed in `.env.example` (names only). Feature flags table in DB for phased capability rollout (payments method enablement per market).

## 10. Scale Path (documented, not built now)
Single region acceptable (Mumbai/Bahrain/Frankfurt edge proximity good for GCC). If traffic/catalogue grows: read replicas, Meilisearch, queue (SQS/Upstash) for notifications, image pipeline. Module seams already match this decomposition.
