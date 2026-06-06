# 9K Systems

The control plane for a one-person MSP. Two sides, one login:

- **Client side** — each SMB client is an isolated workspace (a Clerk Organization). Take payment up front with Stripe (one-time audits or monthly retainers), then hand off deliverables behind a login. Clients download only what they've paid for.
- **Studio side** — a faceless-video production board (idea → script → assets → render → published) so the YouTube work lives in the same place as the client work.

## Stack

| Layer | Choice | Why |
|------|--------|-----|
| Framework | Next.js 16 (App Router), React 19 | Server components + route handlers in one repo |
| Styling | Tailwind v4 | Dark control-plane theme, tokens in `globals.css` |
| Auth + tenancy | Clerk (Organizations) | One org per SMB client = clean multi-tenant isolation |
| Data + files | Supabase (Postgres + Storage) | Relational data + private bucket for gated downloads |
| Payments | Stripe Checkout + webhooks | Live revenue surface; entitlements granted on payment |
| Deploy | Vercel | Native Next.js |

## What's built

- Public landing (`/`) with pricing, an early-access purchase (`founding-access`, $99), and a waitlist capture.
- Auth at `/sign-in`, `/sign-up`; everything under `/app` is protected by middleware.
- Console: Overview, Clients (Clerk org management), Studio (pipeline board), Billing (buy + history), Downloads (entitlement-gated).
- API: `/api/checkout`, `/api/stripe/webhook`, `/api/waitlist`, `/api/download`, `/api/studio`.
- Schema in `supabase/schema.sql`.

All data access is server-side via the Supabase service-role key and scoped to the active Clerk org (or the operator's own org-less rows) — nothing leaks across tenants. The Stripe webhook is idempotent (event-level dedupe) and validates SKUs against the catalog before granting access.

## Setup (≈15 minutes)

1. **Install**
   ```bash
   npm install
   ```

2. **Environment** — copy and fill in:
   ```bash
   cp .env.example .env.local
   ```
   You need three accounts: Clerk (auth), Supabase (data/files), Stripe (payments). Each key's location is noted in `.env.example`.

3. **Clerk** — in the Clerk dashboard, enable **Organizations** (Configure → Organizations). This is what makes each client its own workspace.

4. **Supabase**
   - Run `supabase/schema.sql` in the SQL editor.
   - Create a **private** Storage bucket named `deliverables` (matches `SUPABASE_DELIVERABLES_BUCKET`).

5. **Stripe**
   - Add `STRIPE_SECRET_KEY`.
   - Local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`. In production, add the endpoint `https://YOUR_DOMAIN/api/stripe/webhook` in the Stripe dashboard and use that signing secret.

6. **Run**
   ```bash
   npm run dev
   ```
   `npm run typecheck` and `npm run build` validate the full project.

## Selling

Prices and products live in one file: `src/lib/catalog.ts`. Edit names, blurbs, and `priceCents` there. Checkout works immediately from inline `price_data`; for production, create Stripe Price objects and set `stripePriceId` on each product. A completed checkout grants an entitlement (`unlocks` SKU) that gates downloads and shows in Billing.

## Deploy (Vercel)

Push to GitHub (see below), import the repo in Vercel, paste the same env vars, and point your Stripe webhook at the deployed URL. Set `NEXT_PUBLIC_APP_URL` to the production domain.

## Repo note

A leftover empty repo from initial setup sits at `./9k-systems-eco1/` (just a stub README). It's gitignored and safe to delete from disk.
