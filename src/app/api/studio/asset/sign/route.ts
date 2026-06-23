import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadProjectScoped, STUDIO_BUCKET } from "@/lib/studio-server";

const KINDS = ["voiceover", "thumbnail", "broll", "final", "other"];

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let projectId: unknown;
  let filename: unknown;
  let kind: unknown;
  try {
    ({ projectId, filename, kind } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof projectId !== "string" || typeof filename !== "string") {
    return NextResponse.json({ error: "Bad input." }, { status: 400 });
  }
  if (typeof kind !== "string" || !KINDS.includes(kind)) kind = "other";

  const { db, project } = await loadProjectScoped(projectId, userId, orgId);
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
  const path = `studio/${project.id}/${crypto.randomUUID()}-${safe}`;

  const { data, error } = await db.storage
    .from(STUDIO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not start upload." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    path: data.path,
    token: data.token,
    bucket: STUDIO_BUCKET,
    kind,
  });
}
