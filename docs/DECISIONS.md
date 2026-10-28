# Golf Cart GCC — Architecture Decision Records (ADR)

Format: each ADR = Context → Decision → Alternatives → Consequences. Status values: **Accepted / Proposed / Deferred / Superseded**. All decisions below were made on 2026-10-28 unless noted. Evidence from environment inspection is cited where relevant.

---

## ADR-001 — Modular monolith on Next.js App Router (not microservices, not SaaS platform)
**Status:** Accepted
**Context:** Greenfield repo verified empty (single commit containing only blank file `main`). Requirements span storefront + B2B quotations + service desk + CRM + admin; team size small; domain logic specific to golf-cart commerce in GCC; bilingual RTL mandatory.
**Decision:** One Next.js (App Router, TypeScript) application containing storefront and admin, with a framework-free `src/core/<module>` service layer so modules can be extracted later if scale demands.
**Alternatives considered:** Shopify (rejected: weak fit for RFQ/service/CRM workflows, limited RTL control, monthly fees, lock-in); Medusa/Saleor headless (rejected for now: heavy ops surface, still need custom quote/service/CRM modules, weaker first-party i18n-RTL ergonomics); microservices (rejected: unjustified operational cost).
**Consequences:** Fast single-repo iteration; discipline required to keep module boundaries (`core/` must not import Next.js APIs); future extraction path preserved by adapter interfaces.

## ADR-002 — PostgreSQL as primary database
**Status:** Accepted
**Context:** Relational integrity needed for orders/inventory/quotations; strong transactional guarantees; JSONB available for flexible specs/snapshots; stated preference for Postgres.
**Decision:** PostgreSQL 16+ via managed provider (preferred: Neon or Supabase during development; RDS/Cloud SQL acceptable for production pending infra owner input).
**Alternatives:** MySQL/MariaDB (fine but less JSONB/citext/tsvector convenience), MongoDB (rejected: relational reporting/integrity pain), SQLite (rejected: multi-instance deploy limits; acceptable only as throwaway local test DB).
**Consequences:** Requires provisioning a reachable server — **currently blocked**: no `psql`/Docker found in dev container (verified). Tracked in IMPLEMENTATION_STATUS.md as CFG-01.

## ADR-003 — Prisma as ORM/migration tool, pinned to stable line
**Status:** Accepted
**Context:** npm registry reachable from dev environment; latest resolvable versions observed: `prisma@8.0.0-rc.28`, `@prisma/client@7.10.1`. Type-safety and migration workflow favored by team preference.
**Decision:** Use Prisma with the current **stable** client line (7.x); schema authored per DATA_MODEL.md; real migrations (no `db push`) committed once a DB exists. Re-evaluate Prisma 8 GA in a dedicated upgrade task.
**Alternatives:** Drizzle (lighter SQL-first; acceptable fallback if Prisma friction appears — revisitable before Phase 04), Kysely + raw SQL (too much boilerplate for CRUD-heavy admin).
**Consequences:** Excellent DX/type safety; vendor coupling to Prisma CLI; RC-version trap avoided by pinning.

## ADR-004 — Tailwind CSS v4 with RTL-first logical utilities
**Status:** Accepted
**Context:** Arabic RTL is a launch requirement, not an afterthought. Latest registry version observed: `tailwindcss@4.3.3`.
**Decision:** Tailwind v4; enforce logical-property utilities (`ms-/me-/ps-/pe-/start-/end-/text-start`) by lint rule; `rtl:`/`ltr:` variants only for genuinely non-flippable cases; dir set at `<html>` per locale.
**Alternatives:** CSS Modules + manual RTL build (more work), `postcss-rtl` auto-flip plugin (fragile), styled-components (runtime cost, SSR complexity).
**Consequences:** Team must follow utility conventions (enforced in review checklist); older Tailwind tutorials may mislead — internal style guide page added later.

## ADR-005 — next-intl with locale-prefixed routes `/[locale]/…`
**Status:** Accepted
**Context:** Need SEO-indexable EN+AR pages, hreflang, localized formatting, middleware-based negotiation. Registry: `next-intl@4.14.9`.
**Decision:** next-intl; locales `en` (default) and `ar`; URL structure `/en/...`, `/ar/...`; Accept-Language redirect at root; UI strings in JSON dictionaries; domain content translated in DB (paired columns) per DATA_MODEL.
**Alternatives:** `i18next` + custom routing (more glue), next-i18next (Pages-router oriented — wrong router), subdomains per language (worse canonical management, cert/DNS overhead).
**Consequences:** All routes gain `[locale]` segment early (cheap now, expensive later); sitemap/hreflang helpers standardized in one module.

## ADR-006 — Payment provider abstraction; Stripe adapter first; COD/bank-transfer day one
**Status:** Accepted
**Context:** No merchant accounts exist yet (verified: zero credentials in repo/environment). Stripe covers international cards + Apple/Google Pay but not MADA/KNET/benefitgo natively; GCC-local gateways (Telr, HyperPay/Tamara, Tap, PayTabs) require per-country merchant onboarding we don't control.
**Decision:** Define `PaymentProvider` interface (createIntent/confirm/webhook/refund). Build adapters: (1) `cod` & `bankTransfer` (manual confirmation — no external creds, unblocks launch), (2) `stripe` (test mode as soon as keys arrive). GCC gateway selection deferred until business confirms accounts.
**Alternatives:** Direct Stripe-only coupling (rejected: would force re-platforming when Telr etc. chosen); aggregators (revisit as candidates).
**Consequences:** Extra indirection justified by real multi-gateway horizon; webhook idempotency table designed once, reused per provider.

## ADR-007 — Latin slugs shared across both locales
**Status:** Accepted
**Context:** Fully Arabic URLs are SEO-valid but complicate CMS operations, analytics, link sharing, and uniqueness handling.
**Decision:** Slugs stay Latin/transliterated and identical in both locales; page titles/descriptions carry the Arabic keywords.
**Alternatives:** Per-locale slugs (better Arabic SEO, higher ops cost — revisit post-launch with Search Console data).
**Consequences:** Simpler canonicalization and redirects; slight SEO trade-off accepted knowingly.

## ADR-008 — Auth.js (NextAuth v5) credentials + role claims; phone/OTP deferred
**Status:** Accepted
**Context:** Email/password sufficient for launch; SMS OTP needs Twilio/Unifonic credentials (unavailable) and budget approval.
**Decision:** Auth.js Credentials provider, JWT sessions, bcrypt password hashing, roles CUSTOMER/SALES/SERVICE_COORDINATOR/WAREHOUSE/CONTENT_EDITOR/ADMIN enforced server-side. Social login (Apple/Google) stub-ready config, enabled when app registrations provided.
**Alternatives:** Clerk/Auth0 (fast but per-MAU cost + PII residency concerns for GCC — reconsider if auth ops burden grows); Lucia (maintenance status risk).
**Consequences:** Self-hosted auth keeps data in our DB; we own rate limiting & email verification flows.

## ADR-009 — Transactional outbox for all notifications
**Status:** Accepted
**Context:** Order/quote/ticket emails must never be lost to provider downtime; WhatsApp/SMS providers not yet selected.
**Decision:** Domain events write `OutboxMessage` rows in the same transaction; a processor (cron/route handler initially) dispatches through channel adapters (email first).
**Alternatives:** Fire-and-forget SDK calls (lossy), external queue from day one (premature infra).
**Consequences:** Reliable retries/idempotency; adds one polling worker to operate.

## ADR-010 — Built-in lightweight CRM instead of external integration
**Status:** Accepted (contingent — see PROJECT_PLAN §8 item 9)
**Context:** Requirement list includes CRM; no existing CRM subscription discovered in the environment/repo; sales team size unknown.
**Decision:** Implement Lead/Activity/Pipeline tables inside the app (DATA_MODEL §9). Keep source/assignment fields shaped so a HubSpot/Zoho sync could be added later without schema change.
**Alternatives:** HubSpot free tier / Zoho CRM integration (adds per-seat cost + credential dependency; choose this instead **only if business already owns it**).
**Consequences:** One system of record for quotes+leads+service tickets; must resist scope creep toward full sales automation.

## ADR-011 — Money & tax representation
**Status:** Accepted
**Context:** Multi-currency GCC markets; VAT regimes differ per country; floating-point money bugs are unacceptable.
**Decision:** Integer minor units + explicit currency everywhere; prices live in PriceLists bound to market/segment; TaxRate is effective-dated config requiring finance sign-off; snapshot into order lines. Indicative FX display only.
**Alternatives:** Store base currency + convert at read time (rejected: legal invoices must match charged currency).
**Consequences:** Clean audit trail; requires disciplined seeding of price lists when catalogue arrives.

## ADR-012 — Hosting target Vercel recommended, decision deferred
**Status:** Proposed (needs owner confirmation)
**Context:** No deployment infrastructure present in repo; ISR/Edge middleware favor Vercel; some GCC businesses prefer regional/self-hosted for data-residency comfort (PDPL considerations).
**Decision:** Default recommendation Vercel (preview envs, ISR, simple ops). If owner mandates self-host: Docker image + Node standalone output + managed Postgres in-region; architecture unaffected either way.
**Consequences:** Env-var/secret management plan differs slightly; both paths documented in ARCHITECTURE §9.

## ADR-013 — Object storage: S3-compatible behind StorageProvider adapter
**Status:** Accepted (provider choice pending credentials)
**Context:** Product imagery is the heaviest asset class; no bucket exists yet.
**Decision:** Adapter interface `put/sign/delete/list`; implementations prioritized Cloudflare R2 (zero egress) then AWS S3/Wasabi depending on what the business provisions. Public access via CDN URL configured per environment.
**Alternatives:** Storing blobs in DB (rejected), local disk (breaks serverless deploys).
**Consequences:** Media migration between providers is a scripted copy, not a code rewrite.

## ADR-014 — Package manager & runtime baseline
**Status:** Accepted
**Context:** Verified environment: Node v20.20.2, npm 10.8.2 installed; pnpm/yarn absent.
**Decision:** Use **npm** (present toolchain) with lockfile committed and `npm ci` in CI. Revisit pnpm if install performance becomes an issue. Node 20 LTS is the floor; align host runtime when deploying.
**Consequences:** Zero setup friction now; optional later switch is low-risk.

## ADR-015 — Do not fabricate business configuration
**Status:** Accepted (process rule)
**Context:** Catalogue, prices, VAT numbers, contacts, policies, domains are unknown; inventing them would corrupt seeds, tests, and possibly go live.
**Decision:** Unknown business facts become (a) typed-but-empty `Setting` keys, (b) seed rows flagged `isSample=true`, or (c) explicit "TBD — business input" markers in docs. Never silently hard-coded.
**Consequences:** Launch checklist must drain the TBD list (tracked in IMPLEMENTATION_STATUS.md).

---

### Decision log summary
| # | Topic | Verdict | Blocking info needed |
|---|---|---|---|
| ADR-001 | App shape | Next.js modular monolith | — |
| ADR-002 | Database | PostgreSQL (managed) | DB instance/URL |
| ADR-003 | ORM | Prisma stable 7.x | — |
| ADR-004 | Styling/RTL | Tailwind v4 logical utils | Brand tokens/colors |
| ADR-005 | i18n | next-intl `/[locale]` | — |
| ADR-006 | Payments | Provider abstraction; Stripe+COD first | Merchant accounts |
| ADR-007 | Slugs | Latin shared | — |
| ADR-008 | Auth | Auth.js credentials+roles | Email provider/domain |
| ADR-009 | Notifications | Outbox pattern | Email provider key |
| ADR-010 | CRM | Built-in | Confirm no incumbent CRM |
| ADR-011 | Money/tax | Minor units + price lists | Finance VAT confirmations |
| ADR-012 | Hosting | Vercel proposed | Owner choice |
| ADR-013 | Storage | R2/S3 adapter | Bucket credentials |
| ADR-014 | Tooling | npm + Node 20 | — |
| ADR-015 | Integrity rule | No invented values | Business inputs per plan §8 |
