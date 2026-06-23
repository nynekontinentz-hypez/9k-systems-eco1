import { supabaseAdmin } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Server-only Studio helpers (DB access + tenant scoping). Never import in a client file. */

export const STUDIO_BUCKET =
  process.env.SUPABASE_DELIVERABLES_BUCKET ?? "deliverables";

export type StudioProjectRow = {
  id: string;
  clerk_org_id: string | null;
  created_by: string | null;
  title: string;
  channel: string | null;
  status: string;
  idea: string | null;
  hook: string | null;
  titles: string[] | null;
  script: string | null;
};

/**
 * Load a project only if the caller is allowed to see it: the active org owns
 * it, or (no active org) the caller created it and it's org-less. Returns the
 * admin client too so callers can reuse it.
 */
export async function loadProjectScoped(
  id: string,
  userId: string,
  orgId?: string | null,
): Promise<{ db: SupabaseClient | null; project: StudioProjectRow | null }> {
  const db = supabaseAdmin();
  if (!db) return { db: null, project: null };

  const { data } = await db
    .from("studio_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return { db, project: null };

  const allowed = orgId
    ? data.clerk_org_id === orgId
    : data.created_by === userId && !data.clerk_org_id;

  return { db, project: allowed ? (data as StudioProjectRow) : null };
}
