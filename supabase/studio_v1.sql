-- ============================================================================
-- 9K Systems — Studio v1 migration
-- Adds the AI script workspace fields + a production-assets table.
-- Idempotent: safe to run on an existing database (Supabase SQL editor).
--
-- SOURCE OF TRUTH: schema.sql is canonical and already contains everything
-- below — run schema.sql for a FRESH database. Run THIS file only to bring an
-- EXISTING (pre-Studio) database up to v1. Keep the two in sync if either
-- changes; the studio_projects/studio_assets shapes must match exactly.
-- ============================================================================

-- Script workspace fields on each project ------------------------------------
alter table public.studio_projects
  add column if not exists idea   text,
  add column if not exists hook   text,
  add column if not exists titles jsonb,
  add column if not exists script text,
  add column if not exists updated_at timestamptz not null default now();

-- Production assets attached to a project (files live in Storage) ------------
create table if not exists public.studio_assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.studio_projects(id) on delete cascade,
  clerk_org_id  text,
  created_by    text,
  kind          text not null default 'other',  -- voiceover|thumbnail|broll|final|other
  name          text not null,
  storage_path  text not null,                  -- path within the deliverables bucket
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);
create index if not exists studio_assets_project_idx on public.studio_assets (project_id);
create index if not exists studio_assets_org_idx     on public.studio_assets (clerk_org_id);

-- Service-role only (same posture as the rest of the schema).
alter table public.studio_assets enable row level security;
