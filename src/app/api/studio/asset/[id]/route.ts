import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { loadProjectScoped, STUDIO_BUCKET } from "@/lib/studio-server";
import { env } from "@/lib/env";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });

  const { data: asset } = await db
    .from("studio_assets")
    .select("id, project_id, storage_path")
    .eq("id", id)
    .single();
  if (!asset)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Authorize through the parent project's tenant scope. Return 404 (not 403)
  // when the asset isn't the caller's, so foreign asset ids can't be enumerated.
  const { project } = await loadProjectScoped(asset.project_id, userId, orgId);
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: signed, error } = await db.storage
    .from(STUDIO_BUCKET)
    .createSignedUrl(asset.storage_path, 60, { download: true });
  if (error || !signed?.signedUrl)
    return NextResponse.json({ error: "Could not link." }, { status: 500 });

  const url = signed.signedUrl.startsWith("http")
    ? signed.signedUrl
    : `${env.supabaseUrl}${signed.signedUrl}`;
  return NextResponse.redirect(url, 302);
}
