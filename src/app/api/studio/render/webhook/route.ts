import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySignature } from "@/lib/worker";
import { getJobById, setJobStatus, registerJobAsset } from "@/lib/render-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback from the render worker. Authenticated by an HMAC signature over the
 * raw body (shared secret) — there is no Clerk session here. The job's storage
 * path is taken from the DB, never from this payload, so a forged callback
 * cannot register an arbitrary object.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-worker-signature");
  if (!verifySignature(raw, signature))
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });

  let body: {
    jobId?: string;
    status?: string;
    sizeBytes?: number;
    error?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body." }, { status: 400 });
  }
  if (!body.jobId)
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });

  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });

  const job = await getJobById(db, body.jobId);
  if (!job) return NextResponse.json({ error: "Unknown job." }, { status: 404 });

  // Idempotent: once terminal, just acknowledge.
  if (job.status === "done" || job.status === "failed")
    return NextResponse.json({ ok: true, deduped: true });

  if (body.status === "done") {
    const assetId = await registerJobAsset(db, job, {
      name: "voiceover.mp3",
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
    });
    await setJobStatus(db, job.id, { status: "done", output_asset_id: assetId });
    return NextResponse.json({ ok: true });
  }

  if (body.status === "failed") {
    await setJobStatus(db, job.id, {
      status: "failed",
      error: (body.error ?? "Render failed.").slice(0, 500),
    });
    return NextResponse.json({ ok: true });
  }

  // Unknown / interim status (e.g. a future "processing") — acknowledge without
  // marking the job failed.
  return NextResponse.json({ ok: true, ignored: true });
}
