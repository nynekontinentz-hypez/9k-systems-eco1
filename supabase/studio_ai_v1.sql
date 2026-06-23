-- ============================================================================
-- 9K Systems — Studio AI key/model settings (v1)
-- Per-tenant AI provider config: supplied (Fast/Premium) vs BYOK, plus a
-- monthly usage counter for the supplied-key cap.
-- Idempotent: safe to run on an existing database (Supabase SQL editor).
--
-- SOURCE OF TRUTH: schema.sql is canonical and also contains everything below —
-- run schema.sql for a FRESH database. Run THIS file only to add AI settings to
-- an EXISTING database. Keep the two in sync if either changes.
-- BYOK keys are stored encrypted (AES-256-GCM) by the app; this table only ever
-- holds ciphertext + iv + tag + last4, never a plaintext key.
-- ============================================================================

create table if not exists public.studio_ai_settings (
  id              uuid primary key default gen_random_uuid(),
  clerk_org_id    text,
  created_by      text,
  mode            text not null default 'supplied',  -- supplied | byok
  model_tier      text not null default 'fast',      -- fast | premium (supplied)
  byok_provider   text,                              -- gemini|groq|openai|anthropic
  byok_model      text,
  byok_key_cipher text,
  byok_key_iv     text,
  byok_key_tag    text,
  byok_key_last4  text,
  updated_at      timestamptz not null default now()
);
-- One settings row per tenant: an org, or an org-less operator (by creator).
create unique index if not exists studio_ai_settings_org_idx
  on public.studio_ai_settings (clerk_org_id) where clerk_org_id is not null;
create unique index if not exists studio_ai_settings_user_idx
  on public.studio_ai_settings (created_by) where clerk_org_id is null;
alter table public.studio_ai_settings enable row level security;

create table if not exists public.studio_ai_usage (
  id           uuid primary key default gen_random_uuid(),
  clerk_org_id text,
  created_by   text,
  period       text not null,                 -- 'YYYY-MM'
  used         integer not null default 0,
  updated_at   timestamptz not null default now()
);
create unique index if not exists studio_ai_usage_org_period_idx
  on public.studio_ai_usage (clerk_org_id, period) where clerk_org_id is not null;
create unique index if not exists studio_ai_usage_user_period_idx
  on public.studio_ai_usage (created_by, period) where clerk_org_id is null;
alter table public.studio_ai_usage enable row level security;

-- Atomic per-tenant usage increment. Upsert on the (tenant, period) unique
-- index so concurrent generations can't drop counts or collide.
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
