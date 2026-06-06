# 9K Systems — project guide

The control plane for a one-person MSP, plus a faceless-video studio, in one Next.js app. This file is the source of truth for how the codebase is built. (An earlier version of this file described a Vite/React design system — that was aspirational; the real app is Next.js. The brand/design language below still applies.)

## Stack (actual)

- **Next.js 16** App Router, **React 19**, **TypeScript** (strict)
- **Tailwind v4** — tokens live in `src/app/globals.css` under `@theme`; no `tailwind.config.js`
- **Clerk** (`@clerk/nextjs` v6) — auth + Organizations (one org per SMB client)
- **Supabase** (`@supabase/supabase-js` v2) — Postgres + Storage, accessed server-side only
- **Stripe** v17 — Checkout + webhooks

## Structure

```
src/
├── app/
│   ├── page.tsx                 # public landing (pricing, waitlist, early-access)
│   ├── sign-in / sign-up        # Clerk catch-all auth pages
│   ├── app/                     # protected console (middleware-gated)
│   │   ├── page.tsx             # overview
│   │   ├── clients/ billing/ downloads/ studio/
│   └── api/                     # checkout, stripe/webhook, waitlist, download, studio
├── components/{ui,layout,marketing,studio}/
├── lib/                         # env, supabase, stripe, entitlements, catalog, metrics, studio, utils
└── middleware.ts                # Clerk; protects /app(.*)
supabase/schema.sql              # run this in Supabase
```

## Non-negotiable conventions

- **Secrets are server-only.** Never import `lib/supabase`, `lib/stripe`, or service-role/secret env into a `"use client"` file. Client components talk to the server via `fetch` to `/api/*`.
- **Tenant scoping on every query.** Scope to the active Clerk `orgId`; when there's no org, scope to the operator's own `clerk_user_id` + `clerk_org_id is null`. Never run an unfiltered or `OR(user, org)` query that unions tenants.
- **Pages that touch auth/DB** set `export const dynamic = "force-dynamic"`.
- **`await auth()`** (Clerk v6 is async). `searchParams`/`params` are Promises — await them.
- **Catalog is the single source of pricing** (`src/lib/catalog.ts`). Entitlement SKU == product `unlocks`.
- **Stripe webhook stays idempotent** (dedupe on `processed_events.id`) and validates SKUs against the catalog before granting.

## Design language (dark control plane)

- Brand purple `#8251EE` (`bg-brand`, `text-brand-light`, `shadow-glow`). Hover `#9366F5`.
- Neutral surface scale `bg-neutral-bg1…bg6` (page → elevated). Text `text-text-primary/secondary/muted`. Borders `border-border-subtle/default/strong`.
- Status: `status-success/warning/error/info`. Glass: `glass`, `glass-card`, `glass-panel` utilities.
- Type: `text-2xl font-semibold` page titles, `text-sm text-text-secondary` body. Font stack leads with Segoe UI.
- Prose, not bullet-soup, in UI copy. Casual-professional, specific, no filler.

## Verify before shipping

`npm run typecheck && npm run build`. Per the operator's workflow, run code past the reviewer council (architecture / security / build) before final output.
