# Golf Cart Store

Bilingual (English / Arabic, RTL) e-commerce platform for golf carts serving GCC
and international markets. Built with **Next.js 16 (App Router) + TypeScript**,
**Tailwind CSS v4**, **PostgreSQL + Prisma 7**, and **next-intl**.

> Status: **Phase 01 — foundation scaffold complete.** See
> [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for the phase
> tracker and outstanding configuration/business items. Architecture decisions
> live in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Quick start

```bash
npm ci
cp .env.example .env      # fill values as they become available (CFG register)
npm run dev               # http://localhost:3000 → redirects to /en or /ar
```

Routes: `/en` (LTR), `/ar` (RTL), `/api/health` (JSON probe).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm run lint` / `typecheck` | ESLint 9 flat config · `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier |
| `npm run prisma:generate` / `prisma:validate` | Client generation & schema checks (no DB needed) |
| `npm run prisma:migrate` / `prisma:deploy` | Requires `DATABASE_URL` (CFG-01) |

## Project layout

```
docs/                  project plan, architecture, data model, ADRs, status
messages/              next-intl catalogues (en.json, ar.json)
prisma/                schema (bootstrap), migrations, seed placeholder
src/app/[locale]/      locale-scoped pages & layout (dir/lang set per locale)
src/app/api/           route handlers (health now; payments/webhooks later)
src/components/        shared UI (LocaleSwitcher …)
src/core/<module>/     framework-free domain services (from Phase 03)
src/i18n/              locale config, typed routing, request config
src/lib/               env validation, adapters
src/proxy.ts           next-intl locale negotiation (Next 16 proxy convention)
```

## Conventions (enforced from Phase 02 onward)

- All user-facing copy goes through next-intl message keys — no hardcoded strings.
- Styling uses Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`,
  `start-*`, `end-*`, `text-start`, `text-end`) so layouts mirror correctly in RTL.
- Money is stored as integer minor units with an explicit currency code; never floats.
- Every external input passes through a Zod schema before touching domain services.
