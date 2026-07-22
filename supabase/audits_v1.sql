-- ============================================================================
-- 9K Systems — AI-Rescue Audit workspace (v1)
-- Operator-only: the audits the operator performs. Scoped by created_by (the
-- operator's Clerk user id), not by client org.
-- Idempotent: safe to run on an existing database (Supabase SQL editor).
--
-- SOURCE OF TRUTH: schema.sql is canonical and also contains this.
-- ============================================================================

create table if not exists public.audits (
  id           uuid primary key default gen_random_uuid(),
  created_by   text not null,               -- operator Clerk user id
  client_name  text not null,
  status       text not null default 'scheduled',  -- scheduled | in_progress | delivered
  purchase_ref text,                          -- optional Stripe/session/order note
  findings     jsonb not null default '[]'::jsonb, -- [{id,area,item,severity,note,resolved}]
  report       text,                          -- generated client-facing report (markdown)
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists audits_creator_idx on public.audits (created_by);
alter table public.audits enable row level security;
