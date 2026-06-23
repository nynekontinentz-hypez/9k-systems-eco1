import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadProjectScoped } from "@/lib/studio-server";

export async function PATCH(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "Missing project." }, { status: 400 });
  }

  const { db, project } = await loadProjectScoped(id, userId, orgId);
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Whitelist editable fields; ignore anything else.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["idea", "hook", "script", "title", "channel"] as const) {
    if (typeof body[key] === "string") update[key] = body[key];
  }
  if (Array.isArray(body.titles)) {
    update.titles = (body.titles as unknown[])
      .filter((t): t is string => typeof t === "string")
      .slice(0, 6);
  }

  const { error } = await db
    .from("studio_projects")
    .update(update)
    .eq("id", project.id);
  if (error)
    return NextResponse.json({ error: "Could not save." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
