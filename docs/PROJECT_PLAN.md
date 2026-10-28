# Golf Cart GCC — Project Plan

**Document status:** Draft v1.0 — Architecture & Planning Phase (Phase 00)
**Date:** 2026-10-28
**Repository state at time of writing:** Empty greenfield (single commit `7683b33 "Create main"` containing only a blank file `main`). No application code, no configuration, no dependencies.

---

## 1. Vision & Scope

A standalone, bilingual (English / Arabic with full RTL support) e-commerce platform for golf carts and related products/services, targeting:

- **GCC markets:** Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman
- **International markets:** export customers, resort/fleet buyers, and resale partners

The platform combines a retail storefront with B2B capabilities (quotations, bulk/fleet pricing), a services arm (service requests, spare parts), lightweight built-in CRM, and a full administration back office.

### In scope (product vision)
| Area | Summary |
|---|---|
| Storefront | Catalogue, product detail with variants, cart, checkout, search, category browsing |
| i18n | English + Arabic, RTL layouts, localized currency/format, per-locale content |
| Pricing & Inventory | Multi-currency price lists, variant-level stock, low-stock alerts |
| Customers | Registration, profiles, address book, order history, wishlist |
| Auth | Email/password + phone/OTP (later), role-based access (customer/staff/admin) |
| Orders | Lifecycle from placement to fulfilment, invoicing (VAT-compliant), shipping |
| Payments | Online gateway(s) + cash-on-delivery / bank transfer options for GCC |
| Quotations | RFQ workflow for fleet/B2B buyers, quote → order conversion |
| Service requests | Maintenance/repair booking, serial-number capture, status tracking |
| CRM | Leads, inquiries, customer timeline, notes, pipeline for quotations |
| Admin | Back office for catalogue, orders, inventory, content, users, settings |

### Out of scope (explicitly, for now)
- Native mobile apps
- Marketplace/multi-vendor selling
- Manufacturing/ERP integration (may become an integration later)
- Custom financing/lending engine

---

## 2. Current State Assessment (verified, not assumed)

| Check | Result |
|---|---|
| Git history | 1 commit; branch `main` (+ working branch). Only file: `main` (empty/newline). |
| Framework present | **None.** Project is *new/greenfield* — nothing to preserve except the empty `main` file and git history. |
| Node.js | v20.20.2 available |
| npm | 10.8.2 available (pnpm/yarn not installed) |
| Network to npm registry | Working (`next@16.4.3`, `react@19.3.1`, `tailwindcss@4.3.3`, `prisma 8.x RC / @prisma/client 7.10.1` resolvable) |
| PostgreSQL client/server | **Not installed** in this environment (`psql`, `pg_isready` absent) |
| Docker | **Not installed** |
| Python | 3.12.10 (not needed for this stack) |

**Consequence:** The repository can be scaffolded immediately (Node + npm + network are ready), but a database must be provisioned externally (managed Postgres, e.g. Neon/Supabase/RDS) or via Docker on the developer's machine. This is recorded as an outstanding configuration item (see §6 and DECISIONS.md).

---

## 3. Recommended Stack (summary — rationale in ARCHITECTURE.md / DECISIONS.md)

- **Framework:** Next.js (App Router) + TypeScript, React 19
- **Styling:** Tailwind CSS v4 (RTL-first via logical properties + `rtl:`/`ltr:` variants)
- **i18n:** next-intl, locale-prefixed routing (`/en/...`, `/ar/...`)
- **Database:** PostgreSQL 16+
- **ORM/Migrations:** Prisma
- **Auth:** Auth.js (NextAuth v5) credentials + session JWT, roles table
- **Validation:** Zod everywhere (forms, API, env)
- **State:** Server Components first; Zustand for cart/UI ephemeral state
- **Payments:** Stripe (international) as primary adapter; architecture keeps a provider abstraction so a GCC gateway (Telr/HyperPay/Tap/PayTabs) can be added without touching core flows
- **Storage:** S3-compatible object storage (Cloudflare R2 / AWS S3 / Wasabi) behind an adapter
- **Email:** Transactional provider (Resend / Postmark / SES) with Arabic + English templates
- **Deployment target:** Vercel (or self-hosted Node) — decision deferred until infra owner confirms

---

## 4. Module Map (high level)

1. **Catalog:** Product, Category (tree), Variant (model/battery/colour/seats…), Attributes, Media, SEO fields — bilingual content.
2. **Pricing:** PriceLists (currency + market + segment incl. B2B tiers), taxes (VAT 15% KSA / 5% UAE, configurable), promotions.
3. **Inventory:** Per-warehouse stock, reservations against open orders, movements ledger, reorder points.
4. **Customers & Auth:** Accounts, addresses, roles/permissions, sessions, audit trail.
5. **Cart & Checkout:** Server-cart persisted for guests, promo codes, shipping methods by market.
6. **Orders:** State machine (draft → placed → confirmed → preparing → shipped/out for delivery → delivered → cancelled/refunded), VAT invoice numbers.
7. **Payments:** PaymentIntent-style flow, webhooks, reconciliation, COD/bank-transfer manual confirmation.
8. **Quotations (RFQ):** Request → sales response (line items, validity, discount) → accept → convert to Order.
9. **Service Requests:** Booking type, asset/serial capture, scheduling, technician notes, status, linked parts/orders.
10. **CRM:** Leads/inquiries (from contact forms, RFQs, service calls), pipeline stages, activity timeline, assignment to reps.
11. **CMS/Admin:** Homepage blocks, banners, pages (about/terms), translations editor, settings (markets, currencies, tax rates, shipping zones).
12. **Notifications:** Order/quote/service emails + optional WhatsApp hook (provider TBD — business input required).

Full entity detail: see `DATA_MODEL.md`.

---

## 5. Phased Implementation Sequence

> Each phase ends with a demoable increment and passing checks (typecheck, lint, build, unit tests where applicable).

| Phase | Name | Deliverables | Est. effort |
|---|---|---|---|
| **00** | Discovery & Architecture *(this document set)* | Repo inspection, plan, architecture, data model, decisions, status log | Done (this phase) |
| **01** | Foundation Scaffold | `create-next-app` TS + Tailwind + ESLint; repo layout; CI checks (lint/typecheck/build); `.env.example`; Prisma init; Postgres connection strategy resolved; health page deployed locally | 1–2 days |
| **02** | i18n & RTL Shell | next-intl routing `/[locale]`, en/ar dictionaries, RTL layout system, header/footer/nav, font strategy (incl. Arabic webfont), language switcher, localized formatting | 2–4 days |
| **03** | Core Data Model | Prisma schema for catalog/pricing/inventory + migrations + seed script (sample carts/categories, both locales) | 3–5 days |
| **04** | Auth & Users | Auth.js credentials flow, registration, roles, admin bootstrap account, profile & addresses | 3–4 days |
| **05** | Catalog Storefront | Category listing, product detail w/ variants & gallery, search & filters, sitemap/SEO metadata per locale | 5–8 days |
| **06** | Cart & Checkout | Guest+user cart, shipping zones/methods, tax calculation, address forms (GCC-friendly, optional postal code) | 5–7 days |
| **07** | Payments | Stripe adapter live in test mode; webhook handling; COD/bank-transfer path; order confirmation emails | 5–8 days |
| **08** | Orders & Fulfilment (Admin) | Order list/detail, status transitions, invoice generation, inventory decrement, notifications | 5–7 days |
| **09** | Quotations & CRM | RFQ form → quote builder → email → accept/convert; CRM pipeline & timeline | 6–9 days |
| **10** | Service Requests | Booking flow, statuses, admin dispatch view | 4–6 days |
| **11** | CMS & Hardening | Content blocks, banner management, translation editing, RBAC polish, rate limiting, security review, performance (Core Web Vitals), Lighthouse ≥ 90 | 5–8 days |
| **12** | Launch Prep | Staging cutover, DNS, analytics, backup/restore runbook, UAT checklist, go/no-go | 3–5 days |

Recommended build order rationale: foundation → i18n shell before features so every screen is born bilingual (retro-fitting RTL is expensive); data model before UI so forms/APIs share one source of truth; payments isolated behind an adapter because vendor choice needs business credentials.

---

## 6. External Dependencies Requiring Credentials (to be supplied by business owner)

| Dependency | Purpose | Candidate providers | Needed values | Status |
|---|---|---|---|---|
| PostgreSQL | Primary DB | Neon / Supabase / RDS / self-hosted Docker | `DATABASE_URL` | ❌ Not provisioned |
| Payments (international cards) | Checkout | Stripe | publishable/secret keys, webhook signing secret | ❌ Account not confirmed |
| Payments (GCC local) | MADA, KNET, QNB, benefitgo, Apple Pay | Telr / HyperPay(now Tamara/HyperPay) / Tap / PayTabs | Merchant account per country, API keys | ❌ Business decision pending |
| Object storage | Product images, invoices | Cloudflare R2 / AWS S3 / Wasabi | bucket, access key/secret, public CDN URL | ❌ |
| Transactional email | Order/quote/service mail | Resend / Postmark / Amazon SES | API key, verified sending domain (brand domain!) | ❌ |
| Analytics | Product insight | GA4 / Plausible / PostHog | measurement ID / API key | ❌ |
| WhatsApp/SMS (optional) | OTP & notifications | Twilio / MessageBird / Unifonic (KSA) | account SID/token, approved template IDs | ❌ |
| Maps/delivery | Address autocomplete, delivery zones | Google Maps Platform | API key (billing enabled) | ❌ |
| Error monitoring | Ops | Sentry | DSN | ❌ |
| Hosting/CI | Deploy | Vercel (recommended) / self-host | project token, env vars | ❌ |
| CRM (external?) | Sales team tooling | **Built-in lightweight CRM decided**; HubSpot/Zoho only if mandated | API key if external chosen | ⚠️ Confirm no existing CRM mandate |

**No credential values have been invented anywhere in this project.** All secrets will enter via `.env` (never committed); `.env.example` will ship with placeholder names only.

---

## 7. Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Payment gateway choice unresolved (Stripe does not cover MADA/KNET natively) | Blocks Phase 07 revenue path | High | Provider-agnostic payment adapter (ADR-006); launch COD/bank-transfer first if needed |
| R2 | No Postgres/Docker in dev container | Blocks migrations work | Medium | Use managed DB (Neon free tier) once credentials arrive; meanwhile schema/migrations authored & tested via local ephemeral option or CI |
| R3 | Bilingual content doubles authoring effort | Delays launch | Medium | next-intl dictionaries + admin translation editor; seed structure with placeholders flagged `needsTranslation` |
| R4 | VAT/tax rules differ per GCC country | Compliance risk | Medium | TaxRate per market/country, effective-dated; ZATCA e-invoicing noted as future integration (business input needed) |
| R5 | Prisma 8 still RC; 7.x stable | Toolchain churn | Low | Pin stable line (`prisma@7.x/@prisma/client@7.10.1`), upgrade in a dedicated task |
| R6 | Undefined business facts (catalog, prices, brand, domains, shipping policy) | Wrong assumptions baked into code | High | §8 Open Questions; all such values stay as seeds/config, never hard-coded guesses |
| R7 | Currency/FX volatility AED/SAR/USD quotes | Quote validity losses | Medium | Quotes store currency + snapshot prices + validity window |
| R8 | SEO duplication across locales | Ranking loss | Low | hreflang alternates, canonical per locale, single sitemap index |

---

## 8. Missing Business Information (must be provided — do not invent)

1. **Brand identity:** legal company name(s), trade licence jurisdictions, logo, brand colours, domain(s) (e.g. golfcart.sa / .ae?).
2. **Product catalogue:** actual SKU list, models, variants, specs, images, cost & sell prices, initial stock levels, supplier lead times.
3. **Target market priority:** which GCC countries first? International shipping capability & restrictions (batteries are dangerous goods for air freight!).
4. **Payment merchant accounts:** does the business already hold Stripe/Telr/HyperPay/Tap/PayTabs accounts? Which local methods are mandatory (MADA, KNET, benefitgo)?
5. **Tax registration:** VAT numbers per country; need for e-invoicing (ZATCA Phase 2 in KSA) at launch.
6. **Fulfilment model:** own warehouse(s) location(s)? 3PL? Delivery fleet vs courier? Installation/on-site handover for carts?
7. **Service operation:** in-house technicians vs partner network; service areas; SLA commitments.
8. **Sales process for B2B/fleet:** who approves discounts? Quote validity policy? Contract terms?
9. **Existing systems:** any current CRM/ERP/accounting (Zoho, Odoo, QuickBooks?) that must integrate? Any legacy customer data to migrate?
10. **Contact details for storefront:** phone(s), WhatsApp number, email, physical address(es), business hours per market.
11. **Content ownership:** who writes/translation-reviews Arabic copy?
12. **Analytics/marketing stack:** existing GA4 property, Meta/TikTok pixels for retargeting?
13. **Legal:** return/warranty policy text, privacy policy jurisdiction (PDPL KSA, UAE PDPL), terms of sale.
14. **Team/hosting preference:** who owns deployment? Vercel acceptable? Budget ceilings for infra/SaaS.
15. **Timeline & launch target date**, plus any trade-show/deadline driving it.

These are tracked as blocking/non-blocking items in `IMPLEMENTATION_STATUS.md`.

---

## 9. Acceptance Criteria for Phase 00 (this phase)

- [x] Repository inspected; actual state reported with evidence (git log, file list, tool versions, registry reachability).
- [x] Framework selection documented with rationale and alternatives considered.
- [x] Existing files preserved (only the empty `main` exists; untouched).
- [x] Bilingual EN/AR + RTL design documented.
- [x] All requested modules defined (products, categories, variants, pricing, inventory, customers, auth, orders, payments, quotations, service, CRM, admin).
- [x] External credential dependencies enumerated; none fabricated.
- [x] Five planning documents created under `docs/`.
- [x] Implementation sequence, risks, acceptance criteria written.
- [x] Next step (Phase 01) unambiguously specified.

## 10. Definition of Done (per feature phase — standing rule)

1. TypeScript strict passes; ESLint clean; `next build` succeeds.
2. Works in **both** locales; Arabic screenshots reviewed for layout mirroring.
3. Zod validation on every input boundary; server-side authorization checks.
4. Migration reversible; seed updated; PR includes test evidence.
5. No secrets in repo; new env vars added to `.env.example` + docs.
