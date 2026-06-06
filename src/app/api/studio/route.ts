import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isStudioStage } from "@/lib/studio";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let title: unknown;
  let channel: unknown;
  try {
    ({ title, channel } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length < 2) {
    return NextResponse.json({ error: "Give it a title." }, { status: 422 });
  }

  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "Studio storage not configured." }, { status: 503 });

  const { data, error } = await db
    .from("studio_projects")
    .insert({
      title: title.trim(),
      channel: typeof channel === "string" ? channel.trim() || null : null,
      status: "idea",
      clerk_org_id: orgId ?? null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: "Could not create." }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let id: unknown;
  let status: unknown;
  try {
    ({ id, status } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof id !== "string" || !isStudioStage(status)) {
    return NextResponse.json({ error: "Bad input." }, { status: 422 });
  }

  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "Studio storage not configured." }, { status: 503 });

  // Scope the update so clients can't move each other's work. Org rows are
  // bound to the active org; org-less rows are bound to their creator.
  const query = db.from("studio_projects").update({ status }).eq("id", id);
  const { error } = orgId
    ? await query.eq("clerk_org_id", orgId)
    : await query.eq("created_by", userId).is("clerk_org_id", null);

  if (error)
    return NextResponse.json({ error: "Could not update." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
