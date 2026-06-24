import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadProjectScoped, STUDIO_BUCKET } from "@/lib/studio-server";
import { createJob, getJobScoped } from "@/lib/render-jobs";
import { dispatchJob } from "@/lib/worker";
import { env, isWorkerConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kokoro default voice. Kept server-side; the worker validates against its set.
const DEFAULT_VOICE = "af_heart";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  if (!isWorkerConfigured)
    return NextResponse.json(
      { error: "The render worker isn't configured yet." },
      { status: 503 },
    );

  let projectId: unknown;
  let voice: unknown;
  try {
    ({ projectId, voice } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof projectId !== "string")
    return NextResponse.json({ error: "Missing project." }, { status: 400 });

  const { db, project } = await loadProjectScoped(projectId, userId, orgId);
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (!project)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const text = (project.script ?? "").trim();
  if (text.length < 20)
    return NextResponse.json(
      { error: "Write or generate a script first." },
      { status: 422 },
    );
  // Upper bound: keep one render to a sane CPU/time budget on the worker.
  if (text.length > 12000)
    return NextResponse.json(
      { error: "Script is too long to narrate in one pass (max ~12,000 characters)." },
      { status: 422 },
    );

  // Mint a single-use signed upload URL scoped to one path. The worker can only
  // write here, and the webhook will only register THIS path.
  const path = `studio/${project.id}/${crypto.randomUUID()}-voiceover.mp3`;
  const { data: signed, error: signErr } = await db.storage
    .from(STUDIO_BUCKET)
    .createSignedUploadUrl(path);
  if (signErr || !signed)
    return NextResponse.json({ error: "Could not start render." }, { status: 500 });

  const job = await createJob(
    db,
    { userId, orgId },
    { projectId: project.id, kind: "voiceover", provider: "kokoro", storagePath: path },
  );
  if (!job)
    return NextResponse.json({ error: "Could not create job." }, { status: 500 });

  try {
    await dispatchJob({
      jobId: job.id,
      kind: "voiceover",
      text,
      voice: typeof voice === "string" && voice ? voice : DEFAULT_VOICE,
      supabaseUrl: env.supabaseUrl,
      bucket: STUDIO_BUCKET,
      uploadPath: signed.path,
      uploadToken: signed.token,
      callbackUrl: `${env.appUrl}/api/studio/render/webhook`,
    });
  } catch (e) {
    await db
      .from("studio_render_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Dispatch failed.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return NextResponse.json(
      { error: "Couldn't reach the render worker." },
      { status: 502 },
    );
  }

  return NextResponse.json({ jobId: job.id, status: "queued" });
}

export async function GET(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId)
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });

  const job = await getJobScoped({ userId, orgId }, jobId);
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    error: job.error,
    assetId: job.output_asset_id,
  });
}
