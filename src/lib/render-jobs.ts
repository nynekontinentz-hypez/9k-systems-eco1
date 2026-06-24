import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";

/**
 * Server-only data layer for Studio render jobs. Tenant scoping mirrors the
 * rest of Studio: by active org, or (no org) by the org-less creator. The
 * webhook path looks a job up by id (it's authenticated by the worker secret)
 * and only ever writes to the storage path the job itself minted.
 */

export type RenderJobRow = {
  id: string;
  project_id: string;
  clerk_org_id: string | null;
  created_by: string | null;
  kind: string;
  status: "queued" | "processing" | "done" | "failed";
  provider: string | null;
  storage_path: string | null;
  output_asset_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

/** A job with no callback after this long is treated as dead. */
const STALE_MS = 8 * 60 * 1000;

export type Scope = { userId: string; orgId?: string | null };

function scoped<T>(q: T, s: Scope): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = q as any;
  return s.orgId
    ? query.eq("clerk_org_id", s.orgId)
    : query.eq("created_by", s.userId).is("clerk_org_id", null);
}

export async function createJob(
  db: SupabaseClient,
  s: Scope,
  input: { projectId: string; kind: string; provider: string; storagePath: string },
): Promise<RenderJobRow | null> {
  const { data } = await db
    .from("studio_render_jobs")
    .insert({
      project_id: input.projectId,
      clerk_org_id: s.orgId ?? null,
      created_by: s.userId,
      kind: input.kind,
      status: "queued",
      provider: input.provider,
      storage_path: input.storagePath,
    })
    .select("*")
    .single();
  return (data as RenderJobRow) ?? null;
}

/** Tenant-scoped job fetch for the status endpoint. Reaps dead jobs. */
export async function getJobScoped(
  s: Scope,
  jobId: string,
): Promise<RenderJobRow | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await scoped(
    db.from("studio_render_jobs").select("*").eq("id", jobId),
    s,
  ).maybeSingle();
  const job = (data as RenderJobRow) ?? null;
  if (!job) return null;

  // Reaper: if a non-terminal job hasn't been updated within the deadline, the
  // worker likely died before calling back — fail it so the UI/user isn't stuck.
  const nonTerminal = job.status === "queued" || job.status === "processing";
  const age = Date.now() - new Date(job.updated_at).getTime();
  if (nonTerminal && age > STALE_MS) {
    await setJobStatus(db, job.id, {
      status: "failed",
      error: "Render timed out — the worker didn't respond.",
    });
    job.status = "failed";
    job.error = "Render timed out — the worker didn't respond.";
  }
  return job;
}

/** Webhook-only: fetch by id (caller already verified the worker signature). */
export async function getJobById(
  db: SupabaseClient,
  jobId: string,
): Promise<RenderJobRow | null> {
  const { data } = await db
    .from("studio_render_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  return (data as RenderJobRow) ?? null;
}

export async function setJobStatus(
  db: SupabaseClient,
  jobId: string,
  patch: Partial<Pick<RenderJobRow, "status" | "error" | "output_asset_id">>,
): Promise<void> {
  await db
    .from("studio_render_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

/**
 * Register the worker's output as a studio_asset, using ONLY the path the job
 * minted (never a path supplied by the callback). Returns the new asset id.
 */
export async function registerJobAsset(
  db: SupabaseClient,
  job: RenderJobRow,
  meta: { name: string; sizeBytes: number | null },
): Promise<string | null> {
  if (!job.storage_path) return null;
  const assetKind = job.kind === "voiceover" ? "voiceover" : "final";
  const { data } = await db
    .from("studio_assets")
    .insert({
      project_id: job.project_id,
      clerk_org_id: job.clerk_org_id,
      created_by: job.created_by,
      kind: assetKind,
      name: meta.name,
      storage_path: job.storage_path,
      size_bytes: meta.sizeBytes,
    })
    .select("id")
    .single();
  return (data?.id as string) ?? null;
}
