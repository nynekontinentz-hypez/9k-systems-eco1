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
  idea          text,
  hook          text,
  titles        jsonb,
  script        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists studio_org_idx    on public.studio_projects (clerk_org_id);
create index if not exists studio_status_idx on public.studio_projects (status);

-- Studio production assets (files live in the deliverables bucket) ------------
create table if not exists public.studio_assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.studio_projects(id) on delete cascade,
  clerk_org_id  text,
  created_by    text,
  kind          text not null default 'other',  -- voiceover|thumbnail|broll|final|other
  name          text not null,
  storage_path  text not null,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);
create index if not exists studio_assets_project_idx on public.studio_assets (project_id);
create index if not exists studio_assets_org_idx     on public.studio_assets (clerk_org_id);

-- Studio AI per-tenant key/model settings (BYOK keys stored encrypted) --------
create table if not exists public.studio_ai_settings (
  id              uuid primary key default gen_random_uuid(),
  clerk_org_id    text,
  created_by      text,
  mode            text not null default 'supplied',  -- supplied | byok
  model_tier      text not null default 'fast',      -- fast | premium
  byok_provider   text,
  byok_model      text,
  byok_key_cipher text,
  byok_key_iv     text,
  byok_key_tag    text,
  byok_key_last4  text,
  updated_at      timestamptz not null default now()
);
create unique index if not exists studio_ai_settings_org_idx
  on public.studio_ai_settings (clerk_org_id) where clerk_org_id is not null;
create unique index if not exists studio_ai_settings_user_idx
  on public.studio_ai_settings (created_by) where clerk_org_id is null;

create table if not exists public.studio_ai_usage (
  id           uuid primary key default gen_random_uuid(),
  clerk_org_id text,
  created_by   text,
  period       text not null,
  used         integer not null default 0,
  updated_at   timestamptz not null default now()
);
create unique index if not exists studio_ai_usage_org_period_idx
  on public.studio_ai_usage (clerk_org_id, period) where clerk_org_id is not null;
create unique index if not exists studio_ai_usage_user_period_idx
  on public.studio_ai_usage (created_by, period) where clerk_org_id is null;

-- Atomic per-tenant usage increment (upsert on the unique index).
create or replace function public.studio_ai_usage_increment(
  p_org text, p_user text, p_period text
) returns integer language plpgsql as $$
declare v_used integer;
begin
  if p_org is not null then
    insert into public.studio_ai_usage (clerk_org_id, created_by, period, used)
    values (p_org, p_user, p_period, 1)
    on conflict (clerk_org_id, period) where clerk_org_id is not null
    do update set used = studio_ai_usage.used + 1, updated_at = now()
    returning used into v_used;
  else
    insert into public.studio_ai_usage (clerk_org_id, created_by, period, used)
    values (null, p_user, p_period, 1)
    on conflict (created_by, period) where clerk_org_id is null
    do update set used = studio_ai_usage.used + 1, updated_at = now()
    returning used into v_used;
  end if;
  return v_used;
end;
$$;

-- Lock everything to the service role ----------------------------------------
alter table public.waitlist         enable row level security;
alter table public.processed_events enable row level security;
alter table public.entitlements     enable row level security;
alter table public.purchases       enable row level security;
alter table public.assets          enable row level security;
alter table public.studio_projects enable row level security;
alter table public.studio_assets   enable row level security;
alter table public.studio_ai_settings enable row level security;
alter table public.studio_ai_usage    enable row level security;
