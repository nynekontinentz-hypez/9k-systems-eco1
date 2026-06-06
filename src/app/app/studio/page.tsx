import { auth } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/layout/page-header";
import { SetupHint } from "@/components/setup-hint";
import { StudioBoard, type StudioProject } from "@/components/studio/studio-board";
import { supabaseAdmin } from "@/lib/supabase";
import { isStudioStage } from "@/lib/studio";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { orgId, userId } = await auth();
  const db = supabaseAdmin();

  let projects: StudioProject[] = [];
  if (db && (orgId || userId)) {
    // Active org -> that org's board. No org -> the operator's own org-less
    // projects only (scoped by creator), never a shared global pool.
    let query = db
      .from("studio_projects")
      .select("id, title, channel, status");
    query = orgId
      ? query.eq("clerk_org_id", orgId)
      : query.eq("created_by", userId).is("clerk_org_id", null);
    const { data } = await query.order("created_at", { ascending: false });
    projects = ((data ?? []) as StudioProject[]).filter((p) =>
      isStudioStage(p.status),
    );
  }

  return (
    <>
      <PageHeader
        title="Studio"
        description="Your faceless-video pipeline. Every idea moves left to right until it's live."
      />

      {!db && (
        <SetupHint title="Connect Supabase to persist the pipeline">
          Add your Supabase keys and run <code>supabase/schema.sql</code>. The
          board works the moment the <code>studio_projects</code> table exists.
        </SetupHint>
      )}

      <StudioBoard initial={projects} />
    </>
  );
}
