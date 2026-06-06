-- ============================================================================
-- 9K Systems — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- Auth is handled by Clerk, not Supabase Auth. The app talks to these tables
-- ONLY from server code using the service-role key. We enable RLS with no
-- policies, which locks every table to the service role and blocks the anon /
-- authenticated keys entirely. Add policies later if you ever read with anon.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Landing-page waitlist -------------------------------------------------------
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  source      text,
  created_at  timestamptz not null default now()
);

-- Paid access, granted by the Stripe webhook ---------------------------------
create table if not exists public.entitlements (
  id             uuid primary key default gen_random_uuid(),
  clerk_user_id  text,
  clerk_org_id   text,
  sku            text not null,
  status         text not null default 'active',  -- active | revoked
  source         text default 'stripe',           -- stripe | manual
  stripe_ref     text,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists entitlements_user_idx on public.entitlements (clerk_user_id);
create index if not exists entitlements_org_idx  on public.entitlements (clerk_org_id);
create index if not exists entitlements_sku_idx  on public.entitlements (sku, status);

-- Payment ledger -------------------------------------------------------------
create table if not exists public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  clerk_user_id      text,
  clerk_org_id       text,
  sku                text,
  amount_cents       integer not null default 0,
  currency           text not null default 'usd',
  stripe_session_id  text unique,
  status             text not null default 'paid',
  created_at         timestamptz not null default now()
);
create index if not exists purchases_user_idx on public.purchases (clerk_user_id);
create index if not exists purchases_org_idx  on public.purchases (clerk_org_id);

-- Stripe webhook idempotency (one row per handled event) ---------------------
create table if not exists public.processed_events (
  id          text primary key,   -- Stripe event id (evt_...)
  type        text,
  created_at  timestamptz not null default now()
);

-- Client deliverables (files live in the private Storage bucket) -------------
create table if not exists public.assets (
  id            uuid primary key default gen_random_uuid(),
  clerk_org_id  text,                 -- null = visible to all clients
  name          text not null,
  description   text,
  required_sku  text,                 -- null = no entitlement needed
  storage_path  text not null,        -- path within the deliverables bucket
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);
create index if not exists assets_org_idx on public.assets (clerk_org_id);

-- Faceless-video pipeline ----------------------------------------------------
create table if not exists public.studio_projects (
  id            uuid primary key default gen_random_uuid(),
  clerk_org_id  text,
  created_by    text,
  title         text not null,
  channel       text,
  status        text not null default 'idea', -- idea|script|assets|render|published|archived
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists studio_org_idx    on public.studio_projects (clerk_org_id);
create index if not exists studio_status_idx on public.studio_projects (status);

-- Lock everything to the service role ----------------------------------------
alter table public.waitlist         enable row level security;
alter table public.processed_events enable row level security;
alter table public.entitlements     enable row level security;
alter table public.purchases       enable row level security;
alter table public.assets          enable row level security;
alter table public.studio_projects enable row level security;
