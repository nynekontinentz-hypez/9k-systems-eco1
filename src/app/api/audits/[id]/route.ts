import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isOperator } from "@/lib/env";
import { getAudit, updateAudit, type AuditPatch } from "@/lib/audits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  if (!isOperator(userId))
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  const { id } = await params;
  const audit = await getAudit(userId, id);
  if (!audit) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ audit });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  if (!isOperator(userId))
    return NextResponse.json({ error: "Not available." }, { status: 403 });

  const { id } = await params;
  let patch: AuditPatch;
  try {
    patch = (await req.json()) as AuditPatch;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const audit = await updateAudit(userId, id, patch);
  if (!audit) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ audit });
}
