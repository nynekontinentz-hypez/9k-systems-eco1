import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadProjectScoped } from "@/lib/studio-server";
import { generateScript } from "@/lib/studio-ai";
import {
  resolveAiConfig,
  recordUsage,
  AiResolveError,
} from "@/lib/studio-ai-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

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

  // Resolve which AI config to use (supplied tier vs BYOK), enforcing the
  // entitlement gate and monthly cap before we spend anything.
  let resolved;
  try {
    resolved = await resolveAiConfig({ userId, orgId });
  } catch (e) {
    if (e instanceof AiResolveError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    return NextResponse.json({ error: "AI not available." }, { status: 503 });
  }

  try {
    const draft = await generateScript(resolved.config, ideaText, project.channel);
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
    // Only count successful supplied-key generations against the cap.
    if (resolved.metered) await recordUsage({ userId, orgId }, resolved.period);
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed." },
      { status: 502 },
    );
  }
}
