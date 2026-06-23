import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadProjectScoped } from "@/lib/studio-server";
import { generateScript } from "@/lib/studio-ai";
import { isStudioAiConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  if (!isStudioAiConfigured) {
    return NextResponse.json(
      { error: "Studio AI isn't configured. Add STUDIO_AI_API_KEY." },
      { status: 503 },
    );
  }

  let projectId: unknown;
  let idea: unknown;
  try {
    ({ projectId, idea } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof projectId !== "string") {
    return NextResponse.json({ error: "Missing project." }, { status: 400 });
  }

  const { db, project } = await loadProjectScoped(projectId, userId, orgId);
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const ideaText =
    (typeof idea === "string" && idea.trim()) ||
    project.idea ||
    project.title;
  if (!ideaText) {
    return NextResponse.json(
      { error: "Add a one-line idea first." },
      { status: 422 },
    );
  }

  try {
    const draft = await generateScript(ideaText, project.channel);
    await db
      .from("studio_projects")
      .update({
        idea: ideaText,
        hook: draft.hook,
        titles: draft.titles,
        script: draft.script,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed." },
      { status: 502 },
    );
  }
}
