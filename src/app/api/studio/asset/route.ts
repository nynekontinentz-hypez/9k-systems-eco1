import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadProjectScoped } from "@/lib/studio-server";

const KINDS = ["voiceover", "thumbnail", "broll", "final", "other"];

// Register an uploaded asset.
export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { projectId, kind, name, path, size } = body;
  if (
    typeof projectId !== "string" ||
    typeof name !== "string" ||
    typeof path !== "string"
  ) {
    return NextResponse.json({ error: "Bad input." }, { status: 400 });
  }

  const { db, project } = await loadProjectScoped(projectId, userId, orgId);
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Path must belong to this project — never trust an arbitrary storage path.
  if (!path.startsWith(`studio/${project.id}/`)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const { data, error } = await db
    .from("studio_assets")
    .insert({
      project_id: project.id,
      clerk_org_id: project.clerk_org_id,
      created_by: userId,
      kind: typeof kind === "string" && KINDS.includes(kind) ? kind : "other",
      name: name.slice(0, 200),
      storage_path: path,
      size_bytes: typeof size === "number" ? size : null,
    })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

// List assets for a project.
export async function GET(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId)
    return NextResponse.json({ error: "Missing project." }, { status: 400 });

  const { db, project } = await loadProjectScoped(projectId, userId, orgId);
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data } = await db
    .from("studio_assets")
    .select("id, kind, name, size_bytes, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ assets: data ?? [] });
}
