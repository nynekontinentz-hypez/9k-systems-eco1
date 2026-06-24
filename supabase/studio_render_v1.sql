-- ============================================================================
-- 9K Systems — Studio render jobs (v1)
-- Async voiceover/video render jobs handled by the external worker service.
-- Idempotent: safe to run on an existing database (Supabase SQL editor).
--
-- SOURCE OF TRUTH: schema.sql is canonical and also contains this — run
-- schema.sql for a FRESH database; run THIS file to add render jobs to an
-- EXISTING database.
-- ============================================================================

create table if not exists public.studio_render_jobs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.studio_projects(id) on delete cascade,
  clerk_org_id    text,
  created_by      text,
  kind            text not null default 'voiceover',  -- voiceover | video
  status          text not null default 'queued',     -- queued | processing | done | failed
  provider        text,                               -- e.g. 'kokoro'
  storage_path    text,                               -- the ONLY path the worker may write to
  output_asset_id uuid references public.studio_assets(id) on delete set null,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists studio_render_jobs_project_idx on public.studio_render_jobs (project_id);
create index if not exists studio_render_jobs_org_idx     on public.studio_render_jobs (clerk_org_id);
create index if not exists studio_render_jobs_creator_idx on public.studio_render_jobs (created_by);
alter table public.studio_render_jobs enable row level security;
